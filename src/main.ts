import {
  runSyncCycle,
  type Clock,
  type Hasher,
  type StateStore,
  type SyncStateIndex,
  type VaultFS,
} from '@instaformat/sync-core';
import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { InstaformatRemoteApi } from './adapters/remote-api.js';
import {
  DEFAULT_SETTINGS,
  InstaformatSyncSettingTab,
  type InstaformatSyncSettings,
} from './settings.js';

class ObsidianClock implements Clock {
  now(): Date {
    return new Date();
  }
}

class WebHasher implements Hasher {
  async sha256(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text.replace(/\r\n/g, '\n'));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

class PluginStateStore implements StateStore {
  constructor(private readonly plugin: Plugin) {}

  async loadIndex(): Promise<SyncStateIndex | null> {
    return (
      ((await this.plugin.loadData()) as { syncState?: SyncStateIndex } | null)?.syncState ?? null
    );
  }

  async saveIndex(index: SyncStateIndex): Promise<void> {
    const data = ((await this.plugin.loadData()) as Record<string, unknown> | null) ?? {};
    await this.plugin.saveData({ ...data, syncState: index });
  }

  async readBase(docId: string): Promise<string | null> {
    return (
      ((await this.plugin.loadData()) as { syncBases?: Record<string, string> } | null)
        ?.syncBases?.[docId] ?? null
    );
  }

  async writeBase(docId: string, text: string): Promise<void> {
    const data = ((await this.plugin.loadData()) as Record<string, unknown> | null) ?? {};
    const bases = (data.syncBases as Record<string, string> | undefined) ?? {};
    bases[docId] = text;
    await this.plugin.saveData({ ...data, syncBases: bases });
  }

  async deleteBase(docId: string): Promise<void> {
    const data = ((await this.plugin.loadData()) as Record<string, unknown> | null) ?? {};
    const bases = (data.syncBases as Record<string, string> | undefined) ?? {};
    delete bases[docId];
    await this.plugin.saveData({ ...data, syncBases: bases });
  }
}

class ObsidianVaultFS implements VaultFS {
  constructor(private readonly plugin: Plugin) {}

  async listMarkdownFiles(root: string) {
    const rootFolder = this.resolveRootFolder(root);
    if (!rootFolder) return [];

    const files = this.collectMarkdownFiles(rootFolder);
    return Promise.all(
      files.map(async (file) => ({
        path: file.path,
        text: await this.plugin.app.vault.read(file),
        mtime: file.stat.mtime,
        size: file.stat.size,
      })),
    );
  }

  async read(path: string): Promise<string> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error(`File not found: ${path}`);
    return this.plugin.app.vault.read(file);
  }

  async write(path: string, text: string): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) await this.plugin.app.vault.modify(file, text);
    else await this.plugin.app.vault.create(path, text);
  }

  async rename(from: string, to: string): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(from);
    if (!file) throw new Error(`File not found: ${from}`);
    await this.plugin.app.fileManager.renameFile(file, to);
  }

  async delete(path: string): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) await this.plugin.app.vault.delete(file);
  }

  async exists(path: string): Promise<boolean> {
    return this.plugin.app.vault.getAbstractFileByPath(path) !== null;
  }

  private resolveRootFolder(root: string): TFolder | null {
    if (!root) return this.plugin.app.vault.getRoot();
    const file = this.plugin.app.vault.getAbstractFileByPath(root);
    return file instanceof TFolder ? file : null;
  }

  private collectMarkdownFiles(folder: TFolder): TFile[] {
    const files: TFile[] = [];
    for (const child of folder.children) {
      if (child instanceof TFolder) files.push(...this.collectMarkdownFiles(child));
      else if (child instanceof TFile && child.extension === 'md') files.push(child);
    }
    return files;
  }
}

export default class InstaformatSyncPlugin extends Plugin {
  settings: InstaformatSyncSettings = DEFAULT_SETTINGS;
  private statusEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    const data = (await this.loadData()) as { settings?: Partial<InstaformatSyncSettings> } | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) };
    this.statusEl = this.addStatusBarItem();
    this.setStatus('paused');
    this.addSettingTab(new InstaformatSyncSettingTab(this.app, this));
    this.addCommand({
      id: 'sync-now',
      name: 'Sync now',
      callback: () => {
        void this.syncNow();
      },
    });
    this.addCommand({
      id: 'test-connection',
      name: 'Test connection',
      callback: () => {
        void this.testConnection();
      },
    });
    this.configureScheduler();
  }

  async saveSettings(): Promise<void> {
    const data = ((await this.loadData()) as Record<string, unknown> | null) ?? {};
    await this.saveData({ ...data, settings: this.settings });
  }

  configureScheduler(): void {
    if (this.settings.intervalMinutes <= 0) return;
    this.registerInterval(
      window.setInterval(() => {
        void this.syncNow();
      }, this.settings.intervalMinutes * 60_000),
    );
  }

  async testConnection(): Promise<void> {
    try {
      await this.remote().getChanges({
        folderId: this.settings.rootFolderId,
        since: null,
        limit: 1,
      });
      new Notice('Instaformat connection verified');
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Instaformat connection failed');
    }
  }

  async syncNow(): Promise<void> {
    if (!this.settings.token || !this.settings.rootFolderId) {
      new Notice('Configure Instaformat Sync first');
      return;
    }

    this.setStatus('syncing');
    try {
      const report = await runSyncCycle(
        {
          remote: this.remote(),
          vault: new ObsidianVaultFS(this),
          state: new PluginStateStore(this),
          hasher: new WebHasher(),
          clock: new ObsidianClock(),
        },
        {
          rootFolderId: this.settings.rootFolderId,
          vaultRoot: this.settings.vaultRoot,
          dryRun: this.settings.dryRun,
        },
      );
      this.setStatus('ok');
      new Notice(`Instaformat sync complete: ${report.pulledDocuments} remote changes`);
    } catch (error) {
      this.setStatus('warning');
      new Notice(error instanceof Error ? error.message : 'Instaformat sync failed');
    }
  }

  private remote(): InstaformatRemoteApi {
    return new InstaformatRemoteApi(this.settings.serverUrl, this.settings.token);
  }

  private setStatus(status: 'ok' | 'syncing' | 'warning' | 'paused'): void {
    if (!this.statusEl) return;
    const label =
      status === 'ok'
        ? 'Instaformat'
        : status === 'syncing'
          ? 'Instaformat syncing'
          : status === 'warning'
            ? 'Instaformat warning'
            : 'Instaformat paused';
    this.statusEl.setText(label);
  }
}
