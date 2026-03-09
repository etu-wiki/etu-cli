# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ETU CLI Dynamic is a local-first IIIF (International Image Interoperability Framework) solution. It converts images to IIIF-compatible format and launches a local HTTP server for viewing with IIIF-compatible viewers (Mirador 2/3, Universal Viewer 3/4). Optional cloud integration provides Level 2 IIIF Image API with serverless infrastructure.

## Build Commands

```bash
# Install all dependencies (root + app)
npm install

# Build the React frontend
cd app && npm run build

# Lint the frontend
cd app && npm run lint

# Run frontend dev server
cd app && npm run dev
```

## CLI Development

The CLI entry point is `bin/index.mjs`. To test CLI commands during development:

```bash
node bin/index.mjs <command>    # e.g., node bin/index.mjs init
```

Key CLI commands: `init`, `import`, `run`, `clean`, `login`, `logout`, `publish`, `delete`, `status`

## Architecture

```
bin/                    # CLI commands (ES Modules .mjs)
├── index.mjs          # Commander.js entry point
├── config.mjs         # AWS/IIIF configuration constants
├── account/           # login/logout commands
├── clean/             # clean command
├── import/            # image import command
├── init/              # project initialization
├── remote/            # publish/delete/status commands
├── run/               # server commands (node_srv.mjs)
└── utils/common.mjs   # shared utilities

app/                   # React frontend (TypeScript + Vite + MUI)
├── src/
│   ├── main.tsx       # React entry point
│   └── page.tsx       # Main UI component
└── dist/              # Built output

viewer/                # IIIF viewer bundles (m2, m3, u3, u4)
template/              # Mustache templates for manifest generation
cookbook/              # IIIF cookbook examples
```

## Key Technologies

- **CLI**: Commander.js, Sharp (image processing), serve-handler (HTTP)
- **Frontend**: React 18, TypeScript, Vite, Material-UI
- **Cloud**: AWS SDK (Cognito, S3, DynamoDB)
- **IIIF**: @etu-wiki/iiif-present-builder, Presentation API 2 & 3

## Workflow

**Local mode**: `etu init` → `etu import` → `etu run`

**Remote mode**: `etu login` → `etu import -r` → `etu publish` → `etu status` → `etu run`
