import { createRepositories } from '../index.js';
export function auditRepo(repos = createRepositories()) {
  return repos.audit;
}
