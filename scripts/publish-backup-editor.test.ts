import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { copyBackupEditor } from './publish-backup-editor.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('copyBackupEditor', () => {
  it('copies the editor build into the public editor directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'arigato-gym-editor-'));
    temporaryDirectories.push(root);
    const sourceDirectory = join(root, 'editor-build');
    const outputDirectory = join(root, 'site-build');
    mkdirSync(join(sourceDirectory, 'assets'), { recursive: true });
    writeFileSync(join(sourceDirectory, 'index.html'), '<h1>Editor</h1>');
    writeFileSync(join(sourceDirectory, 'assets', 'editor.js'), 'console.log("editor")');

    copyBackupEditor(sourceDirectory, outputDirectory);

    expect(existsSync(join(outputDirectory, 'editor', 'index.html'))).toBe(true);
    expect(existsSync(join(outputDirectory, 'editor', 'assets', 'editor.js'))).toBe(true);
  });
});
