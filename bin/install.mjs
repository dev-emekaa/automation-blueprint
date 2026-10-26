#!/usr/bin/env node
/**
 * automation-blueprint — scaffold the spec-to-production automation workflow into a project.
 * Zero dependencies. Idempotent: existing files are skipped unless --force.
 */
import { readdir, mkdir, copyFile, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { ASSETS, STACKS, DEFAULT_STACK, RULES, OPTIONAL_RULES, DOC_DIRS, REGISTERS, claudeTemplate } from '../lib/assets.mjs';

const CWD = process.cwd();
const MARKER = '<!-- automation-blueprint:docs-map -->';
const SETTINGS = join(CWD, '.claude', 'automation-blueprint.json');

const c = { dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m`,
            g: s => `\x1b[32m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m` };

function parseArgs(argv) {
  const o = { cmd: argv[0], stack: null, console: null, personal: false, force: false, dry: false };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--console') o.console = true;
    else if (a === '--no-console') o.console = false;
    else if (a === '--personal') o.personal = true;
    else if (a === '--force') o.force = true;
    else if (a === '--dry-run') o.dry = true;
    else if (a.startsWith('--stack=')) {
      o.stack = a.slice(8);
      if (!o.stack) { console.error(c.r('--stack needs a value: typescript or python.') + ' Nothing has been written.'); process.exit(1); }
    }
    else if (a === '--stack') {
      o.stack = argv[++i];
      if (!o.stack || o.stack.startsWith('--')) { console.error(c.r('--stack needs a value: typescript or python.') + ' Nothing has been written.'); process.exit(1); }
    }
    else { console.error(c.r(`Unknown option: ${a}`)); process.exit(1); }
  }
  return o;
}

const written = [], skipped = [], kept = [];

// The options of the last install, so `init --force` updates the same stack and console choice.
// With no saved settings (a first run, or a project set up from the folder version), they are
// read from what is installed: the coding standards' title and the console skill.
async function loadSettings() {
  try { return JSON.parse(await readFile(SETTINGS, 'utf8')); } catch {}
  const found = {};
  try {
    const head = (await readFile(join(CWD, '.claude', 'rules', 'coding-standards.md'), 'utf8')).split('\n')[0];
    for (const [k] of Object.entries(STACKS)) if (head.toLowerCase().includes(k)) found.stack = k;
  } catch {}
  if (existsSync(join(CWD, '.claude', 'skills', 'automation-console'))) found.console = true;
  return found;
}

async function put(dest, contents, { force, dry, protect }) {
  const rel = dest.startsWith(CWD) ? dest.slice(CWD.length + 1) : dest;
  if (existsSync(dest) && protect) { kept.push(rel); return; }
  if (existsSync(dest) && !force) { skipped.push(rel); return; }
  if (!dry) { await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, contents); }
  written.push(rel);
}

async function putFile(src, dest, opts) {
  const rel = dest.startsWith(CWD) ? dest.slice(CWD.length + 1) : dest;
  if (existsSync(dest) && opts.protect) { kept.push(rel); return; }
  if (existsSync(dest) && !opts.force) { skipped.push(rel); return; }
  if (!opts.dry) { await mkdir(dirname(dest), { recursive: true }); await copyFile(src, dest); }
  written.push(rel);
}

async function installSkills(opts) {
  const srcRoot = join(ASSETS, 'skills');
  const destRoot = opts.personal ? join(homedir(), '.claude', 'skills') : join(CWD, '.claude', 'skills');
  const names = (await readdir(srcRoot, { withFileTypes: true }))
    .filter(d => d.isDirectory()).map(d => d.name)
    .filter(n => opts.console || n !== 'automation-console').sort();
  for (const name of names) {
    const dir = join(srcRoot, name);
    for (const f of await readdir(dir)) {
      if ((await stat(join(dir, f))).isFile()) await putFile(join(dir, f), join(destRoot, name, f), opts);
    }
  }
  return names.length;
}

async function installRules(opts) {
  const src = join(ASSETS, 'rules');
  const dest = join(CWD, '.claude', 'rules');
  const files = [...RULES];
  if (opts.console) files.push(OPTIONAL_RULES.console);
  for (const f of files) await putFile(join(src, f), join(dest, f), opts);
  await putFile(join(ASSETS, 'coding-standards', STACKS[opts.stack].standards), join(dest, 'coding-standards.md'), opts);
}

// The registers and docs folders hold the project's own records, so --force never overwrites them.
async function installDocs(opts) {
  const keep = { ...opts, force: false, protect: true };
  for (const d of DOC_DIRS) await put(join(CWD, 'docs', d, '.gitkeep'), '', keep);
  for (const [tpl, dest] of Object.entries(REGISTERS)) await putFile(join(ASSETS, 'templates', tpl), join(CWD, dest), keep);
}

const docsMap = async (stack) => `\n${MARKER}\n${await claudeTemplate(stack)}`;

async function installClaudeMd(opts) {
  const dest = join(CWD, 'CLAUDE.md');
  if (existsSync(dest)) {
    const cur = await readFile(dest, 'utf8');
    if (cur.includes(MARKER)) { kept.push('CLAUDE.md (already has the docs map)'); return; }
    if (!opts.dry) await writeFile(dest, cur.trimEnd() + '\n' + (await docsMap(opts.stack)));
    written.push('CLAUDE.md (docs map appended)');
  } else {
    await put(dest, `# Project instructions\n${await docsMap(opts.stack)}`, { ...opts, force: false });
  }
}

function usage() {
  console.log(`
${c.b('automation-blueprint')} — spec-to-production AI and workflow automation for Claude Code

${c.b('Usage')}
  npx github:dev-emekaa/automation-blueprint init [options]

${c.b('Options')}
  --stack <s>       ${c.dim('typescript')} (default) or ${c.dim('python')} — the language code automations are written in
  --console         Also install the ops console skill and rule ${c.dim('(non-technical operators need approvals, results, manual runs)')}
  --no-console      Stop installing them on later runs ${c.dim('(remove the console skill and rule yourself)')}
                    ${c.dim('--stack and --console are remembered in .claude/automation-blueprint.json and reused.')}
  --personal        Install skills to ~/.claude/skills instead of the project
  --force           Overwrite existing files ${c.dim('(default: skip them)')}
  --dry-run         Print what would change, write nothing

${c.b('What it writes')}
  .claude/skills/          7 skills ${c.dim('(8 with --console)')}
  .claude/rules/           conventions · tech stack · workflow standards · integrations · AI steps
                           security · testing · ci-cd · coding standards ${c.dim('(+ console)')}
  docs/                    automations.md (the register) · connections.md · automations/ · infra/
  CLAUDE.md                documentation map, project configuration
`);
}

async function main() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 22) { console.error(c.r(`Node 22+ required (found ${process.versions.node})`)); process.exit(1); }

  const opts = parseArgs(process.argv.slice(2));
  if (!opts.cmd || opts.cmd === 'help' || opts.cmd === '--help' || opts.cmd === '-h') { usage(); return; }
  if (opts.cmd !== 'init') { console.error(c.r(`Unknown command: ${opts.cmd}`)); usage(); process.exit(1); }
  const saved = await loadSettings();
  const remembered = !opts.stack && saved.stack;
  const stackChanged = saved.stack && opts.stack && opts.stack !== saved.stack;
  opts.stack = opts.stack || saved.stack || DEFAULT_STACK;
  opts.console = opts.console ?? (saved.console === true);
  if (!STACKS[opts.stack]) {
    console.error(c.r(`Unknown stack: ${opts.stack}`) + `  — use ${c.b('--stack typescript')} or ${c.b('--stack python')}. Nothing has been written.`);
    process.exit(1);
  }

  const using = `${opts.stack}${opts.console ? ', console' : ''}${remembered ? ' — from this project' : ''}`;
  console.log(`\n${c.b('automation-blueprint')} → ${CWD}  ${c.dim(`(${using})`)}${opts.dry ? c.y('  (dry run)') : ''}\n`);
  if (stackChanged) console.log(c.y(`  Stack changed from ${saved.stack} to ${opts.stack}: coding-standards.md is replaced only with --force\n  (the change is saved once it is), and the Code stack row in CLAUDE.md is yours to update.\n`));

  const n = await installSkills(opts);
  await installRules(opts);
  await installDocs(opts);
  await installClaudeMd(opts);
  if (!opts.dry) {
    // The stack is saved only once its coding standards are the ones installed.
    const standardsWritten = written.includes(join('.claude', 'rules', 'coding-standards.md'));
    const stack = stackChanged && !standardsWritten ? saved.stack : opts.stack;
    await mkdir(dirname(SETTINGS), { recursive: true });
    await writeFile(SETTINGS, JSON.stringify({ stack, console: opts.console }, null, 2) + '\n');
  }

  const label = opts.dry ? 'would write' : 'written';
  console.log(`${c.g(`${written.length} ${label}`)}${skipped.length ? c.dim(`, ${skipped.length} skipped`) : ''}${kept.length ? c.dim(`, ${kept.length} kept`) : ''}\n`);
  for (const f of written) console.log(`  ${c.g('+')} ${f}`);
  if (skipped.length) {
    console.log(c.dim(`\n  skipped (already present — use --force to overwrite):`));
    for (const f of skipped) console.log(c.dim(`  · ${f}`));
  }
  if (kept.length) {
    console.log(c.dim(`\n  kept (your project's records — never overwritten, even with --force):`));
    for (const f of kept) console.log(c.dim(`  · ${f}`));
  }

  console.log(`
${c.b('Next')}
  1. Fill in the project configuration block in ${c.dim('CLAUDE.md')} — the hosting target above all.
     Anything left blank, the skill that needs it asks for once.
  2. Start Claude Code and run ${c.b('/automation-setup')} — it builds the foundation once.
  3. Run ${c.b('/automation-spec')} with a rough description of the first automation, or with no
     idea yet and it runs discovery.
  4. Then ${c.b('/automation-build')}, ${c.b('/ai-evals')} where it has AI steps, and ${c.b('/automation-deploy')}.

  ${n} skills ${opts.dry ? 'would be installed' : 'installed'} to ${c.dim(opts.personal ? '~/.claude/skills' : '.claude/skills')}${
    opts.personal ? c.y('\n  Note: personal skills are not read by cloud sessions or scheduled runs.') : ''}
`);
}

main().catch(e => { console.error(c.r(e.stack || String(e))); process.exit(1); });
