#!/usr/bin/env node
// One entry point for the two tools: reftrail criteria ... and reftrail catalog ...
// This file is only ever started, never imported, so it runs unconditionally. npm installs it
// as a link. A start check that compares the started path with this file's own path would
// then find them different and end without doing anything and without a message.
import { main as catalog } from './catalog.mjs';
import { main as criteria } from './criteria.mjs';

const tools = { criteria, catalog };
const usage = [
  'reftrail criteria freeze <criteria-file> <new-baseline-file>',
  'reftrail criteria check <criteria-file> <baseline-file> <pinned-sha256>',
  'reftrail catalog check <catalog.csv>',
  'reftrail catalog report <catalog.csv> [--gates ID,ID] [--exclude ID,ID] [--milestone NAME] [--strict]',
].join('\n');

async function main([tool, ...args]) {
  if (tool === '--help' && args.length === 0) return { output: usage, failed: false };
  if (!Object.hasOwn(tools, tool) || args.length === 0) throw new Error(usage);
  return tools[tool](args);
}

try {
  const { output, failed } = await main(process.argv.slice(2));
  console.log(output);
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
