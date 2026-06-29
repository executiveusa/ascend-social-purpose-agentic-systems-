import { createRepositories } from '../index.js';

export function artifactsRepo(repos = createRepositories()) {
  return repos.artifacts;
}
