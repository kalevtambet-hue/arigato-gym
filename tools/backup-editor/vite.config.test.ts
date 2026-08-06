import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('backup editor Vite configuration', () => {
  it('builds assets for the public editor subpath', () => {
    const configSource = readFileSync(resolve('tools/backup-editor/vite.config.ts'), 'utf8');

    expect(configSource).toContain("base: '/editor/'");
  });
});
