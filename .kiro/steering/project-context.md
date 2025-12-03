# Clippy Reloaded Project Context

## Hackathon Details
- **Event**: Kiroween 2025 (Kiro Hackathon)
- **Team**: Solo/Small team hackathon project
- **Demo**: Working prototype required

## Project Vision
Resurrect Microsoft's infamous Office Assistant as an agentic AI that actually helps users by executing tasks rather than just suggesting them. Transform Clippy from the most hated software mascot into a genuinely useful AI assistant.

## Kiro Features Used
- **Steering**: 3 docs (personality, project-context, tech-stack)
- **Specs**: 2 specs (clippy-mvp, browser-tab-detection)
- **Hooks**: 4 hooks (build, test, lint, format)
- **MCP Servers**: 3 servers (filesystem, terminal, browser)

## Key Differentiators from Original Clippy
- **Action-oriented**: Executes tasks instead of just offering suggestions
- **Context-aware**: Detects user frustration and understands what they're trying to accomplish
- **Self-aware personality**: Acknowledges past failures with humor
- **Non-intrusive**: Respects user flow state and only appears when genuinely helpful

## Rules That Cannot Be Broken
1. **Privacy First**: All data stays local - no cloud storage of user activity
2. **No Interruptions**: Never interrupt user flow state without explicit trigger
3. **Show Don't Tell**: Always show completed work, never just offer to help
4. **Self-Aware Humor**: Clippy must acknowledge its infamous past
5. **MCP Integration**: All actions must go through MCP servers for hackathon criteria

## Architecture
- Electron desktop app with transparent overlay
- Four core engines: Emotion Detector, Context Engine, Action Executor, Personality Engine
- MCP servers for filesystem, terminal, and browser integration
- SQLite for local data storage (privacy-first)

## Technical Decisions Rationale
- **Electron**: Only viable option for transparent overlay + system access on desktop
- **SQLite**: Zero-config, local-only storage aligns with privacy requirements
- **MCP SDK**: Required for hackathon, enables tool integration pattern
- **fast-check**: Property-based testing catches edge cases in emotion detection
- **TypeScript**: Type safety critical for complex state management across engines

## Tech Stack Summary
- TypeScript, Electron, React with Lottie animations
- better-sqlite3, MCP SDK, fast-check for testing
