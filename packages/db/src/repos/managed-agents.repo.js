import { createRepositories } from '../index.js';

export function managedAgentsRepo(repos = createRepositories()) {
  return repos.managedAgents;
}
