---
# Hook: Lint Code
# Purpose: Run ESLint to check code quality and catch potential issues
# Trigger: Manual - click to run when you want to check code quality
# Prerequisites: npm install must have been run (eslint installed)
# Note: Uses .eslintrc.json config in project root

version: 1.0
trigger:
  type: manual
action:
  type: agent
  prompt: |
    Run ESLint to check code quality: npm run lint
    Report any issues found and suggest fixes.
    Focus on errors first, then warnings.
---

# Lint Code

Manually triggered hook to run ESLint and check for code quality issues.

## What it does
- Runs ESLint across the entire codebase
- Reports errors and warnings with file locations
- Suggests fixes for common issues

## Requirements
- `npm install` must have been run
- ESLint config at `.eslintrc.json`

## When to use
- Before committing code
- After major refactoring
- When reviewing code quality
