// Synthetic command-line program for the restart test.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

const [profile, mode] = process.argv.slice(2);
const file = path.join(profile, 'value.json');
let value = null;
if (mode !== 'volatile') {
  try { value = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

const commands = createInterface({ input: process.stdin, crlfDelay: Infinity });
function reply(data) { process.stdout.write(JSON.stringify(data) + '\n'); }
reply({ ready: true });
for await (const line of commands) {
  const command = JSON.parse(line);
  if (command.action === 'stop') break;
  if (command.action === 'write') {
    value = command.value;
    if (mode !== 'volatile') await writeFile(file, JSON.stringify(value));
  } else if (command.action !== 'read') {
    throw new Error('Unknown action');
  }
  reply(value);
}
commands.close();
process.stdin.destroy();
