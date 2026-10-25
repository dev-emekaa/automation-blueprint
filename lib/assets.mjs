/**
 * What automation-blueprint ships, defined once — read by the installer and by the folder build.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

/** The language code automations are written in. n8n and Activepieces automations need neither. */
export const STACKS = {
  typescript: { standards: 'typescript.md', label: 'TypeScript · Node · Hatchet · Vercel AI SDK · Zod · PostgreSQL' },
  python:     { standards: 'python.md',     label: 'Python · Hatchet · Pydantic AI · Pydantic · PostgreSQL' },
};
export const DEFAULT_STACK = 'typescript';

/** Rules every project gets. */
export const RULES = [
  'documentation-conventions.md',
  'tech-stack.md',
  'workflow-standards.md',
  'integrations.md',
  'ai-steps.md',
  'security.md',
  'testing.md',
  'ci-cd.md',
];

/** Rules only some projects get. */
export const OPTIONAL_RULES = { console: 'console.md' };

/** Folders under docs/ the installer creates. */
export const DOC_DIRS = ['automations', 'infra'];

/** Registers the installer creates once, from templates. */
export const REGISTERS = { 'automations.md': 'docs/automations.md', 'connections.md': 'docs/connections.md' };

/** The CLAUDE.md blocks, with the stack filled in (left blank for the folder version). */
export async function claudeTemplate(stack) {
  const template = await readFile(join(ASSETS, 'templates', 'CLAUDE.md'), 'utf8');
  return template.replaceAll('{{STACK}}', stack ? STACKS[stack].label : 'typescript or python — the language code automations are written in');
}
