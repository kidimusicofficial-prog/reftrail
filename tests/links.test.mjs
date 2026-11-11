// Every relative link in the documentation must lead to a file in this repository, and a link
// to a heading must name a heading that exists. Web addresses are not requested.
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skipped = /(^|[\\/])(node_modules|\.git|\.artifacts)([\\/]|$)/;

// GitHub's heading anchors: lower case, punctuation removed, each space becomes a hyphen.
const anchor = heading => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const headings = text => text.split('\n').filter(line => /^#{1,6}\s/.test(line))
  .map(line => anchor(line.replace(/^#{1,6}\s+/, '')));
// Fenced code is sample text. Its brackets are not links.
const prose = text => text.replace(/^```[\s\S]*?^```/gm, '');

test('relative links and heading anchors in all Markdown files resolve', async () => {
  const files = (await readdir(root, { recursive: true }))
    .filter(name => name.endsWith('.md') && !skipped.test(name)).sort();
  assert.ok(files.includes('README.md') && files.length >= 10, 'Expected the documentation tree');
  const broken = [];
  let checked = 0;
  for (const file of files) {
    const text = prose(await readFile(path.join(root, file), 'utf8'));
    for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      checked++;
      const [relative, fragment] = target.split('#');
      const full = relative ? path.resolve(root, path.dirname(file), decodeURIComponent(relative)) : path.join(root, file);
      if (path.relative(root, full).startsWith('..')) { broken.push(file + ' -> ' + target + ' (leaves the repository)'); continue; }
      const found = await stat(full).catch(() => null);
      if (!found) { broken.push(file + ' -> ' + target + ' (missing)'); continue; }
      if (fragment !== undefined && found.isFile() && full.endsWith('.md')) {
        const names = headings(await readFile(full, 'utf8'));
        if (!names.includes(decodeURIComponent(fragment))) broken.push(file + ' -> ' + target + ' (no such heading)');
      }
    }
  }
  assert.ok(checked >= 100, 'Expected to check the cross-references, found ' + checked);
  assert.deepEqual(broken, []);
});

test('the anchor rule matches GitHub for the headings used here', () => {
  assert.equal(anchor('Auf Deutsch'), 'auf-deutsch');
  assert.equal(anchor('Freeze acceptance criteria · Abnahmekriterien festschreiben'),
    'freeze-acceptance-criteria--abnahmekriterien-festschreiben');
  assert.equal(anchor('4.5.0 – 2026-11-10'), '450--2026-11-10');
  assert.deepEqual(headings('# One\ntext\n## Two & three\n#not a heading\n'), ['one', 'two--three']);
});
