// Check a declared JS source tree or freeze the exact files covered by a passing receipt.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  canonicalRoot, freezeSource, freshOutput, isScript, jsonBytes, selectedTests, sha256,
  sourceHashes, validateSourceAuthority,
} from './windows-build-contract.mjs';

const execute = promisify(execFile);
const usage = [
  'check --root DIR --output NEW_DIR [--dir REL]... [--file REL]...',
  'freeze --root DIR --receipt FILE --sha256 HEX --output NEW_DIR',
  'Select at least one directory or file. Tests use *.test.js, *.test.mjs or *.test.cjs.',
].join('\n');

function parseOptions(mode, args) {
  const options = { scope: { directories: [], files: [] } };
  const allowed = mode === 'check' ? ['--root', '--output', '--dir', '--file']
    : ['--root', '--output', '--receipt', '--sha256'];
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    assert(allowed.includes(flag) && value && !value.startsWith('--'), usage);
    if (flag === '--dir') options.scope.directories.push(value);
    else if (flag === '--file') options.scope.files.push(value);
    else {
      const key = flag.slice(2);
      assert(!Object.hasOwn(options, key), 'Duplicate option ' + flag);
      options[key] = value;
    }
  }
  assert(options.root && options.output, usage);
  if (mode === 'check') assert(options.scope.directories.length + options.scope.files.length, usage);
  else assert(options.receipt && options.sha256, usage);
  return options;
}

async function runNode(root, args, environment) {
  try {
    const result = await execute(process.execPath, args, {
      cwd: root, env: environment, windowsHide: true, timeout: 120_000,
      killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024, encoding: 'utf8',
    });
    return { exitCode: 0, ...result };
  } catch (error) {
    return {
      exitCode: Number.isInteger(error.code) ? error.code : null,
      error: String(error.code ?? error.signal ?? error.name),
      stdout: error.stdout ?? '', stderr: error.stderr ?? '',
    };
  }
}

function testCounts(tap) {
  const counts = {};
  for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const summaries = [...tap.matchAll(new RegExp('^# ' + key + ' (\\d+)\\r?$', 'gm'))];
    counts[key] = summaries.length === 1 ? Number(summaries[0][1]) : null;
  }
  return counts;
}

export async function checkReleaseSource({ root, output, scope }) {
  const source = await canonicalRoot(root);
  const before = await sourceHashes(source, scope);
  const names = Object.keys(before).sort();
  const testFiles = selectedTests(names);
  assert(testFiles.length, 'Selected scope contains no test files');
  const dir = await freshOutput(output, source);
  const temp = path.join(dir, 'temp');
  await fs.mkdir(temp);
  const environment = { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp };
  for (const key of Object.keys(environment)) {
    if (['NODE_OPTIONS', 'NODE_PATH', 'NODE_TEST_CONTEXT'].includes(key.toUpperCase())) delete environment[key];
  }

  const tests = await runNode(source, [
    '--test', '--test-concurrency=1', '--test-reporter=tap', '--', ...testFiles,
  ], environment);
  await fs.writeFile(path.join(dir, 'tests.tap'), tests.stdout, { flag: 'wx' });
  await fs.writeFile(path.join(dir, 'tests.stderr.txt'), tests.stderr, { flag: 'wx' });

  const syntax = [];
  for (const name of names.filter(isScript)) {
    const result = await runNode(source, ['--check', '--', name], environment);
    const row = { name, exitCode: result.exitCode };
    if (result.exitCode !== 0) row.diagnostic = result.stderr || result.error || 'Check failed';
    syntax.push(row);
  }

  let after;
  let inventoryError;
  try {
    after = await sourceHashes(source, scope);
  } catch (error) {
    inventoryError = error.message;
    after = {};
  }
  const allNames = [...new Set([...names, ...Object.keys(after)])].sort();
  const receipt = {
    schemaVersion: 1, status: 'PASS', at: new Date().toISOString(), node: process.version,
    scope, testFiles, tests: testCounts(tests.stdout), testExitCode: tests.exitCode, syntax,
    changedFiles: allNames.filter(name => before[name] !== after[name]),
    sourceHashes: before, sourceHashesAfter: after,
  };
  if (tests.error) receipt.testProcessError = tests.error;
  if (inventoryError) receipt.inventoryError = inventoryError;
  try {
    validateSourceAuthority(receipt, before);
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.reason = error.message;
  }

  const receiptPath = path.join(dir, 'receipt.json');
  const bytes = jsonBytes(receipt);
  await fs.writeFile(receiptPath, bytes, { flag: 'wx' });
  return { status: receipt.status, receipt: receiptPath, sha256: sha256(bytes) };
}

// True when this file is the started script. A project folder can be reached through a link,
// so both paths are resolved before they are compared.
function startedDirectly() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedDirectly()) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    if (mode === '--help') {
      console.log(usage);
    } else {
      assert(['check', 'freeze'].includes(mode), usage);
      const options = parseOptions(mode, args);
      const result = mode === 'check' ? await checkReleaseSource(options)
        : await freezeSource(options.root, options.output, options.receipt, options.sha256);
      console.log(JSON.stringify(result, null, 2));
      if (result.status === 'FAIL') process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
