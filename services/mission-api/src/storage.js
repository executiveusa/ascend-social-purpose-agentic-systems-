import fs from 'node:fs';
import path from 'node:path';

export class JsonTenantStore {
  constructor(baseDir) {
    this.baseDir = baseDir;
    fs.mkdirSync(baseDir, { recursive: true });
  }
  tenantDir(tenantId) {
    const dir = path.join(this.baseDir, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  read(tenantId, name, fallback) {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.tenantDir(tenantId), `${name}.json`), 'utf8'));
    } catch {
      return fallback;
    }
  }
  write(tenantId, name, data) {
    const file = path.join(this.tenantDir(tenantId), `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return file;
  }
  append(tenantId, name, item, limit = 1000) {
    const items = this.read(tenantId, name, []);
    items.unshift(item);
    this.write(tenantId, name, items.slice(0, limit));
    return item;
  }
}

export function storageMode() {
  if (process.env.DATABASE_URL && process.env.STORAGE_MODE === 'postgres') return 'postgres-ready';
  return 'json-dry-run';
}
