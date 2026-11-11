// Loaded before tools/criteria.mjs in a child process to produce faults the tests cannot
// produce from outside: storage that refuses hard links, and a process that is ended by force
// at a chosen point of a freeze. The ending is real: the process kills itself without cleanup.
//   REFTRAIL_TEST_LINKS=refused            every hard link fails, as on exFAT or FAT32
//   REFTRAIL_TEST_END=write                ends after 4,096 bytes of a file were written
//   REFTRAIL_TEST_END=write-baseline-name  the same, but only for a file that is not a working file
//   REFTRAIL_TEST_END=before-link          ends when the complete working file is to be linked
//   REFTRAIL_TEST_END=after-link           ends after the baseline name exists, before any report
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';

const { REFTRAIL_TEST_LINKS: links, REFTRAIL_TEST_END: end } = process.env;
const realLink = fsPromises.link, realOpen = fsPromises.open;
const endByForce = () => { process.kill(process.pid, 'SIGKILL'); return new Promise(() => {}); };

fsPromises.link = async (existing, created) => {
  if (end === 'before-link') await endByForce();
  if (links === 'refused') throw Object.assign(new Error('EPERM: operation not permitted, link'), { code: 'EPERM' });
  await realLink(existing, created);
  if (end === 'after-link') await endByForce();
};
fsPromises.open = async (file, flags, ...rest) => {
  const handle = await realOpen(file, flags, ...rest);
  const workingFile = String(file).endsWith('.partial');
  if (flags === 'wx' && (end === 'write' || (end === 'write-baseline-name' && !workingFile))) {
    handle.writeFile = async bytes => {
      await handle.write(bytes.subarray(0, 4096));
      await endByForce();
    };
  }
  return handle;
};
syncBuiltinESMExports();
