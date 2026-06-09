import type { AccessRole, LocalChangeKind, RemoteChangeKind } from './types.js';

export type SyncAction =
  | 'noop'
  | 'push'
  | 'create-remote'
  | 'overwrite-local'
  | 'merge'
  | 'conflict-copy'
  | 'delete-local'
  | 'trash-remote'
  | 'untrack'
  | 'redownload'
  | 'rename-local';

export interface ReconcileInput {
  remote: RemoteChangeKind;
  local: LocalChangeKind;
  role: AccessRole;
}

export interface ReconcileDecision {
  action: SyncAction;
  reason: string;
  requiresConfirmation?: boolean;
}

export function reconcile(input: ReconcileInput): ReconcileDecision {
  const canWrite = input.role === 'OWNER' || input.role === 'EDITOR';

  if (input.remote === 'access-revoked') {
    return input.local === 'modified'
      ? { action: 'untrack', reason: 'Access revoked with local edits; keep local file ignored.' }
      : { action: 'delete-local', reason: 'Access revoked; remove synced local copy.' };
  }

  if (input.remote === 'deleted' || input.remote === 'trashed') {
    if (input.local === 'modified') {
      return { action: 'untrack', reason: 'Remote deleted but local has edits; keep local ignored.' };
    }
    return { action: input.local === 'deleted' ? 'untrack' : 'delete-local', reason: 'Remote deletion wins.' };
  }

  if (input.local === 'new') {
    return canWrite
      ? { action: 'create-remote', reason: 'New local file in writable folder.' }
      : { action: 'delete-local', reason: 'Viewer folders are readonly locally.' };
  }

  if (input.local === 'deleted') {
    return canWrite
      ? { action: 'trash-remote', reason: 'Local delete maps to remote trash.', requiresConfirmation: true }
      : { action: 'redownload', reason: 'Viewer cannot delete remote document.' };
  }

  if (input.remote === 'renamed') {
    return { action: 'rename-local', reason: 'Remote path is source of truth for synced docs.' };
  }

  if (input.remote === 'modified' && input.local === 'modified') {
    return canWrite
      ? { action: 'merge', reason: 'Both sides changed; attempt 3-way merge.' }
      : { action: 'conflict-copy', reason: 'Viewer local edit conflicts with remote update.' };
  }

  if (input.remote === 'modified') {
    return { action: 'overwrite-local', reason: 'Remote content changed.' };
  }

  if (input.local === 'modified') {
    return canWrite
      ? { action: 'push', reason: 'Local content changed.' }
      : { action: 'redownload', reason: 'Viewer changes are reverted.' };
  }

  return { action: 'noop', reason: 'No changes detected.' };
}
