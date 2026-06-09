export type RemoteChangeKind = 'unchanged' | 'modified' | 'trashed' | 'deleted' | 'access-revoked' | 'renamed';
export type LocalChangeKind = 'unchanged' | 'modified' | 'deleted' | 'new';
export type AccessRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface SyncFileState {
  docId: string;
  path: string;
  role: AccessRole;
  baseRevision: number;
  baseHash: string;
  lastMtime: number;
  lastSize: number;
}

export interface RemoteDocument {
  id: string;
  title: string;
  folderId: string | null;
  revision: number;
  contentHash: string;
  updatedAt: string;
  role: AccessRole;
  collaborationMode: 'http' | 'crdt';
}

export interface SyncStateIndex {
  schemaVersion: 1;
  deviceId: string;
  rootFolderId: string;
  vaultRoot: string;
  cursor: string | null;
  files: Record<string, SyncFileState>;
  ignoredPaths: string[];
  pendingPushes: string[];
}

export interface RemoteApi {
  getChanges(input: { folderId: string; since: string | null; limit?: number }): Promise<{
    cursor: string;
    hasMore: boolean;
    documents: Array<RemoteDocument & { change: string }>;
    folders: Array<{ id: string; name?: string; parentId?: string | null; change: string }>;
  }>;
  getDocument(id: string): Promise<RemoteDocument & { content: string }>;
  patchDocument(id: string, content: string, revision: number): Promise<{ revision: number; contentHash: string }>;
  applyText(id: string, content: string, baseHash: string): Promise<{ revision: number; contentHash: string }>;
}

export interface VaultFile {
  path: string;
  text: string;
  mtime: number;
  size: number;
}

export interface VaultFS {
  listMarkdownFiles(root: string): Promise<VaultFile[]>;
  read(path: string): Promise<string>;
  write(path: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface StateStore {
  loadIndex(): Promise<SyncStateIndex | null>;
  saveIndex(index: SyncStateIndex): Promise<void>;
  readBase(docId: string): Promise<string | null>;
  writeBase(docId: string, text: string): Promise<void>;
  deleteBase(docId: string): Promise<void>;
}

export interface Hasher {
  sha256(text: string): Promise<string>;
}

export interface Clock {
  now(): Date;
}
