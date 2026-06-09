import type { App } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';
import type InstaformatSyncPlugin from './main.js';

export interface InstaformatSyncSettings {
  serverUrl: string;
  token: string;
  rootFolderId: string;
  vaultRoot: string;
  intervalMinutes: number;
  viewerDocsMode: 'readonly' | 'skip';
  backupRetentionDays: number;
  dryRun: boolean;
}

export const DEFAULT_SETTINGS: InstaformatSyncSettings = {
  serverUrl: 'https://instaformat.com',
  token: '',
  rootFolderId: '',
  vaultRoot: 'Instaformat',
  intervalMinutes: 5,
  viewerDocsMode: 'readonly',
  backupRetentionDays: 14,
  dryRun: false,
};

export class InstaformatSyncSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: InstaformatSyncPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Instaformat Sync' });

    new Setting(containerEl)
      .setName('Server URL')
      .setDesc('Your Instaformat server, for example https://instaformat.com.')
      .addText((text) =>
        text
          .setPlaceholder('https://instaformat.com')
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value.replace(/\/$/, '');
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('API token')
      .setDesc('Create an Obsidian Sync token in Instaformat Studio.')
      .addText((text) =>
        text
          .setPlaceholder('if_...')
          .setValue(this.plugin.settings.token)
          .onChange(async (value) => {
            this.plugin.settings.token = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Server folder ID')
      .setDesc('The Instaformat folder subtree to sync.')
      .addText((text) =>
        text.setValue(this.plugin.settings.rootFolderId).onChange(async (value) => {
          this.plugin.settings.rootFolderId = value.trim();
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Vault subfolder')
      .setDesc('Local folder where synced Markdown files are stored.')
      .addText((text) =>
        text.setValue(this.plugin.settings.vaultRoot).onChange(async (value) => {
          this.plugin.settings.vaultRoot = value.trim() || 'Instaformat';
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Sync interval')
      .setDesc('Minutes between background sync cycles. Use 0 for manual sync only.')
      .addText((text) =>
        text.setValue(String(this.plugin.settings.intervalMinutes)).onChange(async (value) => {
          const parsed = Number(value);
          this.plugin.settings.intervalMinutes = Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
          await this.plugin.saveSettings();
          this.plugin.configureScheduler();
        }),
      );

    new Setting(containerEl)
      .setName('Dry run')
      .setDesc('Preview sync reports without applying changes.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.dryRun).onChange(async (value) => {
          this.plugin.settings.dryRun = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Validate server URL, token, and folder access.')
      .addButton((button) =>
        button.setButtonText('Test').onClick(async () => {
          await this.plugin.testConnection();
        }),
      );
  }
}
