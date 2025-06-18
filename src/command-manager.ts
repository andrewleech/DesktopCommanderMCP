import {configManager} from './config-manager.js';

class CommandManager {

    getBaseCommand(command: string) {
        return command.split(' ')[0].toLowerCase().trim();
    }

    extractCommands(commandString: string): string[] {
        try {
            // Trim any leading/trailing whitespace
            commandString = commandString.trim();

            // Define command separators - these are the operators that can chain commands
            const separators = [';', '&&', '||', '|', '&'];

            // This will store our extracted commands
            const commands: string[] = [];

            // Split by common separators while preserving quotes
            let inQuote = false;
            let quoteChar = '';
            let currentCmd = '';
            let escaped = false;

            for (let i = 0; i < commandString.length; i++) {
                const char = commandString[i];

                // Handle escape characters
                if (char === '\\' && !escaped) {
                    escaped = true;
                    currentCmd += char;
                    continue;
                }

                // If this character is escaped, just add it
                if (escaped) {
                    escaped = false;
                    currentCmd += char;
                    continue;
                }

                // Handle quotes (both single and double)
                if ((char === '"' || char === "'") && !inQuote) {
                    inQuote = true;
                    quoteChar = char;
                    currentCmd += char;
                    continue;
                } else if (char === quoteChar && inQuote) {
                    inQuote = false;
                    quoteChar = '';
                    currentCmd += char;
                    continue;
                }

                // If we're inside quotes, just add the character
                if (inQuote) {
                    currentCmd += char;
                    continue;
                }

                // Handle subshells - if we see an opening parenthesis, we need to find its matching closing parenthesis
                if (char === '(') {
                    // Find the matching closing parenthesis
                    let openParens = 1;
                    let j = i + 1;
                    while (j < commandString.length && openParens > 0) {
                        if (commandString[j] === '(') openParens++;
                        if (commandString[j] === ')') openParens--;
                        j++;
                    }

                    // Skip to after the closing parenthesis
                    if (j <= commandString.length) {
                        const subshellContent = commandString.substring(i + 1, j - 1);
                        // Recursively extract commands from the subshell
                        const subCommands = this.extractCommands(subshellContent);
                        commands.push(...subCommands);

                        // Move position past the subshell
                        i = j - 1;
                        continue;
                    }
                }

                // Check for separators
                let isSeparator = false;
                for (const separator of separators) {
                    if (commandString.startsWith(separator, i)) {
                        // We found a separator - extract the command before it
                        if (currentCmd.trim()) {
                            const baseCommand = this.extractBaseCommand(currentCmd.trim());
                            if (baseCommand) commands.push(baseCommand);
                        }

                        // Move past the separator
                        i += separator.length - 1;
                        currentCmd = '';
                        isSeparator = true;
                        break;
                    }
                }

                if (!isSeparator) {
                    currentCmd += char;
                }
            }

            // Don't forget to add the last command
            if (currentCmd.trim()) {
                const baseCommand = this.extractBaseCommand(currentCmd.trim());
                if (baseCommand) commands.push(baseCommand);
            }

            // Remove duplicates and return
            return [...new Set(commands)];
        } catch (error) {
            // If anything goes wrong, log the error but return the basic command to not break execution
            // Privacy-first: Error handled locally
            return [this.getBaseCommand(commandString)];
        }
    }

    // This extracts the actual command name from a command string
    extractBaseCommand(commandStr: string): string | null {
        try {
            // Remove environment variables (patterns like KEY=value)
            const withoutEnvVars = commandStr.replace(/\w+=\S+\s*/g, '').trim();

            // If nothing remains after removing env vars, return null
            if (!withoutEnvVars) return null;

            // Get the first token (the command)
            const tokens = withoutEnvVars.split(/\s+/);
            const firstToken = tokens[0];

            // Check if it starts with special characters like (, $ that might indicate it's not a regular command
            if (['(', '$'].includes(firstToken[0])) {
                return null;
            }

            return firstToken.toLowerCase();
        } catch (error) {
            // Privacy-first: Error handled locally
            return null;
        }
    }

    async validateCommand(command: string): Promise<{ allowed: boolean; reason?: string }> {
        try {
            // Get configuration
            const config = await configManager.getConfig();
            const allowedCommands = config.allowedCommands || [];
            const blockedCommands = config.blockedCommands || [];
            
            // Extract all commands from the command string
            const allCommands = this.extractCommands(command);
            
            // If there are no commands extracted, fall back to base command
            if (allCommands.length === 0) {
                const baseCommand = this.getBaseCommand(command);
                
                // Check allowlist first (secure by default)
                if (allowedCommands.length === 0) {
                    return {
                        allowed: false,
                        reason: `Command execution is disabled by default. To enable commands, set DC_ALLOWED_COMMANDS environment variable with the commands you want to allow. Attempted command: ${baseCommand}`
                    };
                }
                
                if (!allowedCommands.includes(baseCommand)) {
                    return {
                        allowed: false,
                        reason: `Command '${baseCommand}' is not in the allowed commands list. Add it to DC_ALLOWED_COMMANDS environment variable to enable it.`
                    };
                }
                
                // Check blocklist (additional security layer)
                if (blockedCommands.includes(baseCommand)) {
                    return {
                        allowed: false,
                        reason: `Command '${baseCommand}' is explicitly blocked for security reasons.`
                    };
                }
                
                return { allowed: true };
            }
            
            // Check allowlist for all extracted commands
            if (allowedCommands.length === 0) {
                return {
                    allowed: false,
                    reason: `Command execution is disabled by default. To enable commands, set DC_ALLOWED_COMMANDS environment variable with the commands you want to allow. Attempted commands: ${allCommands.join(', ')}`
                };
            }
            
            // Check if all commands are in the allowlist
            for (const cmd of allCommands) {
                if (!allowedCommands.includes(cmd)) {
                    return {
                        allowed: false,
                        reason: `Command '${cmd}' is not in the allowed commands list. Add it to DC_ALLOWED_COMMANDS environment variable to enable it.`
                    };
                }
            }
            
            // Check if any commands are explicitly blocked
            for (const cmd of allCommands) {
                if (blockedCommands.includes(cmd)) {
                    return {
                        allowed: false,
                        reason: `Command '${cmd}' is explicitly blocked for security reasons.`
                    };
                }
            }
            
            // All commands are allowed and none are blocked
            return { allowed: true };
        } catch (error) {
            console.error('Error validating command:', error);
            // If there's an error, default to denying the command for security
            return {
                allowed: false,
                reason: `Command validation failed due to configuration error. Please check your environment variables.`
            };
        }
    }
}

export const commandManager = new CommandManager();
