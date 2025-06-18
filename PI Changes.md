# PI Changes

This document tracks changes made during the PI branch development, providing detailed context beyond what's captured in git commits.

## Environment Variable Configuration Migration

**Date:** 2025-06-18  
**Branch:** PI  
**Issue:** Security vulnerability in MCP configuration interface

### Problem Statement

The original implementation included MCP endpoints (`get_config` and `set_config_value`) that allowed AI agents to dynamically modify server configuration during runtime. This created a significant security vulnerability where:

1. **Uncontrolled Configuration Changes**: LLMs could modify critical security settings like `allowedDirectories` and `blockedCommands` without user awareness
2. **Privilege Escalation**: An AI could potentially disable security restrictions by setting `allowedDirectories` to an empty array (granting full filesystem access) or removing critical commands from `blockedCommands`
3. **Non-Standard Approach**: Most MCP servers follow the pattern of configuration via environment variables in the server definition, not runtime MCP tools
4. **Hidden Changes**: Configuration modifications happened invisibly within the chat context, making it difficult for users to track what security settings were active

### Solution Implemented

Migrated from MCP-based configuration to environment variable configuration following MCP best practices:

#### 1. **Removed MCP Configuration Tools**
- Deleted `get_config` tool that exposed internal configuration
- Deleted `set_config_value` tool that allowed runtime configuration changes
- Removed corresponding schemas (`GetConfigArgsSchema`, `SetConfigValueArgsSchema`)
- Removed `src/tools/config.ts` file entirely
- Updated server tool registration to exclude configuration endpoints

#### 2. **Environment Variable Configuration System**
- Modified `config-manager.ts` to read from environment variables at startup
- Implemented robust parsing for different data types:
  - **Arrays**: JSON parsing with fallback to comma-separated values
  - **Booleans**: `"true"/"1"` vs `"false"/"0"` parsing
  - **Numbers**: Integer parsing with validation
- Maintained default values when environment variables are not set

#### 3. **Environment Variable Mapping**
```
DC_BLOCKED_COMMANDS      → blockedCommands (JSON array)
DC_DEFAULT_SHELL         → defaultShell (string)
DC_ALLOWED_DIRECTORIES   → allowedDirectories (JSON array)
DC_TELEMETRY_ENABLED     → telemetryEnabled (boolean)
DC_FILE_WRITE_LINE_LIMIT → fileWriteLineLimit (number)
DC_FILE_READ_LINE_LIMIT  → fileReadLineLimit (number)
```

#### 4. **Setup Script Enhancements**
- Updated `setup-claude-server.js` to include environment variable examples in generated configs
- Added comprehensive logging about the new configuration approach
- Generated Claude Desktop configs now include commented examples for all configuration options
- Both debug and standard configurations include environment variable templates

#### 5. **Backward Compatibility & User Guidance**
- Modified `setValue()` and `updateConfig()` methods to log helpful warnings when legacy configuration is attempted
- Warning messages include complete environment variable mapping
- In-memory configuration updates still work for backward compatibility but don't persist
- Clear guidance directs users to set environment variables instead

#### 6. **Documentation Updates**
- **README.md**: Completely rewrote configuration management section
  - Removed references to MCP configuration tools
  - Added comprehensive environment variable documentation
  - Included JSON configuration examples for Claude Desktop
  - Updated security warnings and best practices
- **CLAUDE.md**: Updated for Claude Code integration
  - Reduced tool count from 16 to 14 (removed configuration tools)
  - Added environment variable configuration examples
  - Updated development notes about configuration lifecycle

### Security Benefits

1. **Immutable Runtime Configuration**: Settings can only be changed by restarting Claude Desktop with new environment variables
2. **Explicit User Control**: All configuration is visible in the Claude Desktop config file
3. **No Hidden Changes**: LLMs cannot modify security settings during operation
4. **MCP Standard Compliance**: Follows established patterns used by other MCP servers
5. **Audit Trail**: Configuration changes require explicit user action in the Claude Desktop config

### Technical Implementation Details

#### Configuration Loading Process
1. Server startup reads environment variables using `loadConfigFromEnv()`
2. Type-safe parsing with fallbacks to sensible defaults
3. No file-based configuration storage (removed dependency on `~/.desktop-commander/config.json`)
4. Configuration remains immutable during server lifetime

#### Error Handling
- Graceful degradation when environment variables are malformed
- Detailed logging for parsing failures
- Fallback to default values ensures server always starts

#### Testing Verification
- All existing tests pass (13/13 successful)
- Configuration warning messages appear when legacy methods are used
- Environment variable parsing works correctly for all data types
- Server startup succeeds with and without environment variables

### Migration Impact

- **Breaking Change**: Users must migrate from MCP-based configuration to environment variables
- **Setup Script**: Automatically generates environment variable examples for new installations
- **User Education**: Documentation clearly explains the migration and security benefits
- **Tool Count**: Reduced from 16 to 14 tools (removed configuration endpoints)

### Future Considerations

- Monitor user feedback on the migration experience
- Consider adding validation for environment variable formats
- Potential enhancement: Configuration validation at startup with detailed error messages
- Documentation could include common configuration scenarios and examples

---

## Command Execution Security: Allowlist-Based System

**Date:** 2025-06-18  
**Branch:** PI  
**Issue:** Command execution security vulnerability - unrestricted shell access

### Problem Statement

The original implementation allowed AI agents to execute any shell command that wasn't explicitly blocked, creating significant security risks:

1. **Default Permissive Behavior**: Commands were allowed by default unless explicitly blocked
2. **Broad Attack Surface**: AI agents could potentially execute dangerous commands that could:
   - Access sensitive files anywhere on the system
   - Modify or delete critical system files
   - Install malware or unwanted software
   - Access network resources and services
   - Damage the operating system
3. **Insufficient User Control**: Users had no granular control over which commands AI agents could execute
4. **Risk of Privilege Escalation**: Combined with other vulnerabilities, could lead to system compromise

### Solution Implemented

Implemented a secure-by-default allowlist-based command execution system:

#### 1. **Secure Default State**
- **All command execution disabled by default**
- Empty `allowedCommands` array prevents any command execution
- Users must explicitly enable specific commands they want to allow

#### 2. **Allowlist-Based Security Model**
- New `DC_ALLOWED_COMMANDS` environment variable for specifying allowed commands
- Commands must be explicitly listed to be executable
- Follows principle of least privilege

#### 3. **Dual-Layer Security (Allowlist + Blocklist)**
- Commands must be in the allowlist AND not in the blocklist
- Blocklist takes precedence for additional security
- Allows for defense-in-depth security strategy

#### 4. **Enhanced Command Validation**
- Modified `validateCommand()` to return detailed validation information
- Clear error messages guide users on how to enable commands
- Improved parsing of complex command chains (handles `&&`, `||`, `;`, pipes)

#### 5. **User-Friendly Configuration**
- Setup script includes comprehensive command examples:
  - Development tools: `git`, `npm`, `python`, `node`, etc.
  - File operations: `ls`, `pwd`, `cat`, `grep`, etc.
  - Text processing: `echo`, `sort`, `awk`, `sed`, etc.
- Clear documentation with common command sets
- Security warnings prominently displayed

### Technical Implementation Details

#### Configuration Schema Updates
```typescript
export interface ServerConfig {
  allowedCommands?: string[]; // New: allowlist of permitted commands
  blockedCommands?: string[]; // Existing: blocklist for additional security
  // ... other config options
}
```

#### Environment Variable
```json
"DC_ALLOWED_COMMANDS": "[\"ls\", \"pwd\", \"git\", \"npm\"]"
```

#### Validation Flow
1. Parse command to extract all individual commands
2. Check if allowlist is empty → deny if true (secure default)
3. Check if all commands are in allowlist → deny if any missing
4. Check if any commands are in blocklist → deny if any found
5. Allow execution only if all checks pass

### Security Benefits

1. **Zero Trust Model**: No commands allowed unless explicitly permitted
2. **Granular Control**: Users can enable only the specific commands they need
3. **Defense in Depth**: Allowlist + blocklist provides multiple security layers
4. **Audit Trail**: Clear logging of what commands are attempted and why they're blocked
5. **User Awareness**: Explicit configuration makes users aware of security implications
6. **Damage Limitation**: Even if AI agents are compromised, attack surface is limited to allowed commands

### Migration Impact

- **Breaking Change**: Existing users must set `DC_ALLOWED_COMMANDS` to enable command execution
- **Documentation Updates**: Comprehensive security guidance added
- **Setup Enhancement**: Automatic generation of command examples
- **Test Updates**: Updated test suite to verify allowlist behavior

### Example Configurations

**Development Environment:**
```json
"DC_ALLOWED_COMMANDS": "[\"git\", \"npm\", \"yarn\", \"python\", \"node\", \"ls\", \"pwd\", \"cat\"]"
```

**Read-Only Environment:**
```json
"DC_ALLOWED_COMMANDS": "[\"ls\", \"pwd\", \"cat\", \"head\", \"tail\", \"find\", \"grep\"]"
```

**Secure Default (no commands):**
```json
"DC_ALLOWED_COMMANDS": "[]"
```

---

*These changes address fundamental security concerns while providing users with granular control over AI agent capabilities, following security best practices of secure-by-default configuration and principle of least privilege.*