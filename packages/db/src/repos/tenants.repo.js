// tenants.repo — thin facade over the repository bundle's tenant namespace.
// Kept as a separate file per the P0-2 spec; delegates to createRepositories().
import { createRepositories } from '../index.js';
export function tenantsRepo(repos = createRepositories()) {
  return repos.tenant;
}
