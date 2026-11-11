// Group consecutive LF-delimited records without decoding their bytes.
import { pipeline } from 'node:stream/promises';

const LF = Buffer.from([10]);

async function* records(input) {
  let fragments = [];
  for await (const chunk of input) {
    let start = 0;
    for (let end = chunk.indexOf(10); end !== -1; end = chunk.indexOf(10, start)) {
      const segment = chunk.subarray(start, end);
      if (fragments.length) {
        fragments.push(segment);
        yield Buffer.concat(fragments);
        fragments = [];
      } else {
        yield segment;
      }
      start = end + 1;
    }
    if (start < chunk.length) fragments.push(chunk.subarray(start));
  }
  if (fragments.length) yield Buffer.concat(fragments);
}

function* formatGroup(line, count, mode) {
  if (mode === '-d' && count === 1n) return;
  if (mode === '-u' && count > 1n) return;
  if (mode === '-c') yield Buffer.from(count.toString().padStart(7) + ' ');
  yield line;
  yield LF;
}

async function* lineRuns(input, mode) {
  let previous;
  let count = 0n;
  for await (const line of records(input)) {
    if (previous !== undefined && line.equals(previous)) {
      count++;
      continue;
    }
    if (previous !== undefined) yield* formatGroup(previous, count, mode);
    previous = line;
    count = 1n;
  }
  if (previous !== undefined) yield* formatGroup(previous, count, mode);
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['-c', '-d', '-u'].includes(args[0]))) {
  console.error('Usage: node line-runs.mjs [-c | -d | -u]');
  process.exitCode = 2;
} else {
  // R07: a reader such as `head` may close standard output early. Stop quietly in that case.
  const readerClosed = error => error?.code === 'EPIPE';
  try {
    await pipeline(lineRuns(process.stdin, args[0]), process.stdout);
  } catch (error) {
    if (!readerClosed(error)) {
      console.error('line-runs:', error.message);
      process.exitCode = 1;
    }
  }
}
