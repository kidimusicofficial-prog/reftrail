// The catalog tool must calculate the two figures exactly as the brief defines them and must
// not let a high percentage hide a failed mandatory check.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { layouts, parseCatalog, reportCatalog, splitRecords } from '../tools/catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const BOM = '﻿';
const catalog = (language, rows, eol = '\n') =>
  Buffer.from(BOM + [layouts[language].header.join(';'), ...rows].join(eol) + eol);
// ID, weight, implementation, evidence type; the other columns carry fixed sample text.
const row = (id, weight, implementation, evidence, milestone = 'M1') =>
  [id, 'F', 'Module', 'Feature', 'Q1: manual', weight, 'Criterion', milestone, implementation, evidence,
    evidence === 'keiner' || evidence === 'none' ? '' : 'REPORT.md', '', '', ''].join(';');

test('tool headers equal the two templates', async () => {
  for (const [language, file] of [['en', 'templates/COVERAGE.csv'], ['de', 'templates/ABDECKUNG.csv']]) {
    const bytes = await readFile(path.join(root, file));
    const parsed = parseCatalog(bytes);
    assert.deepEqual(parsed, { errors: [], warnings: [], language, entries: [] }, file);
    assert.equal(bytes.toString('utf8'), BOM + layouts[language].header.join(';') + '\n', file);
  }
});

test('showcase catalog yields the figures stated in its status report', async () => {
  const bytes = await readFile(path.join(root, 'showcase/uniq/COVERAGE.csv'));
  const report = reportCatalog(bytes, { gates: ['G01'] });
  assert.equal(report.status, 'REPORT');
  assert.equal(report.totalWeight, 14);
  assert.equal(report.weightedCoveragePercent, 100);
  assert.equal(report.externallySupportedSharePercent, 100);
  assert.deepEqual(report.mandatoryChecks, { named: 1, passed: 1, notPassed: [], blocked: false });
  assert.deepEqual(report.weightZero, ['G01']);
  assert.equal(report.summary, '100% functional coverage, 1/1 mandatory checks passed');
});

test('both formulas follow the brief, including half credit for partial work', () => {
  const bytes = catalog('de', [
    row('A1', 3, 2, 'extern gestützt'), row('A2', 2, 1, 'eigen'), row('A3', 1, 0, 'keiner'),
    row('G1', 0, 1, 'eigen'),
  ]);
  const report = reportCatalog(bytes, { gates: ['G1'] });
  // Points: 3 x 2/2 + 2 x 1/2 + 1 x 0/2 = 4 of 6. Externally supported: 3 of 6.
  assert.equal(report.weightedCoveragePercent, 66.7);
  assert.equal(report.externallySupportedSharePercent, 50);
  assert.deepEqual(report.open, ['A2', 'A3', 'G1']);
  assert.deepEqual(report.mandatoryChecks, { named: 1, passed: 0, notPassed: ['G1'], blocked: true });
  assert.equal(report.summary, '66,7 % Fachabdeckung, 0/1 Pflichtprüfungen bestanden, Freigabe blockiert');
});

test('full weighted coverage does not release a scope with an unproven mandatory check', () => {
  const unproven = 'G3;B;Module;Restore;Local;0;Restore works;M1;2;keiner;;;;';
  const bytes = catalog('de', [row('A1', 3, 2, 'eigen'), row('G1', 0, 2, 'eigen'), row('G2', 0, 2, 'eigen'), unproven]);
  const report = reportCatalog(bytes, { gates: ['G1', 'G2', 'G3'] });
  assert.equal(report.weightedCoveragePercent, 100);
  assert.deepEqual(report.mandatoryChecks, { named: 3, passed: 2, notPassed: ['G3'], blocked: true });
  assert.deepEqual(report.completeWithoutEvidence, ['G3']);
  assert.equal(report.summary,
    '100 % Fachabdeckung, 2/3 Pflichtprüfungen bestanden, Freigabe blockiert, 1 Eintrag ohne Nachweis als erfüllt gemeldet');
  assert.deepEqual(report.warnings, ['Line 5 (G3): implementation 2 is claimed without evidence']);
});

test('evidence counts only with a type and a reference, in every figure alike', () => {
  // The same requirement four times: complete, weight 3, differing only in the evidence columns.
  const complete = (id, type, reference) =>
    [id, 'F', 'Module', 'Feature', 'Q1: manual', 3, 'Criterion', 'M1', 2, type, reference, '', '', ''].join(';');
  const cases = [
    // evidence type, reference, externally supported points, listed as complete without evidence
    ['externally supported', 'REPORT.md', 3, false],
    ['externally supported', '', 0, true],
    ['internal', '', 0, true],
    ['none', 'REPORT.md', 0, true],
    ['internal', 'REPORT.md', 0, false],
  ];
  for (const [type, reference, externalPoints, unproven] of cases) {
    const label = type + ' / ' + (reference || 'no reference');
    const report = reportCatalog(catalog('en', [complete('R01', type, reference)]), { gates: ['R01'] });
    assert.equal(report.weightedCoveragePercent, 100, label);
    assert.equal(report.externallySupportedPoints, externalPoints, label);
    assert.equal(report.externallySupportedSharePercent, externalPoints ? 100 : 0, label);
    assert.deepEqual(report.completeWithoutEvidence, unproven ? ['R01'] : [], label);
    // An entry never counts as externally supported and as lacking evidence at once.
    assert.ok(!(report.externallySupportedPoints > 0 && report.completeWithoutEvidence.length > 0), label);
    assert.equal(report.mandatoryChecks.passed, unproven ? 0 : 1, label);
    assert.equal(report.mandatoryChecks.blocked, unproven, label);
    assert.equal(report.warnings.length, unproven ? 1 : 0, label);
    assert.equal(report.summary.includes('1 entry claimed complete without evidence'), unproven, label);
  }
  const partial = [['R01', 'F', 'Module', 'Feature', 'Q1', 2, 'Criterion', 'M1', 1, 'externally supported', '', '', '', ''].join(';')];
  const half = reportCatalog(catalog('en', partial));
  assert.equal(half.weightedCoveragePercent, 50);
  assert.equal(half.externallySupportedSharePercent, 0);
  assert.match(half.warnings[0], /evidence type without an evidence path/);
});

test('a mandatory check named twice is refused, and the two counts always agree with the verdict', () => {
  const bytes = catalog('en', [row('A1', 3, 2, 'internal'), row('G1', 0, 2, 'internal'), row('G2', 0, 0, 'none')]);
  const twice = reportCatalog(bytes, { gates: ['G1', 'G1'] });
  assert.equal(twice.status, 'INVALID');
  assert.deepEqual(twice.errors, ['Mandatory check is named more than once: G1']);
  assert.equal(twice.summary, undefined);
  assert.deepEqual(reportCatalog(bytes, { exclude: ['A1', 'A1'] }).errors, ['Excluded entry is named more than once: A1']);
  for (const gates of [['G1'], ['G2'], ['G1', 'G2'], ['G2', 'G1'], ['A1', 'G1']]) {
    const { mandatoryChecks: checks, summary } = reportCatalog(bytes, { gates });
    assert.equal(checks.named, gates.length);
    assert.equal(checks.passed + checks.notPassed.length, checks.named, gates.join());
    assert.equal(checks.blocked, checks.passed !== checks.named, gates.join());
    assert.equal(summary.includes('release blocked'), checks.blocked, gates.join());
    assert.ok(summary.includes(checks.passed + '/' + checks.named + ' mandatory checks passed'), gates.join());
  }
});

test('a rounded figure reads 100 only when nothing is missing and 0 only when nothing is achieved', () => {
  const many = Array.from({ length: 700 }, (_, index) => row('A' + index, 3, 2, 'internal'));
  const almost = reportCatalog(catalog('en', [...many, row('Z1', 1, 0, 'none')]));
  assert.equal(almost.weightedPoints, 2100);
  assert.equal(almost.totalWeight, 2101);
  assert.equal(almost.weightedCoveragePercent, 99.9);
  assert.deepEqual(almost.open, ['Z1']);
  const zeros = Array.from({ length: 700 }, (_, index) => row('A' + index, 3, 0, 'none'));
  const barely = reportCatalog(catalog('en', [...zeros, row('Z1', 1, 1, 'externally supported')]));
  assert.equal(barely.weightedCoveragePercent, 0.1);
  assert.equal(barely.externallySupportedSharePercent, 0.1);
  assert.equal(reportCatalog(catalog('en', many)).weightedCoveragePercent, 100);
  assert.equal(reportCatalog(catalog('en', zeros)).weightedCoveragePercent, 0);
});

test('a total weight of zero cannot be assessed, and selections change the base', () => {
  const none = reportCatalog(catalog('en', [row('G1', 0, 2, 'internal')]));
  assert.equal(none.weightedCoveragePercent, null);
  assert.equal(none.summary, 'functional coverage cannot be assessed, mandatory checks not named (--gates)');

  const bytes = catalog('en', [row('A1', 3, 2, 'internal'), row('A2', 3, 0, 'none'), row('B1', 2, 0, 'none', 'M2')]);
  assert.equal(reportCatalog(bytes).weightedCoveragePercent, 37.5);
  assert.equal(reportCatalog(bytes, { milestone: 'M1' }).weightedCoveragePercent, 50);
  const selected = reportCatalog(bytes, { milestone: 'M1', exclude: ['A2'] });
  assert.equal(selected.weightedCoveragePercent, 100);
  // The line that gets quoted names the selection, so 100% of a part cannot pass for 100% of the catalog.
  assert.equal(selected.summary,
    '100% functional coverage, only milestone M1, 1 entry excluded, mandatory checks not named (--gates)');
  assert.equal(reportCatalog(bytes).summary, '37.5% functional coverage, mandatory checks not named (--gates)');
  assert.match(reportCatalog(bytes, { gates: ['X9'] }).errors[0], /Unknown ID/);
  assert.match(reportCatalog(bytes, { gates: ['A1'], exclude: ['A1'] }).errors[0], /cannot be excluded/);
  assert.match(reportCatalog(bytes, { gates: ['B1'], milestone: 'M1' }).errors[0], /outside the selected milestone/);
  assert.deepEqual(reportCatalog(bytes, { milestone: 'M9' }).errors, ['No entry has the milestone: M9']);
});

test('format faults are reported with their line and never produce a figure', () => {
  const good = row('A1', 3, 2, 'internal');
  const faults = [
    [Buffer.from(layouts.en.header.join(';') + '\n' + good + '\n'), /byte order mark/],
    [catalog('en', [good]).subarray(0, 40), /Header differs/],
    [catalog('en', [good + '; trailing note']), /Line 2 \(A1\): 15 fields instead of 14/],
    [catalog('en', [good, good]), /Line 3 \(A1\): ID is used more than once/],
    [catalog('en', [good, row('a1', 1, 0, 'none')]), /Line 3 \(a1\): ID is used more than once/],
    [catalog('en', [row('A 1', 3, 2, 'internal')]), /ID must not contain spaces or commas/],
    [catalog('en', [row('"A,1"', 3, 2, 'internal')]), /ID must not contain spaces or commas/],
    [catalog('en', [row('A1', 4, 2, 'internal')]), /Weight must be 0, 1, 2 or 3/],
    [catalog('en', [row('A1', 3, 3, 'internal')]), /Implementation must be 0, 1 or 2/],
    [catalog('en', [row('A1', 3, 2, 'eigen')]), /Evidence type must be none, internal, externally supported/],
    [catalog('en', [good.replace(';F;', ';X;')]), /Dimension must be F, A, R, D or B/],
    [catalog('en', [good.replace(';Criterion;', ';;')]), /missing Acceptance criterion/],
    [catalog('en', ['A1;"open']), /Unterminated quoted field/],
    [Buffer.from([0xef, 0xbb, 0xbf, 0xff]), /not valid UTF-8/],
  ];
  for (const [bytes, expected] of faults) {
    const report = reportCatalog(bytes);
    assert.equal(report.status, 'INVALID');
    assert.match(report.errors.join('\n'), expected);
    assert.equal(report.weightedCoveragePercent, undefined);
  }
});

test('spreadsheet output with CRLF, quoted semicolons and line breaks inside a cell is read', () => {
  assert.deepEqual(splitRecords('a;"b;c";"say ""yes"""\r\n\r\nd;"two\nlines";e\n').map(record => record.fields),
    [['a', 'b;c', 'say "yes"'], ['d', 'two\nlines', 'e']]);
  const quoted = row('A2', 1, 2, 'internal').replace(';Criterion;', ';"First line\nsecond; line";');
  const bytes = catalog('en', [row('A1', 1, 0, 'none'), quoted, row('A3', 1, 1, 'internal')], '\r\n');
  const parsed = parseCatalog(bytes);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.entries.map(entry => [entry.id, entry.line]), [['A1', 2], ['A2', 3], ['A3', 5]]);
});

test('command line reports, and --strict turns a failed mandatory check into an error exit', async t => {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'catalog-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'COVERAGE.csv');
  await writeFile(file, catalog('en', [row('A1', 3, 2, 'internal'), row('G1', 0, 0, 'none')]));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'tools', 'catalog.mjs'), ...args],
    { encoding: 'utf8', timeout: 30_000 });

  const plain = run('report', file, '--gates', 'G1');
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(JSON.parse(plain.stdout).summary, '100% functional coverage, 0/1 mandatory checks passed, release blocked');
  assert.equal(run('report', file, '--gates', 'G1', '--strict').status, 1);
  assert.equal(run('report', file, '--gates', 'A1', '--strict').status, 0);
  assert.equal(JSON.parse(run('check', file).stdout).status, 'CATALOG_VALID');

  // A strict run never ends without an error unless every named check passed.
  const twice = run('report', file, '--gates', 'A1,A1', '--strict');
  assert.equal(twice.status, 1);
  assert.deepEqual(JSON.parse(twice.stdout).errors, ['Mandatory check is named more than once: A1']);
  assert.equal(run('report', file, '--gates', 'A1', '--gates', 'A1', '--strict').status, 1);
  for (const args of [['--strict'], ['--gates', ',', '--strict'], ['--gates', '--strict'], ['--gates'],
    ['--milestone', 'M1', '--milestone', 'M1'], ['--exclude', ' ']]) {
    const refused = run('report', file, ...args);
    assert.equal(refused.status, 1, args.join(' '));
    assert.equal(refused.stdout, '', args.join(' '));
    assert.match(refused.stderr, /catalog\.mjs report/, args.join(' '));
  }
  assert.match(run('report', file, '--strict').stderr, /--strict needs --gates/);

  // Complete without evidence: reported in the summary and an error exit under --strict.
  await writeFile(file, catalog('en', [row('A1', 3, 2, 'internal'), row('A2', 1, 2, 'none')]));
  const unproven = run('report', file, '--gates', 'A1', '--strict');
  assert.equal(unproven.status, 1);
  assert.equal(JSON.parse(unproven.stdout).summary,
    '100% functional coverage, 1/1 mandatory checks passed, 1 entry claimed complete without evidence');
  assert.equal(run('report', file, '--gates', 'A1').status, 0);
  assert.equal(run('report', path.join(dir, 'missing.csv')).status, 1);
  await writeFile(file, catalog('en', [row('A1', 3, 2, 'internal'), row('G1', 0, 0, 'none')]));

  await writeFile(file, catalog('en', ['A1;F']));
  const invalid = run('check', file);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).status, 'INVALID');
  const usage = run('report');
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /catalog\.mjs report/);
});
