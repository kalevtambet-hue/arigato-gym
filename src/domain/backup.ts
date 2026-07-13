import type { BackupPayload } from '../db/types';

export function serializeBackup(data: BackupPayload): BackupPayload {
  return structuredClone(data);
}
