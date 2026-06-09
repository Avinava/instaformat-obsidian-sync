import type { Clock, Hasher, RemoteApi, StateStore, SyncStateIndex, VaultFS } from './types.js';

export interface SyncEngineDeps {
  remote: RemoteApi;
  vault: VaultFS;
  state: StateStore;
  hasher: Hasher;
  clock: Clock;
}

export interface SyncCycleOptions {
  rootFolderId: string;
  vaultRoot: string;
  dryRun?: boolean;
  limit?: number;
}

export interface SyncCycleReport {
  startedAt: string;
  finishedAt: string;
  pulledDocuments: number;
  hasMore: boolean;
  cursor: string;
}

function createInitialState(rootFolderId: string, vaultRoot: string): SyncStateIndex {
  return {
    schemaVersion: 1,
    deviceId: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    rootFolderId,
    vaultRoot,
    cursor: null,
    files: {},
    ignoredPaths: [],
    pendingPushes: [],
  };
}

export async function runSyncCycle(
  deps: SyncEngineDeps,
  options: SyncCycleOptions,
): Promise<SyncCycleReport> {
  const startedAt = deps.clock.now();
  const index =
    (await deps.state.loadIndex()) ?? createInitialState(options.rootFolderId, options.vaultRoot);

  const changes = await deps.remote.getChanges({
    folderId: options.rootFolderId,
    since: index.cursor,
    limit: options.limit,
  });

  if (!options.dryRun) {
    index.cursor = changes.cursor;
    await deps.state.saveIndex(index);
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: deps.clock.now().toISOString(),
    pulledDocuments: changes.documents.length,
    hasMore: changes.hasMore,
    cursor: changes.cursor,
  };
}
