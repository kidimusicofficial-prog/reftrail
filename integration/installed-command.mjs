// Pack this repository with npm, install the archive into an empty project and start the
// installed reftrail command there. This checks the command as a user gets it after
// "npm install", which the test suite cannot do without npm.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';

// Start npm without a command interpreter, so a folder name with spaces or "&" cannot change the call.
function npmCommand() {
  const bundled = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].find(file => file && /npm-cli\.js$/.test(file) && existsSync(file));
  if (bundled) return [process.execPath, [bundled]];
  assert(!windows, 'npm was not found next to Node.js. Start this check with "npm run installed".');
  return ['npm', []];
}

function run(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 180_000, windowsHide: true });
  if (result.error) throw result.error;
  return result;
}

async function check() {
  const [npm, npmArgs] = npmCommand();
  const work = await mkdtemp(path.join(await realpath(tmpdir()), 'installed command & '));
  try {
    const packed = path.join(work, 'packed'), project = path.join(work, 'project');
    await mkdir(packed);
    await mkdir(project);
    const pack = run(npm, [...npmArgs, 'pack', '--pack-destination', packed], root);
    assert.equal(pack.status, 0, 'npm pack failed:\n' + pack.stderr);
    const archives = await readdir(packed);
    assert.equal(archives.length, 1, 'Expected one packed archive');

    await writeFile(path.join(project, 'package.json'), JSON.stringify({ name: 'install-check', private: true }));
    const install = run(npm, [...npmArgs, 'install', '--offline', '--no-audit', '--no-fund', '--ignore-scripts',
      path.join(packed, archives[0])], project);
    assert.equal(install.status, 0, 'npm install failed:\n' + install.stderr);

    // On Linux and macOS npm links the command into node_modules/.bin; start that link itself.
    // On Windows npm writes a small launcher file that starts Node.js with the installed script.
    // That file needs the command interpreter, so this check starts the same script directly.
    const installed = path.join(project, 'node_modules', 'reftrail', 'tools', 'reftrail.mjs');
    const linked = path.join(project, 'node_modules', '.bin', 'reftrail');
    const [program, first] = windows ? [process.execPath, [installed]] : [linked, []];
    const reftrail = (...args) => run(program, [...first, ...args], project);

    const missing = reftrail('catalog', 'check', path.join(project, 'missing.csv'));
    assert.equal(missing.status, 1, 'A missing catalog ended with exit code ' + missing.status);
    assert.equal(missing.stdout, '', 'A missing catalog produced a result');
    assert.match(missing.stderr, /ENOENT/, 'A missing catalog was not named as the fault');

    const showcase = path.join(root, 'showcase', 'uniq', 'COVERAGE.csv');
    const report = reftrail('catalog', 'report', showcase, '--gates', 'G01', '--strict');
    assert.equal(report.status, 0, report.stderr);
    assert.equal(JSON.parse(report.stdout).summary, '100% functional coverage, 1/1 mandatory checks passed');

    const criteria = path.join(project, 'criteria.json'), baseline = path.join(project, 'criteria-v1.json');
    await writeFile(criteria, '{"scope":"installed command"}\n');
    const frozen = reftrail('criteria', 'freeze', criteria, baseline);
    assert.equal(frozen.status, 0, frozen.stderr);
    const { sha256 } = JSON.parse(frozen.stdout);
    assert.equal(JSON.parse(reftrail('criteria', 'check', criteria, baseline, sha256).stdout).status, 'CRITERIA_VERIFIED');
    await writeFile(criteria, '{"scope":"changed afterwards"}\n');
    assert.equal(reftrail('criteria', 'check', criteria, baseline, sha256).status, 1, 'Changed criteria were accepted');

    const help = reftrail('--help');
    assert.equal(help.status, 0);
    assert.match(help.stdout, /reftrail catalog report/);
    const nothing = reftrail();
    assert.equal(nothing.status, 1, 'A call without arguments ended with exit code ' + nothing.status);
    assert.match(nothing.stderr, /reftrail criteria freeze/);

    const manifest = JSON.parse(await readFile(path.join(project, 'node_modules', 'reftrail', 'package.json'), 'utf8'));
    return {
      status: 'INSTALLED_COMMAND_VERIFIED',
      version: manifest.version,
      started: windows ? 'installed script with Node.js (the launcher file itself was not started)' : 'node_modules/.bin/reftrail',
      checks: ['missing file is an error', 'showcase report', 'freeze and check', 'changed criteria refused', 'help', 'no arguments'],
      npm: run(npm, [...npmArgs, '--version'], project).stdout.trim(),
      node: process.version, platform: process.platform,
    };
  } finally {
    await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

// This file is only ever started, never imported, so it runs unconditionally.
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node integration/installed-command.mjs\nPacks the repository with npm, installs the archive into an empty temporary project and starts the installed reftrail command.');
  } else {
    if (args.length) throw new Error('Usage: node integration/installed-command.mjs [--help]');
    console.log(JSON.stringify(await check(), null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
