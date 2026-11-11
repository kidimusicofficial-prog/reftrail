#!/usr/bin/env node
// Check a coverage catalog and calculate the figures the brief asks to report together.
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const usage = [
  'node tools/catalog.mjs check <catalog.csv>',
  'node tools/catalog.mjs report <catalog.csv> [--gates ID,ID] [--exclude ID,ID] [--milestone NAME] [--strict]',
  '  --gates      mandatory checks; each must be at implementation 2 with an evidence type and evidence path',
  '  --exclude    entries that do not apply to the agreed scope (give the reason in the catalog)',
  '  --milestone  count only entries of this milestone',
  '  --strict     needs --gates; exit with an error when a named mandatory check has not passed',
  '               or an entry is claimed complete without evidence',
].join('\n');

// The headers match templates/COVERAGE.csv and templates/ABDECKUNG.csv; a test keeps them equal.
export const layouts = {
  en: {
    header: ['ID', 'Dimension', 'Module', 'Feature or workflow', 'Source', 'Weight', 'Acceptance criterion',
      'Milestone', 'Implementation', 'Evidence type', 'Evidence path or report section', 'Evidence limits',
      'Deviation', 'Change note'],
    evidence: { none: 'none', internal: 'internal', external: 'externally supported' },
  },
  de: {
    header: ['ID', 'Dimension', 'Modul', 'Funktion oder Ablauf', 'Quelle', 'Gewicht', 'Abnahmekriterium',
      'Etappe', 'Umsetzung', 'Nachweisart', 'Nachweispfad oder Berichtabschnitt', 'Nachweisgrenze',
      'Abweichung', 'Änderungsvermerk'],
    evidence: { none: 'keiner', internal: 'eigen', external: 'extern gestützt' },
  },
};
const COLUMN = { id: 0, dimension: 1, source: 4, weight: 5, criterion: 6, milestone: 7, implementation: 8,
  evidenceType: 9, evidencePath: 10 };

// Semicolon-delimited records with optional double quotes. A quoted field may contain
// semicolons, doubled quotes and line breaks, as spreadsheet programs write them.
export function splitRecords(text) {
  const records = [];
  let fields = [], field = '', quoted = false, line = 1, recordLine = 1;
  const endRecord = () => {
    fields.push(field);
    if (fields.length > 1 || fields[0] !== '') records.push({ line: recordLine, fields });
    fields = []; field = '';
    recordLine = line;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ';') {
      fields.push(field); field = '';
    } else if (c === '\n') {
      endRecord();
    } else if (c === '\r' && text[i + 1] === '\n') {
      i++; line++;
      endRecord();
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error('Unterminated quoted field in the record starting at line ' + recordLine);
  if (field !== '' || fields.length) endRecord();
  return records;
}

export function parseCatalog(bytes) {
  const errors = [], warnings = [];
  if (!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
    errors.push('Missing UTF-8 byte order mark at the start of the file');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return { errors: ['File is not valid UTF-8'], warnings, language: null, entries: [] };
  }
  let records;
  try {
    records = splitRecords(text);
  } catch (error) {
    return { errors: [...errors, error.message], warnings, language: null, entries: [] };
  }
  const head = records.shift();
  const language = Object.keys(layouts).find(key =>
    head && head.fields.length === layouts[key].header.length &&
    layouts[key].header.every((name, index) => name === head.fields[index]));
  if (!language) {
    return { errors: [...errors, 'Header differs from templates/COVERAGE.csv and templates/ABDECKUNG.csv'],
      warnings, language: null, entries: [] };
  }
  const { header, evidence } = layouts[language];
  const kinds = new Map(Object.entries(evidence).map(([kind, label]) => [label, kind]));
  const seen = new Set();
  const entries = [];
  for (const { line, fields } of records) {
    const id = (fields[COLUMN.id] ?? '').trim();
    const at = 'Line ' + line + (id ? ' (' + id + ')' : '') + ': ';
    if (fields.length !== header.length) {
      errors.push(at + fields.length + ' fields instead of ' + header.length +
        '; put text that contains a semicolon in double quotes');
      continue;
    }
    const value = name => fields[COLUMN[name]].trim();
    const before = errors.length;
    if (!id) errors.push(at + 'missing ID');
    else if (/[\s,]/.test(id)) errors.push(at + 'ID must not contain spaces or commas');
    else if (seen.has(id.toLowerCase())) errors.push(at + 'ID is used more than once (upper and lower case count as equal)');
    seen.add(id.toLowerCase());
    if (!/^[FARDB]$/.test(value('dimension'))) errors.push(at + header[COLUMN.dimension] + ' must be F, A, R, D or B');
    if (!/^[0-3]$/.test(value('weight'))) errors.push(at + header[COLUMN.weight] + ' must be 0, 1, 2 or 3');
    if (!/^[0-2]$/.test(value('implementation'))) errors.push(at + header[COLUMN.implementation] + ' must be 0, 1 or 2');
    if (!value('criterion')) errors.push(at + 'missing ' + header[COLUMN.criterion]);
    const kind = kinds.get(value('evidenceType'));
    if (!kind) errors.push(at + header[COLUMN.evidenceType] + ' must be ' + [...kinds.keys()].join(', '));
    if (errors.length > before) continue;
    const entry = {
      id, line, dimension: value('dimension'), weight: Number(value('weight')),
      implementation: Number(value('implementation')), milestone: value('milestone'), evidence: kind,
      evidencePath: value('evidencePath'),
    };
    // Evidence counts only with both parts: a type other than "none" and a reference to the check.
    entry.evidenced = kind !== 'none' && entry.evidencePath !== '';
    if (kind !== 'none' && entry.evidencePath === '') {
      warnings.push(at + 'evidence type without an evidence path; the entry counts as having no evidence');
    } else if (kind === 'none' && entry.evidencePath !== '') {
      warnings.push(at + 'evidence path without an evidence type; the entry counts as having no evidence');
    } else if (entry.implementation === 2 && !entry.evidenced) {
      warnings.push(at + 'implementation 2 is claimed without evidence');
    }
    if (!value('source')) warnings.push(at + 'no source recorded');
    entries.push(entry);
  }
  return { errors, warnings, language, entries };
}

// One decimal place. A rounded value never reads 100 while something is missing, and never
// reads 0 while something was achieved.
function percent(part, total) {
  if (!total) return null;
  let tenths = Math.round(1000 * part / total);
  if (tenths === 1000 && part < total) tenths = 999;
  if (tenths === 0 && part > 0) tenths = 1;
  return tenths / 10;
}
const number = (value, language) => language === 'de' ? String(value).replace('.', ',') + ' %' : value + '%';
const repeated = list => [...new Set(list.filter((id, index) => list.indexOf(id) !== index))];

export function reportCatalog(bytes, { gates = [], exclude = [], milestone = null } = {}) {
  const parsed = parseCatalog(bytes);
  if (parsed.errors.length) return { status: 'INVALID', errors: parsed.errors, warnings: parsed.warnings };
  const { language, warnings } = parsed;
  const known = new Set(parsed.entries.map(entry => entry.id));
  const errors = [];
  for (const id of repeated(gates)) errors.push('Mandatory check is named more than once: ' + id);
  for (const id of repeated(exclude)) errors.push('Excluded entry is named more than once: ' + id);
  for (const id of new Set([...gates, ...exclude])) if (!known.has(id)) errors.push('Unknown ID: ' + id);
  for (const id of new Set(gates)) if (exclude.includes(id)) errors.push('A mandatory check cannot be excluded: ' + id);
  if (milestone !== null && !parsed.entries.some(entry => entry.milestone === milestone)) {
    errors.push('No entry has the milestone: ' + milestone);
  }
  const entries = parsed.entries.filter(entry =>
    !exclude.includes(entry.id) && (milestone === null || entry.milestone === milestone));
  for (const id of new Set(gates)) {
    if (known.has(id) && !exclude.includes(id) && !entries.some(entry => entry.id === id)) {
      errors.push('Mandatory check is outside the selected milestone: ' + id);
    }
  }
  if (errors.length) return { status: 'INVALID', errors, warnings };

  const points = entry => entry.weight * entry.implementation / 2;
  const sum = (list, value) => list.reduce((total, entry) => total + value(entry), 0);
  const totalWeight = sum(entries, entry => entry.weight);
  const weightedPoints = sum(entries, points);
  // Externally supported means: that evidence type together with a reference to the check.
  const externalPoints = sum(entries.filter(entry => entry.evidence === 'external' && entry.evidenced), points);
  const coverage = percent(weightedPoints, totalWeight);
  const external = percent(externalPoints, totalWeight);
  const unproven = entries.filter(entry => entry.implementation === 2 && !entry.evidenced).map(entry => entry.id);
  // Each named ID is unique and selected here, so the two counts below describe the same list.
  const gateEntries = entries.filter(entry => gates.includes(entry.id));
  const passed = gateEntries.filter(entry => entry.implementation === 2 && entry.evidenced);
  const failed = gateEntries.filter(entry => !passed.includes(entry)).map(entry => entry.id);
  const blocked = passed.length !== gates.length;

  const de = language === 'de';
  const parts = [coverage === null
    ? (de ? 'Fachabdeckung nicht bewertbar' : 'functional coverage cannot be assessed')
    : number(coverage, language) + (de ? ' Fachabdeckung' : ' functional coverage')];
  // A figure for a part of the catalog says so in the same line.
  if (milestone !== null) parts.push((de ? 'nur Etappe ' : 'only milestone ') + milestone);
  if (exclude.length) {
    parts.push(exclude.length + (de
      ? (exclude.length === 1 ? ' Eintrag' : ' Einträge') + ' ausgenommen'
      : (exclude.length === 1 ? ' entry' : ' entries') + ' excluded'));
  }
  if (gates.length) {
    parts.push(passed.length + '/' + gates.length + (de ? ' Pflichtprüfungen bestanden' : ' mandatory checks passed'));
    if (blocked) parts.push(de ? 'Freigabe blockiert' : 'release blocked');
  } else {
    parts.push(de ? 'Pflichtprüfungen nicht benannt (--gates)' : 'mandatory checks not named (--gates)');
  }
  if (unproven.length) {
    parts.push(unproven.length + (de
      ? (unproven.length === 1 ? ' Eintrag' : ' Einträge') + ' ohne Nachweis als erfüllt gemeldet'
      : (unproven.length === 1 ? ' entry' : ' entries') + ' claimed complete without evidence'));
  }
  return {
    status: 'REPORT',
    language,
    entries: entries.length,
    totalWeight,
    weightedPoints,
    weightedCoveragePercent: coverage,
    externallySupportedPoints: externalPoints,
    externallySupportedSharePercent: external,
    byImplementation: Object.fromEntries([0, 1, 2].map(level =>
      [level, entries.filter(entry => entry.implementation === level).length])),
    open: entries.filter(entry => entry.implementation < 2).map(entry => entry.id),
    completeWithoutEvidence: unproven,
    weightZero: entries.filter(entry => entry.weight === 0).map(entry => entry.id),
    excluded: exclude,
    milestone,
    mandatoryChecks: gates.length
      ? { named: gates.length, passed: passed.length, notPassed: failed, blocked }
      : null,
    warnings,
    summary: parts.join(', '),
    note: 'Report these figures together with the delivery scope, catalog revision, open critical defects and the acceptance decision.',
  };
}

function options(args) {
  const result = { gates: [], exclude: [], milestone: null, strict: false };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--strict') { result.strict = true; continue; }
    const value = args[++i];
    if (!['--gates', '--exclude', '--milestone'].includes(flag) || value === undefined || value.startsWith('--')) {
      throw new Error(usage);
    }
    if (flag === '--milestone') {
      if (result.milestone !== null) throw new Error('Give --milestone once.\n' + usage);
      result.milestone = value;
    } else {
      const ids = value.split(',').map(id => id.trim()).filter(Boolean);
      if (!ids.length) throw new Error(flag + ' needs at least one ID.\n' + usage);
      result[flag.slice(2)].push(...ids);
    }
  }
  // Without named mandatory checks a strict run would have nothing to fail on and would pass by default.
  if (result.strict && !result.gates.length) throw new Error('--strict needs --gates with the mandatory checks.\n' + usage);
  return result;
}

// Returns the text to print and whether the run counts as a failure.
export async function main([command, file, ...rest]) {
  if (command === '--help' && file === undefined) return { output: usage, failed: false };
  if (command === 'check' && file !== undefined && rest.length === 0) {
    const { errors, warnings, language, entries } = parseCatalog(await readFile(file));
    const status = errors.length ? 'INVALID' : 'CATALOG_VALID';
    return { output: JSON.stringify({ status, language, entries: entries.length, errors, warnings }, null, 2),
      failed: errors.length > 0 };
  }
  if (command === 'report' && file !== undefined) {
    const { strict, ...selection } = options(rest);
    const report = reportCatalog(await readFile(file), selection);
    const failed = report.status === 'INVALID' ||
      (strict && (report.mandatoryChecks.blocked || report.completeWithoutEvidence.length > 0));
    return { output: JSON.stringify(report, null, 2), failed };
  }
  throw new Error(usage);
}

// True when this file is the started script. npm links commands, and a project folder can be
// reached through a link, so both paths are resolved before they are compared.
function startedDirectly() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedDirectly()) {
  try {
    const { output, failed } = await main(process.argv.slice(2));
    console.log(output);
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
