import { createRepositories } from '../index.js';
export function contactsRepo(repos = createRepositories()) {
  return repos.contacts;
}
