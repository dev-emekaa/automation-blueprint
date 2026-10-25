#!/usr/bin/env node
/**
 * Builds the downloadable folder version from the same assets the installer uses:
 *   dist/automation-blueprint/            the folder
 *   dist/automation-blueprint-v{version}.zip
 * Run with: npm run package
 */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ASSETS, STACKS, RULES, OPTIONAL_RULES, REGISTERS, claudeTemplate } from '../lib/assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const DIST = join(ROOT, 'dist');
const OUT = join(DIST, 'automation-blueprint');
const ZIP = `automation-blueprint-v${version}.zip`;

await rm(DIST, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Guide
await cp(join(ROOT, 'folder', 'README.md'), join(OUT, 'README.md'));

// Skills — one folder each, as Claude Code expects (the console skill included; the README says it is optional)
await cp(join(ASSETS, 'skills'), join(OUT, 'skills'), { recursive: true });

// Rules every project gets, plus the optional ones
for (const f of [...RULES, ...Object.values(OPTIONAL_RULES)]) {
  await cp(join(ASSETS, 'rules', f), join(OUT, 'rules', f));
}

// Coding standards per language: copy one as rules/coding-standards.md
for (const stack of Object.keys(STACKS)) {
  await mkdir(join(OUT, 'rules', 'stacks', stack), { recursive: true });
  await cp(join(ASSETS, 'coding-standards', STACKS[stack].standards), join(OUT, 'rules', 'stacks', stack, 'coding-standards.md'));
}

// Templates: the CLAUDE.md blocks and the two registers
await mkdir(join(OUT, 'templates'), { recursive: true });
// The installer's marker is kept, so moving to the installer later does not append a second docs map.
await writeFile(join(OUT, 'templates', 'CLAUDE.md'), `<!-- automation-blueprint:docs-map -->\n${await claudeTemplate()}`);
for (const tpl of Object.keys(REGISTERS)) await cp(join(ASSETS, 'templates', tpl), join(OUT, 'templates', tpl));

// Zip
try {
  execFileSync('zip', ['-rqX', ZIP, 'automation-blueprint', '-x', '*.DS_Store'], { cwd: DIST });
  console.log(`Built dist/automation-blueprint/ and dist/${ZIP}`);
} catch {
  console.log('Built dist/automation-blueprint/. The `zip` command was not found, so zip that folder yourself.');
}
