import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { ConfigSchema, TrackedConfigSchema, Config, TrackedConfig } from '../config/schema.js';

export class ConfigService {
  private config: Config;
  private trackedConfig: TrackedConfig;

  constructor(
    configPath: string = process.env.CONFIG_PATH || './config/default.yml',
    trackedPath: string = process.env.TRACKED_PATH || './config/tracked.yml'
  ) {
    this.config = this.loadConfig(configPath);
    this.trackedConfig = this.loadTrackedConfig(trackedPath);
  }

  private loadConfig(path: string): Config {
    try {
      const fileContent = readFileSync(path, 'utf8');
      const rawConfig = load(fileContent);

      const interpolated = this.interpolateEnvVars(rawConfig);

      return ConfigSchema.parse(interpolated);
    } catch (error) {
      console.error(`Failed to load config from ${path}:`, error);
      throw error;
    }
  }

  private loadTrackedConfig(path: string): TrackedConfig {
    try {
      const fileContent = readFileSync(path, 'utf8');
      const rawConfig = load(fileContent);

      return TrackedConfigSchema.parse(rawConfig);
    } catch (error) {
      console.warn(`Failed to load tracked config from ${path}:`, error);
      return { accounts: [], markets: [] };
    }
  }

  private interpolateEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      const match = obj.match(/^\$\{([^}]+)\}$/);
      if (match) {
        const envVar = match[1];
        const value = process.env[envVar];
        if (!value) {
          throw new Error(`Environment variable ${envVar} is not set`);
        }
        return value;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateEnvVars(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  getConfig(): Config {
    return this.config;
  }

  getTrackedConfig(): TrackedConfig {
    return this.trackedConfig;
  }

  reloadTrackedConfig(path?: string): void {
    const trackedPath = path || process.env.TRACKED_PATH || './config/tracked.yml';
    this.trackedConfig = this.loadTrackedConfig(trackedPath);
    console.log('Tracked config reloaded');
  }
}
