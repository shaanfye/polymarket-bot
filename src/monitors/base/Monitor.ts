import { Alert } from '../../types/alerts.js';

export interface Monitor {
  name: string;
  enabled: boolean;
  run(): Promise<Alert[]>;
}

export abstract class BaseMonitor implements Monitor {
  abstract name: string;
  enabled: boolean = true;

  abstract run(): Promise<Alert[]>;

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  protected error(message: string, error?: any): void {
    console.error(`[${this.name}] ${message}`, error);
  }
}
