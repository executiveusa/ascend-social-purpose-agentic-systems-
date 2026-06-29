import { createRepositories } from '../index.js';

export function authRepo(repos = createRepositories()) {
  return {
    users: repos.users,
    memberships: repos.memberships,
    invites: repos.invites,
    sessions: repos.sessions,
    operatorKeys: repos.operatorKeys
  };
}
