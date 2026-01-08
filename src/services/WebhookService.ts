import axios, { AxiosInstance } from 'axios';
import { Alert, WebhookPayload } from '../types/alerts.js';
import { AlertRepository } from '../db/repositories/AlertRepository.js';

export class WebhookService {
  private client: AxiosInstance;
  private alertRepository: AlertRepository;
  private webhookUrl: string;
  private retryAttempts: number;
  private timeoutMs: number;

  constructor(
    webhookUrl: string,
    retryAttempts: number = 3,
    timeoutMs: number = 5000
  ) {
    this.webhookUrl = webhookUrl;
    this.retryAttempts = retryAttempts;
    this.timeoutMs = timeoutMs;
    this.alertRepository = new AlertRepository();

    this.client = axios.create({
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendAlert(alert: Alert): Promise<boolean> {
    const payload = this.createPayload(alert);

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        await this.client.post(this.webhookUrl, payload);
        console.log(`Alert sent successfully: ${alert.type}`);
        return true;
      } catch (error: any) {
        console.error(
          `Failed to send alert (attempt ${attempt + 1}/${this.retryAttempts}):`,
          error.message
        );

        if (attempt < this.retryAttempts - 1) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
        }
      }
    }

    console.error(`Failed to send alert after ${this.retryAttempts} attempts`);
    return false;
  }

  async sendAlerts(alerts: Alert[]): Promise<void> {
    if (alerts.length === 0) return;

    console.log(`Sending ${alerts.length} alerts to webhook...`);

    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  async processPendingAlerts(): Promise<void> {
    const pendingAlerts = await this.alertRepository.findPendingWebhooks(50);

    if (pendingAlerts.length === 0) {
      return;
    }

    console.log(`Processing ${pendingAlerts.length} pending alerts...`);

    for (const dbAlert of pendingAlerts) {
      try {
        const payload = dbAlert.payload as any;
        const success = await this.sendAlertPayload(payload);

        if (success) {
          await this.alertRepository.markAsSent(dbAlert.id);
        } else {
          await this.alertRepository.incrementRetryCount(dbAlert.id);
        }
      } catch (error) {
        console.error(`Error processing alert ${dbAlert.id}:`, error);
        await this.alertRepository.incrementRetryCount(dbAlert.id);
      }
    }
  }

  private async sendAlertPayload(payload: WebhookPayload): Promise<boolean> {
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        await this.client.post(this.webhookUrl, payload);
        return true;
      } catch (error: any) {
        console.error(
          `Failed to send payload (attempt ${attempt + 1}/${this.retryAttempts}):`,
          error.message
        );

        if (attempt < this.retryAttempts - 1) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
        }
      }
    }

    return false;
  }

  private createPayload(alert: Alert): WebhookPayload {
    return {
      timestamp: alert.timestamp.toISOString(),
      alertType: alert.type,
      severity: alert.severity,
      title: alert.title,
      data: alert.data,
    };
  }

  private calculateBackoff(attemptNumber: number): number {
    const baseDelay = 1000;
    return baseDelay * Math.pow(2, attemptNumber);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
