---
# Hook: Build Clippy App
# Purpose: Compile TypeScript and rebuild native modules for Electron
# Trigger: Manual - click to build when ready to test the app
# Prerequisites: npm install must have been run
# Note: electron-rebuild is needed for native modules like better-sqlite3

version: 1.0
trigger:
  type: manual
action:
  type: agent
  prompt: |
    Build Clippy 2.0 for running. Execute these commands:
    1. npm run build
    2. npx electron-rebuild
    Then confirm the build was successful.
    If there are TypeScript errors, list them.
---

# Build Clippy App

Manually triggered hook to compile TypeScript, copy assets, and rebuild native modules for Electron.

## What it does
1. Compiles TypeScript to JavaScript (`npm run build`)
2. Rebuilds native modules for Electron (`electron-rebuild`)
3. Reports any compilation errors

## Requirements
- `npm install` must have been run
- TypeScript and Electron dependencies installed

## When to use
- Before running the app with `npm start`
- After pulling new changes
- After modifying tsconfig.json
