---
# Hook: Format Code
# Purpose: Auto-format code with Prettier for consistent style
# Trigger: Manual - click to format when code looks messy
# Prerequisites: npm install must have been run (prettier installed)
# Note: Uses .prettierrc config in project root

version: 1.0
trigger:
  type: manual
action:
  type: agent
  prompt: |
    Format the codebase with Prettier: npx prettier --write "src/**/*.{ts,tsx}"
    Report how many files were formatted.
---

# Format Code

Manually triggered hook to auto-format code with Prettier for consistent style.

## What it does
- Formats all TypeScript and TSX files in `src/`
- Applies consistent code style (indentation, quotes, semicolons, etc.)
- Reports number of files modified

## Requirements
- `npm install` must have been run
- Prettier config at `.prettierrc`

## When to use
- Before committing code
- After pasting code from external sources
- When code formatting looks inconsistent
