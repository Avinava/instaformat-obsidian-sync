# Instaformat Sync for Obsidian

Sync one Obsidian vault folder with one Instaformat Studio folder.

## What it does

- Pulls Markdown documents from a Studio folder into Obsidian.
- Sends local Markdown edits back to Instaformat with revision/hash checks.
- Keeps viewer documents readonly by default.
- Preserves local edits as conflicted copies when a merge is unsafe.
- Uses scoped API tokens so the plugin can be limited to one folder subtree.

## Setup

1. Open Instaformat Studio.
2. Go to API Tokens and choose the Obsidian Sync preset.
3. Select the Studio folder to sync and copy the token.
4. Install this plugin in Obsidian.
5. Open plugin settings and enter:
   - Server URL: `https://instaformat.com`
   - API token
   - Studio folder ID
   - Vault subfolder
6. Run Test connection, then Sync now.

## Beta install

Until the community plugin listing is approved, copy these files into:

```text
<vault>/.obsidian/plugins/instaformat-sync/
```

Required files:

- `manifest.json`
- `main.js`
- `styles.css`

## Safety notes

- First sync shows a preview before writing files.
- Backups are created before overwrites and deletes.
- Do not sync the same cloud-backed vault folder from two devices in v1.
- Attachments and binary files are ignored in v1.

## Troubleshooting

See https://instaformat.com/guides/obsidian-sync-troubleshooting.
