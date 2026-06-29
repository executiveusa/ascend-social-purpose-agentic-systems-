import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { registerArtifact, getArtifacts } from '../src/artifacts.js';

const getDataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'mission-data');

describe('artifact registry', () => {
  const tenantId = 'test-tenant-artifacts';

  beforeEach(() => {
    const file = path.join(getDataDir(), tenantId, 'artifacts.json');
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  it('registers and retrieves artifacts, preventing traversal', () => {
    const artifact = registerArtifact({
      tenantId,
      kind: 'tenant-agent-pack',
      title: 'Demo Pack',
      storagePath: 'packs/demo-pnw.zip'
    });

    expect(artifact.id).toBeDefined();
    expect(artifact.tenantId).toBe(tenantId);
    expect(artifact.storagePath).toBe('packs/demo-pnw.zip');

    const list = getArtifacts({ tenantId, kind: 'tenant-agent-pack' });
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(artifact.id);

    // Traversal check
    expect(() => registerArtifact({
      tenantId,
      kind: 'leak',
      title: 'Leak File',
      storagePath: '../../etc/passwd'
    })).toThrow(/Directory traversal is prohibited/);
  });
});
