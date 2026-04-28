# Obsidian Publish to Blog

Mark notes as publishable in Obsidian and auto-copy them to your blog folder. Supports Hexo auto-deploy.

## Features

- **Mark notes**: Add `publish: true` to frontmatter, or use the right-click menu / command palette
- **Auto sync**: Changed notes are automatically copied to your blog source folder on save
- **Auto deploy**: After a configurable buffer time with no further changes, automatically runs `hexo g -d` (or your custom deploy command)
- **Manual deploy**: Trigger deploy immediately via command palette
- **Preserves directory structure**: Vault folder hierarchy is mirrored in the blog folder

## Installation

1. Copy the plugin folder to `<vault>/.obsidian/plugins/obsidian-to-blog/`
2. Enable the plugin in Obsidian's Community Plugins settings
3. Configure the plugin settings (see below)

## Settings

| Setting | Description |
|---------|-------------|
| Blog folder path | Absolute path to your blog posts folder (e.g. `D:/my-blog/source/_posts/`) |
| Auto sync on save | Automatically copy publish-marked notes on save |
| Auto deploy | Automatically run deploy command after buffer period |
| Hexo root path | Absolute path to Hexo project root (where `_config.yml` lives) |
| Deploy command | Command to build and deploy (default: `hexo g -d`) |
| Buffer time (minutes) | Minutes to wait after last change before auto-deploy fires (1-60) |

## Usage

1. In any note's frontmatter, add `publish: true`:

```yaml
---
title: My Post
publish: true
---
```

2. Save the note — it will be automatically copied to the configured blog folder
3. After the buffer period expires with no further changes, the deploy command runs automatically
4. Use **Ctrl+P** → "Deploy blog now" to deploy immediately at any time

### Commands

| Command | Description |
|---------|-------------|
| Toggle publish for current note | Toggle the `publish` frontmatter flag |
| Sync all published notes to blog | Copy all publish-marked notes to the blog folder |
| Sync current note to blog | Copy the active note to the blog folder |
| Deploy blog now | Immediately run the deploy command |

### Right-click menu

Right-click any markdown file in the file explorer and select **Mark as publish** / **Unmark as publish**.

## License

MIT
