import { createRepositories } from '../index.js';
export function outboxRepo(repos = createRepositories()) {
  return repos.outbox;
}
