<p align="center">
  <img src="https://img.shields.io/badge/Kiroween-2025-orange?style=for-the-badge" alt="Kiroween 2025"/>
  <img src="https://img.shields.io/badge/Category-Resurrection-purple?style=for-the-badge" alt="Resurrection"/>
  <img src="https://img.shields.io/badge/Built%20with-Kiro-blue?style=for-the-badge" alt="Built with Kiro"/>
</p>

# 📎 Clippy Reloaded

<h3 align="center">
  <em>"It looks like you're struggling. Let me actually help this time."</em>
</h3>

<p align="center">
  Clippy Reloaded resurrects Microsoft's infamous Office Assistant as an <strong>agentic AI</strong> that actually helps users by executing tasks rather than just suggesting them.
</p>

---

## 🏆 Kiro Hackathon Project

Built for **Kiroween 2025** demonstrating all Kiro features:

| Feature | Implementation |
|---------|----------------|
| **Steering** | 3 docs: personality, project-context, tech-stack |
| **Specs** | 2 specs: clippy-mvp, browser-tab-detection |
| **Hooks** | 4 hooks: build, test, lint, format |
| **MCP Servers** | 3 servers: filesystem, terminal, browser |

---

## ✨ Features

### Core Capabilities
- 🤖 **AI Chat** - GPT-powered responses with context awareness
- 🖥️ **Context Detection** - Knows what app/page you're viewing
- 💡 **Contextual Help** - Click "Help me!" for targeted assistance
- 🎭 **Self-Aware Personality** - Acknowledges past failures with humor
- 🔊 **Sound Effects** - Subtle audio feedback (toggleable)
- 📌 **System Tray** - Minimizes to tray, click to show/hide
- 💾 **Privacy First** - All data stored locally in SQLite

### Fun Stuff
- 🎲 **Fun Facts & Tips** - Productivity tips when idle
- 🥚 **Easter Egg** - Try typing "I hate Clippy"
- 💃 **Animations** - Wave, bounce, dance, spin, peek, and more

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([download](https://nodejs.org/))
- **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))
- **Windows 10/11** (macOS/Linux support coming soon)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/clippy-reloaded.git
cd clippy-reloaded

# 2. Install dependencies
npm install

# 3. Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" > .env
# Or manually create .env file and add: OPENAI_API_KEY=sk-...

# 4. Build the project
npm run build

# 5. Start Clippy Reloaded
npm start
```

### Troubleshooting
- **"Cannot find module"** - Run `npm install` again
- **"OPENAI_API_KEY not set"** - Make sure `.env` file exists with your key
- **Window doesn't appear** - Check system tray (bottom right on Windows)

---

## 🛠️ Development

```bash
npm run dev      # Build and start
npm test         # Run tests
npm run lint     # Run ESLint
npm run format   # Run Prettier
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
├─────────────┬─────────────┬─────────────┬───────────────┤
│   Window    │   Context   │   Action    │  Personality  │
│   Monitor   │   Engine    │  Executor   │    Engine     │
├─────────────┴─────────────┴─────────────┴───────────────┤
│                     AI Engine (GPT)                      │
├─────────────────────────────────────────────────────────┤
│                      SQLite DB                           │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │Filesystem│          │Terminal │          │ Browser │
    │MCP Server│          │MCP Server│         │MCP Server│
    └─────────┘          └─────────┘          └─────────┘
```

---

## 📁 Project Structure

```
.kiro/
├── steering/       # AI guidance docs
├── specs/          # Feature specifications
├── hooks/          # Automation hooks
└── settings/       # MCP configuration

src/
├── core/           # Core engines
├── mcp-servers/    # MCP integrations
├── main/           # Electron main process
├── renderer/       # UI (HTML/CSS/JS)
└── test-utils/     # Testing utilities
```

---

## 🧪 Testing

Property-based tests using **fast-check**:

```bash
npm test           # Run all tests
npm test -- --coverage  # With coverage
```

---

## 🎮 How to Use

1. **Start Clippy** - Run `npm start`
2. **Ask anything** - Type in the chat box
3. **Get contextual help** - Click "Help me!" while viewing any page
4. **Minimize** - Right-click → Minimize (goes to system tray)
5. **Restore** - Click the tray icon
6. **Toggle sounds** - Right-click → Sound: ON/OFF
7. **Easter egg** - Type "I hate Clippy" 😉

---

## 🔧 Configuration

Create a `.env` file:
```
OPENAI_API_KEY=your_api_key_here
```

---

## 📜 License

MIT

---

<p align="center">
  Built with 📎 and <a href="https://kiro.dev">Kiro</a> for Kiroween 2025
</p>
