# Technology Stack Decisions

## Runtime

### Electron
- **Choice**: Cross-platform desktop app framework
- **Why**: Only viable option for transparent overlay windows + full system access
- **Alternatives Considered**: Tauri (no transparent overlay support), native apps (too much work for hackathon)

### Node.js
- **Choice**: Backend runtime for MCP servers and system integration
- **Why**: Required by MCP SDK, excellent for async I/O operations

## Frontend

### React
- **Choice**: UI component library
- **Why**: Fast development, excellent ecosystem, team familiarity
- **Alternatives Considered**: Vue, Svelte (less ecosystem support for Electron)

### Lottie
- **Choice**: Animation library for smooth Clippy animations
- **Why**: Vector-based animations scale perfectly, small file sizes, easy to customize
- **Alternatives Considered**: CSS animations (too limited), GIFs (poor quality at scale)

### TypeScript
- **Choice**: Type safety across the codebase
- **Why**: Complex state management across 4 engines requires type safety, catches bugs early
- **Strict Mode**: Enabled for maximum safety

## Data Storage

### better-sqlite3
- **Choice**: Fast, synchronous SQLite bindings
- **Why**: Zero-config, embedded database perfect for desktop apps
- **Alternatives Considered**: IndexedDB (async complexity), JSON files (no query support)

### Local-Only Architecture
- **Choice**: All data stays on user's machine
- **Why**: Privacy-first design, no cloud dependencies, works offline
- **What's Stored**: User preferences, interaction history, learned patterns

## Testing

### Jest
- **Choice**: Unit testing framework
- **Why**: Industry standard, excellent TypeScript support, fast

### fast-check
- **Choice**: Property-based testing library
- **Why**: Catches edge cases in emotion detection and context parsing
- **Configuration**: Minimum 100 iterations per property test
- **Key Properties Tested**: Emotion score bounds, context extraction consistency

## MCP Server Strategy

### Architecture
Three specialized MCP servers, each with focused responsibility:

1. **Filesystem Server** (`src/mcp-servers/filesystem/`)
   - File read/write operations
   - Directory management
   - Backup creation

2. **Terminal Server** (`src/mcp-servers/terminal/`)
   - Command execution
   - Output capture
   - Error handling

3. **Browser Server** (`src/mcp-servers/browser/`)
   - URL opening
   - Search queries
   - Documentation lookups

### Why Separate Servers
- **Security**: Each server has minimal permissions
- **Testability**: Isolated units are easier to test
- **Hackathon Criteria**: Demonstrates MCP integration patterns

## Code Quality

### ESLint
- TypeScript-specific rules enabled
- Strict configuration for consistency

### Prettier
- Automatic code formatting
- Consistent style across codebase

### TypeScript Strict Mode
- `strict: true` in tsconfig
- No implicit any, strict null checks
