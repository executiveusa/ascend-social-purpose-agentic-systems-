import { createRepositories } from '../index.js';
// ICM artifacts are file-backed by design (the ICM is a folder architecture).
// This repo indexes artifact *metadata* into the database for searchability.
export function icmRepo(repos = createRepositories()) {
  return {
    audit: repos.audit,
    indexArtifact: async (tenantId, artifact) => repos.audit.append(tenantId, {
      id: artifact.id,
      event: 'icm.artifact.indexed',
      actorId: artifact.actorId || null,
      payload: { stage: artifact.stage, filename: artifact.filename, path: artifact.path },
      createdAt: artifact.createdAt || new Date().toISOString()
    })
  };
}
