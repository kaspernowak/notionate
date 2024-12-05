# 🔄 Notionate

Transform your GitHub documentation into beautiful Notion pages.

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue)]()
[![Notion Sync](https://img.shields.io/badge/Notion-Sync-black)]()
[![Documentation](https://img.shields.io/badge/Docs-Wiki-brightgreen)]()

GitHub Action for syncing repository documentation to Notion. Preserves structure and provides smart content updates.

## Features

- 📚 Maintain living documentation
- 🎯 Smart block-level sync
- 📁 Preserve directory structure
- ⚡ Efficient API usage
- 🔄 Continuous sync

## Usage

```yaml
name: Sync Documentation
on:
  push:
    paths:
      - 'docs/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: yourusername/notionate@v1
        with:
          source: './docs'
          notion_token: ${{ secrets.NOTION_TOKEN }}
          destination_id: ${{ secrets.NOTION_PAGE_ID }}
          destination_type: 'wiki'
```

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `source` | Source directory or file | Yes | - |
| `notion_token` | Notion API token | Yes | - |
| `destination_id` | Notion destination ID | Yes | - |
| `destination_type` | Type of destination (wiki/database/page) | No | `wiki` |
| `sync_strategy` | How to handle existing content | No | `merge` |

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Test: `npm test`

## License

MIT
