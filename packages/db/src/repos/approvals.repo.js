import { createRepositories } from '../index.js';
export function approvalsRepo(repos = createRepositories()) {
  return repos.approvals;
}
