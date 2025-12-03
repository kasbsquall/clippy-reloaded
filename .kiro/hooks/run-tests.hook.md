---
# Hook: Run Tests on Save
# Purpose: Automatically runs related tests when TypeScript files are modified
# Trigger: Fires on save of any .ts file in src/
# Prerequisites: npm install must have been run (jest + fast-check installed)
# Note: Uses Jest's --findRelatedTests to only run affected tests for speed

version: 1.0
trigger:
  type: onFileSave
  pattern: "src/**/*.ts"
action:
  type: agent
  prompt: |
    A TypeScript file was saved. Run the related tests to check for issues.
    Use: npm test -- --findRelatedTests ${filePath}
    If tests fail, summarize the failures briefly.
---

# Run Tests on Save

Automatically runs related tests when a TypeScript source file is saved.
This helps catch bugs early during development.

## What it does
- Triggers when any `.ts` file in `src/` is saved
- Runs only tests related to the changed file (fast feedback)
- Includes both unit tests (`.test.ts`) and property tests (`.property.ts`)

## Requirements
- `npm install` must have been run
- Jest and fast-check must be installed (see package.json)
