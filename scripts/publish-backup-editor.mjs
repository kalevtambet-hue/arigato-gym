import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function copyBackupEditor(sourceDirectory, outputDirectory) {
  if (!existsSync(sourceDirectory)) {
    throw new Error(`Redaktori build puudub: ${sourceDirectory}`);
  }

  const targetDirectory = resolve(outputDirectory, 'editor');
  rmSync(targetDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  cpSync(sourceDirectory, targetDirectory, { recursive: true });
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const projectDirectory = resolve(dirname(scriptPath), '..');
  copyBackupEditor(
    resolve(projectDirectory, 'tools/backup-editor/dist'),
    resolve(projectDirectory, 'dist'),
  );
}
