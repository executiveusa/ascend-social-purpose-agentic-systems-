import { createRepositories } from '../index.js';
export function crmRepo(repos = createRepositories()) {
  return { interactions: repos.interactions, pipeline: repos.pipeline, tasks: repos.tasks };
}
