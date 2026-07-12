/**
 * Pure alert-selection logic for the daily cron (ralplan DR-2/DR-3).
 *
 * Rule: for each product×type, an alert fires for every configured
 * threshold t with t >= daysLeft (i.e. "due") that has no alert_log entry
 * yet. All due-unsent thresholds are FOLDED into a single notification
 * (labeled with the current daysLeft) and logged together, so:
 *  - each (product, type, threshold, channel) is sent exactly once,
 *  - a missed cron run is caught up in full on the next run,
 *  - D-0 (daysLeft === 0) is an eligible day,
 *  - past deadlines (daysLeft < 0) never fire.
 */

export interface AlertProduct {
  id: string;
  title: string;
  warranty_end_date: string | null;
  refund_deadline: string | null;
}

export type AlertType = "warranty" | "refund";
export type AlertChannel = "email" | "telegram";

export interface SentRecord {
  product_id: string;
  type: AlertType;
  threshold_days: number;
  channel: AlertChannel;
}

export interface AlertAction {
  productId: string;
  productTitle: string;
  type: AlertType;
  deadline: string;
  daysLeft: number;
  /** All due-unsent thresholds folded into this single notification. */
  thresholds: number[];
}

export interface SelectAlertsInput {
  products: AlertProduct[];
  warrantyDaysBefore: number[];
  refundDaysBefore: number[];
  sent: SentRecord[];
  channel: AlertChannel;
  /** Whole days until deadline, computed by the caller (KST). */
  daysLeftOf: (deadline: string) => number;
}

export function selectAlerts(input: SelectAlertsInput): AlertAction[] {
  const { products, warrantyDaysBefore, refundDaysBefore, sent, channel, daysLeftOf } = input;

  const sentKeys = new Set(
    sent
      .filter((s) => s.channel === channel)
      .map((s) => `${s.product_id}|${s.type}|${s.threshold_days}`),
  );

  const actions: AlertAction[] = [];

  for (const product of products) {
    const targets: Array<[AlertType, string | null, number[]]> = [
      ["warranty", product.warranty_end_date, warrantyDaysBefore],
      ["refund", product.refund_deadline, refundDaysBefore],
    ];

    for (const [type, deadline, thresholds] of targets) {
      if (!deadline) continue;
      const daysLeft = daysLeftOf(deadline);
      if (daysLeft < 0) continue; // past deadline — never fire

      const due = thresholds.filter(
        (t) => t >= daysLeft && !sentKeys.has(`${product.id}|${type}|${t}`),
      );
      if (due.length === 0) continue;

      actions.push({
        productId: product.id,
        productTitle: product.title,
        type,
        deadline,
        daysLeft,
        thresholds: [...due].sort((a, b) => a - b),
      });
    }
  }

  // Most urgent first
  actions.sort((a, b) => a.daysLeft - b.daysLeft);
  return actions;
}
