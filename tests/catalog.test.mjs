// Every coverage catalog keeps the column layout of its template. A semicolon outside quotes
// silently shifts the following text into an extra column.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Split one record of the catalog format: semicolon delimiter, optional double quotes, "" inside quotes.
function splitRecord(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ';') {
      fields.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  assert(!quoted, 'Unterminated quoted field');
  fields.push(field);
  return fields;
}

async function catalogs() {
  const found = [];
  for (const dir of ['templates', 'showcase']) {
    for (const name of await readdir(path.join(root, dir), { recursive: true })) {
      if (name.endsWith('.csv')) found.push(path.join(dir, name).replaceAll('\\', '/'));
    }
  }
  return found.sort();
}

async function records(file) {
  const bytes = await readFile(path.join(root, file));
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], file + ': expected a UTF-8 byte order mark');
  const text = bytes.subarray(3).toString('utf8');
  assert(!text.includes('\r'), file + ': expected LF line endings');
  return text.split('\n').filter(line => line !== '').map(splitRecord);
}

test('every catalog row has exactly the columns of its template header', async () => {
  const files = await catalogs();
  assert(files.includes('showcase/uniq/COVERAGE.csv'), 'Expected the showcase catalog');
  for (const file of files) {
    const [header, ...rows] = await records(file);
    const template = path.basename(file) === 'ABDECKUNG.csv' ? 'templates/ABDECKUNG.csv' : 'templates/COVERAGE.csv';
    assert.deepEqual(header, (await records(template))[0], file + ': header differs from ' + template);
    rows.forEach((row, index) => {
      assert.equal(row.length, header.length,
        `${file}, line ${index + 2} (${row[0]}): ${row.length} fields instead of ${header.length}`);
    });
  }
});

test('the field count check rejects an unquoted semicolon and accepts a quoted one', () => {
  assert.equal(splitRecord('R1;"limit; reason";note').length, 3);
  assert.equal(splitRecord('R1;limit;note; more').length, 4);
  assert.deepEqual(splitRecord('R1;"say ""yes""";x'), ['R1', 'say "yes"', 'x']);
  assert.throws(() => splitRecord('R1;"open'), /Unterminated/);
});
