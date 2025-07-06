# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Tasks

- `pnpm install` - Install all dependencies for monorepo
- `pnpm build` - Build all packages in the monorepo
- `pnpm test` - Run all tests across the monorepo
- `pnpm lint` - Run ESLint across all packages
- `pnpm check-types` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier

### Extension Development

- `pnpm bundle` - Bundle the VSCode extension
- `pnpm vsix` - Create a .vsix package for manual installation
- `F5` in VSCode - Launch extension in new Development Host window

### Single Test Execution

- `cd src && npx vitest run path/to/test.spec.ts` - Run a specific test file
- `cd webview-ui && npx vitest run path/to/test.spec.tsx` - Run webview test

### Clean Commands

- `pnpm clean` - Clean all build artifacts and caches

## Architecture Overview

**Roo Code** is a VSCode extension that provides an AI-powered autonomous coding agent. The codebase is organized as a monorepo with multiple packages.

### Core Components

**Main Extension (src/)**

- `src/extension.ts` - Extension entry point, handles activation and initialization
- `src/core/webview/ClineProvider.ts` - Main provider managing the webview UI and task orchestration
- `src/core/task/Task.ts` - Core task execution engine handling AI conversations and tool usage
- `src/api/providers/` - AI provider implementations (Anthropic, OpenAI, etc.)
- `src/core/tools/` - Tool implementations (file operations, terminal commands, browser automation)

**Webview UI (webview-ui/)**

- React-based frontend providing the chat interface
- Built with Vite, TypeScript, and Tailwind CSS
- Communicates with extension via VSCode webview message passing

**Shared Packages (packages/)**

- `@roo-code/types` - Shared TypeScript type definitions
- `@roo-code/cloud` - Cloud service integration
- `@roo-code/telemetry` - Analytics and telemetry
- `@roo-code/ipc` - Inter-process communication

### Key Architectural Patterns

**Task-Based Execution**: The core `Task` class manages AI conversations, tool execution, and state persistence. Each user interaction creates or continues a task.

**Provider Architecture**: AI model interactions are abstracted through provider classes, supporting multiple AI services (Anthropic, OpenAI, Azure, local models, etc.).

**Tool System**: Extensible tool architecture allowing the AI to perform actions like file operations, terminal commands, and browser automation.

**MCP Integration**: Model Context Protocol support for extending capabilities with external tools and data sources.

**Webview Communication**: Extension backend and React frontend communicate via VSCode's webview message passing system.

### Directory Structure

```
src/
├── core/               # Core business logic
│   ├── task/          # Task execution engine
│   ├── tools/         # Available AI tools
│   ├── webview/       # Webview provider and messaging
│   └── prompts/       # System prompts and formatting
├── api/               # AI provider implementations
├── services/          # External service integrations
├── integrations/      # VSCode and system integrations
└── shared/            # Shared utilities and types

webview-ui/            # React frontend
├── src/components/    # React components
├── src/context/       # React context providers
└── src/utils/         # Frontend utilities

packages/              # Shared monorepo packages
```

### Testing Approach

- **Unit Tests**: Use Vitest for both backend (`src/`) and frontend (`webview-ui/`) testing
- **Integration Tests**: E2E tests in `apps/vscode-e2e/`
- **Mocks**: VSCode API mocked for testing (`src/__mocks__/vscode.js`)
- **Test Organization**: Tests located in `__tests__/` directories near source code

### Development Workflow

1. **Frontend Development**: Use `cd webview-ui && pnpm dev` for hot reloading
2. **Extension Development**: Use `F5` in VSCode to launch development instance
3. **Full Builds**: Use `pnpm build` at root for complete monorepo build
4. **Testing**: Use `pnpm test` for full test suite or target specific packages

### Key Configuration Files

- `turbo.json` - Defines build pipeline and task dependencies
- `pnpm-workspace.yaml` - Defines monorepo package structure
- `src/package.json` - Main extension manifest with VSCode contributions
- `webview-ui/package.json` - Frontend build configuration

### Published API for Task Automation

**Roo Code** exposes a programmatic API defined in `packages/types/src/api.ts` that allows external applications to start and control tasks. The API is implemented in `src/extension/api.ts`.

**Key API Methods:**

- `startNewTask({ configuration, text, images, newTab, customTools })` - Start a new task with optional configuration, initial message, images, and custom tool implementations
- `resumeTask(taskId)` - Resume an existing task by ID
- `sendMessage(message, images)` - Send a message to the current task
- `cancelCurrentTask()` - Cancel the currently running task
- `getConfiguration()` / `setConfiguration()` - Get/set extension configuration
- Profile management: `createProfile()`, `updateProfile()`, `setActiveProfile()`, etc.

**Event System:**
The API emits events for task lifecycle:

- `taskCreated`, `taskStarted`, `taskCompleted`, `taskAborted`
- `message` - For each AI message in the conversation
- `taskTokenUsageUpdated`, `taskToolFailed`

**Example Usage:**

```typescript
const taskId = await api.startNewTask({
	configuration: { mode: "Code", autoApprovalEnabled: true },
	text: "Create a new React component for user authentication",
	images: ["data:image/png;base64,..."], // Optional screenshots
})

// Listen for completion
api.on("taskCompleted", (taskId, tokenUsage, toolUsage) => {
	console.log(`Task ${taskId} completed`)
})
```

**Custom Tools:**
You can provide custom tool implementations when starting a task, allowing the AI to perform domain-specific operations:

```typescript
const customTool = {
	definition: {
		name: "database_query",
		description: "Execute SQL queries against the database",
		parameters: {
			type: "object",
			properties: {
				query: { type: "string", description: "SQL query to execute" },
			},
			required: ["query"],
		},
	},
	executor: async (params) => {
		// Your custom implementation
		return await executeQuery(params.query)
	},
}

const taskId = await api.startNewTask({
	configuration: { mode: "Code" },
	text: "Help me analyze user data from the database",
	customTools: [customTool],
})
```

**IPC Communication:**
The API supports inter-process communication via Unix sockets for external applications to control Roo Code programmatically.

### State Management

- **Global State**: Managed through `ClineProvider` and persisted via VSCode's global state
- **Task Persistence**: Conversation history and task state saved to filesystem
- **Settings**: Extension settings managed through VSCode's configuration system
- **Context Tracking**: File context and workspace state tracked for AI context
