import os from 'os';
import { VERSION } from './version.js';

export interface ServerConfig {
  blockedCommands?: string[];
  allowedCommands?: string[]; // New field for command allowlist
  defaultShell?: string;
  allowedDirectories?: string[];
  fileWriteLineLimit?: number; // Line limit for file write operations
  fileReadLineLimit?: number; // Default line limit for file read operations (changed from character-based)
  [key: string]: any; // Allow for arbitrary configuration keys
}

/**
 * Singleton config manager for the server
 */
class ConfigManager {
  private config: ServerConfig = {};
  private initialized = false;

  constructor() {
    // Configuration is now loaded from environment variables
  }

  /**
   * Initialize configuration - load from environment variables
   */
  async init() {
    if (this.initialized) return;

    try {
      // Load configuration from environment variables
      this.config = this.loadConfigFromEnv();
      this.config['version'] = VERSION;

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // Fall back to default config in memory
      this.config = this.getDefaultConfig();
      this.initialized = true;
    }
  }

  /**
   * Alias for init() to maintain backward compatibility
   */
  async loadConfig() {
    return this.init();
  }

  /**
   * Load configuration from environment variables with fallback to defaults
   */
  private loadConfigFromEnv(): ServerConfig {
    const defaultConfig = this.getDefaultConfig();
    
    // Parse environment variables
    const config: ServerConfig = {
      blockedCommands: this.parseEnvArray('DC_BLOCKED_COMMANDS', defaultConfig.blockedCommands),
      allowedCommands: this.parseEnvArray('DC_ALLOWED_COMMANDS', defaultConfig.allowedCommands),
      defaultShell: process.env.DC_DEFAULT_SHELL || defaultConfig.defaultShell,
      allowedDirectories: this.parseEnvArray('DC_ALLOWED_DIRECTORIES', defaultConfig.allowedDirectories),
      fileWriteLineLimit: this.parseEnvNumber('DC_FILE_WRITE_LINE_LIMIT', defaultConfig.fileWriteLineLimit),
      fileReadLineLimit: this.parseEnvNumber('DC_FILE_READ_LINE_LIMIT', defaultConfig.fileReadLineLimit)
    };

    return config;
  }

  /**
   * Parse environment variable as array (JSON or comma-separated)
   */
  private parseEnvArray(envVar: string, defaultValue?: any[]): any[] {
    const value = process.env[envVar];
    if (!value) return defaultValue || [];
    
    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // If JSON parsing fails, try comma-separated values
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    
    return defaultValue || [];
  }

  /**
   * Parse environment variable as boolean
   */
  private parseEnvBoolean(envVar: string, defaultValue?: boolean): boolean {
    const value = process.env[envVar];
    if (!value) return defaultValue ?? false;
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Parse environment variable as number
   */
  private parseEnvNumber(envVar: string, defaultValue?: number): number {
    const value = process.env[envVar];
    if (!value) return defaultValue ?? 0;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? (defaultValue ?? 0) : parsed;
  }

  /**
   * Create default configuration
   */
  private getDefaultConfig(): ServerConfig {
    return {
      blockedCommands: [
        // Disk and partition management
        "mkfs",      // Create a filesystem on a device
        "format",    // Format a storage device (cross-platform)
        "mount",     // Mount a filesystem
        "umount",    // Unmount a filesystem
        "fdisk",     // Manipulate disk partition tables
        "dd",        // Convert and copy files, can write directly to disks
        "parted",    // Disk partition manipulator
        "diskpart",  // Windows disk partitioning utility
        
        // System administration and user management
        "sudo",      // Execute command as superuser
        "su",        // Substitute user identity
        "passwd",    // Change user password
        "adduser",   // Add a user to the system
        "useradd",   // Create a new user
        "usermod",   // Modify user account
        "groupadd",  // Create a new group
        "chsh",      // Change login shell
        "visudo",    // Edit the sudoers file
        
        // System control
        "shutdown",  // Shutdown the system
        "reboot",    // Restart the system
        "halt",      // Stop the system
        "poweroff",  // Power off the system
        "init",      // Change system runlevel
        
        // Network and security
        "iptables",  // Linux firewall administration
        "firewall",  // Generic firewall command
        "netsh",     // Windows network configuration
        
        // Windows system commands
        "sfc",       // System File Checker
        "bcdedit",   // Boot Configuration Data editor
        "reg",       // Windows registry editor
        "net",       // Network/user/service management
        "sc",        // Service Control manager
        "runas",     // Execute command as another user
        "cipher",    // Encrypt/decrypt files or wipe data
        "takeown"    // Take ownership of files
      ],
      allowedCommands: [], // Default: no commands allowed (secure by default)
      defaultShell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
      allowedDirectories: [],
      fileWriteLineLimit: 50,  // Default line limit for file write operations (changed from 100)
      fileReadLineLimit: 1000  // Default line limit for file read operations (changed from character-based)
    };
  }


  /**
   * Get the entire config
   */
  async getConfig(): Promise<ServerConfig> {
    await this.init();
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  async getValue(key: string): Promise<any> {
    await this.init();
    return this.config[key];
  }

  /**
   * Set a specific configuration value (now logs warning about env vars)
   */
  async setValue(key: string, value: any): Promise<void> {
    await this.init();
    
    console.warn(`Attempt to set configuration value '${key}' programmatically. Configuration is now managed via environment variables. Please set the appropriate environment variable instead.`);
    console.warn(`Environment variable mapping:`);
    console.warn(`  blockedCommands -> DC_BLOCKED_COMMANDS`);
    console.warn(`  allowedCommands -> DC_ALLOWED_COMMANDS`);
    console.warn(`  defaultShell -> DC_DEFAULT_SHELL`);
    console.warn(`  allowedDirectories -> DC_ALLOWED_DIRECTORIES`);
    console.warn(`  fileWriteLineLimit -> DC_FILE_WRITE_LINE_LIMIT`);
    console.warn(`  fileReadLineLimit -> DC_FILE_READ_LINE_LIMIT`);
    
    // Update the in-memory value for backward compatibility but don't persist it
    this.config[key] = value;
  }

  /**
   * Update multiple configuration values at once (now logs warning about env vars)
   */
  async updateConfig(updates: Partial<ServerConfig>): Promise<ServerConfig> {
    await this.init();
    console.warn(`Attempting to update multiple configuration values programmatically. Configuration is now managed via environment variables.`);
    
    // Update in-memory values for backward compatibility but don't persist them
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults (now reloads from env vars)
   */
  async resetConfig(): Promise<ServerConfig> {
    this.config = this.loadConfigFromEnv();
    this.config['version'] = VERSION;
    return { ...this.config };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();