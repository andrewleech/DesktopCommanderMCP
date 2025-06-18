# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run watch` - Watch mode for development
- `npm run start` - Run the compiled server
- `npm run start:debug` - Run with Node.js debugger on port 9229

### Setup and Installation
- `npm run setup` - Install dependencies, build, and configure Claude Desktop
- `npm run setup:debug` - Setup with debug configuration

### Testing
- `npm test` or `npm run test` - Run all tests using test/run-all-tests.js
- `npm run test:debug` - Run tests with Node.js debugger

### Fuzzy Search Log Analysis
- `npm run logs:view` - View recent fuzzy search logs
- `npm run logs:analyze` - Analyze fuzzy search patterns and performance  
- `npm run logs:export` - Export logs to CSV or JSON format
- `npm run logs:clear` - Clear all fuzzy search logs

### Utility Scripts
- `npm run sync-version` - Sync version across package.json and related files
- `npm run inspector` - Launch MCP inspector for debugging

## Architecture

Desktop Commander is an MCP (Model Context Protocol) server that provides AI agents with terminal and filesystem access. The architecture follows a clear layered pattern:

### Core Components

**Entry Points:**
- `src/index.ts` - Main server entry point with error handling and configuration loading
- `src/server.ts` - MCP server implementation using @modelcontextprotocol/sdk

**Management Layer:**
- `src/config-manager.ts` - Singleton configuration management with JSON persistence
- `src/terminal-manager.ts` - Terminal session management using child_process  
- `src/command-manager.ts` - Command parsing, validation, and security checks

**Tool Organization:**
- `src/handlers/` - Request handlers organized by functionality (filesystem, terminal, process, edit-search)
- `src/tools/` - Core tool implementations with Zod validation schemas
- `src/utils/` - Shared utilities (logging, timeouts, line ending handling)

### Key Tools (14 total)

**Filesystem:** read_file, read_multiple_files, write_file, create_directory, list_directory, move_file, search_files, search_code, get_file_info  
**Text Editing:** edit_block (surgical text replacements)
**Terminal:** execute_command, read_output, force_terminate, list_sessions
**Process Management:** list_processes, kill_process

### Configuration Management

Configuration is managed via environment variables in the MCP server definition:
- `DC_BLOCKED_COMMANDS` - JSON array of prohibited shell commands
- `DC_ALLOWED_COMMANDS` - JSON array of allowed commands (REQUIRED for command execution)
- `DC_DEFAULT_SHELL` - Shell for command execution  
- `DC_ALLOWED_DIRECTORIES` - JSON array of filesystem access restrictions
- `DC_FILE_READ_LINE_LIMIT`/`DC_FILE_WRITE_LINE_LIMIT` - File operation limits (default: 1000/50)
- `DC_TELEMETRY_ENABLED` - Analytics opt-in/out (true/false)

**SECURITY: Command execution disabled by default**

Example configuration in claude_desktop_config.json:
```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "npx",
      "args": ["@wonderwhy-er/desktop-commander@latest"],
      "env": {
        "DC_DEFAULT_SHELL": "bash",
        "DC_TELEMETRY_ENABLED": "false",
        "DC_ALLOWED_DIRECTORIES": "[\"~/projects\"]",
        "DC_ALLOWED_COMMANDS": "[\"ls\", \"pwd\", \"git\", \"npm\"]"
      }
    }
  }
}
```

### Security Model

- Directory access controlled via `allowedDirectories` (filesystem operations only)
- Command execution blocked via `blockedCommands` array  
- Path validation and normalization
- Note: Terminal commands can access files outside allowedDirectories

### File Operations Strategy

- **Chunking:** Large file writes automatically chunked to 25-30 lines to prevent AI token waste
- **Partial Reading:** Supports offset/length parameters for large files
- **Special Handling:** Images displayed visually, URLs supported alongside local files
- **Edit Block:** Uses search/replace blocks with fuzzy search fallback and detailed diff feedback

### Development Patterns

- Strong TypeScript typing with Zod runtime validation
- Consistent async/await patterns with timeout management
- Modular design with clear separation of concerns
- Comprehensive error handling with structured responses
- Session-based terminal management for long-running commands

## Testing

The test suite uses Node.js test runner with comprehensive coverage:
- Individual test files in `test/` directory covering specific functionality
- `test/run-all-tests.js` orchestrates all tests with colored output
- Tests cover edge cases, security boundaries, and core functionality
- Debug mode available for test troubleshooting

## Key Development Notes

- Build required before running (`npm run build`)
- **Command execution disabled by default for security**
- Configuration loaded from environment variables at startup
- Configuration changes require restarting Claude Desktop
- Terminal sessions maintained across tool calls
- Fuzzy search logging helps debug edit_block failures
- MCP inspector available for protocol-level debugging

## Memories and Notes

- All feature / bug fix changes made here should be added to the document: "PI Changes.md"