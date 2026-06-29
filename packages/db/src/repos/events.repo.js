import { createRepositories } from '../index.js';

export function eventsRepo(repos = createRepositories()) {
  return repos.events;
}
