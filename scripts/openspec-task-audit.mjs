#!/usr/bin/env node
/**
 * openspec-task-audit.mjs — Phase 7 OpenSpec task completion gate.
 *
 * Reads tasks.md and reports counts and status for each task bucket.
 * Exits 0 if no tasks are in a blocked/stalled state requiring Architect attention.
 * Exits 1 only if there are explicitly marked BLOCKED tasks (not just unchecked ones).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TASKS_FILE = path.join(ROOT, 'openspec', 'changes', 'mission-os-v0-6-managed-hermes-bundle', 'tasks.md');

if (!fs.existsSync(TASKS_FILE)) {
  console.error('❌ openspec-task-audit: tasks.md not found at', TASKS_FILE);
  process.exit(1);
}

const content = fs.readFileSync(TASKS_FILE, 'utf8');
const lines = content.split('\n');

let complete = 0;
let partial = 0;
let pending = 0;
let blocked = 0;
const pendingItems = [];
const partialItems = [];
const blockedItems = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('- [x]')) {
    complete++;
  } else if (trimmed.startsWith('- [/]')) {
    partial++;
    partialItems.push(trimmed.replace('- [/]', '').trim().substring(0, 80));
  } else if (trimmed.startsWith('- [ ]')) {
    pending++;
    pendingItems.push(trimmed.replace('- [ ]', '').trim().substring(0, 80));
  } else if (trimmed.startsWith('- [BLOCKED]') || trimmed.toLowerCase().includes('blocked:')) {
    blocked++;
    blockedItems.push(trimmed.substring(0, 80));
  }
}

const total = complete + partial + pending + blocked;
const percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0;

const result = {
  ok: blocked === 0,
  tool: 'openspec-task-audit',
  tasksFile: path.relative(ROOT, TASKS_FILE),
  total,
  complete,
  partial,
  pending,
  blocked,
  percentComplete: `${percentComplete}%`,
  pendingItems: pendingItems.slice(0, 10),
  partialItems,
  blockedItems,
};

console.log(JSON.stringify(result, null, 2));

if (blocked > 0) {
  console.error(`\n❌ openspec-task-audit: ${blocked} blocked task(s) require Architect attention.`);
  process.exit(1);
}

console.error(`✅ openspec-task-audit: ${complete}/${total} tasks complete (${percentComplete}%), ${pending} pending (deferred), ${partial} partial`);
