export type AlertType =
  | 'VOLUME_OUTLIER'
  | 'ACCOUNT_ACTIVITY'
  | 'PROBABILITY_SHIFT'
  | 'NEW_ACCOUNT'
  | 'MARKET_UPDATE'
  | 'LARGE_TRADE'
  | 'WHALE_ACTIVITY';

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface WebhookPayload {
  timestamp: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  data: Record<string, unknown>;
}
