import { cn, daysUntil } from "@/lib/utils";

type BadgeStatus = "safe" | "warning" | "expired" | "none";

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  safe: "bg-accent text-primary",
  warning: "bg-warning/15 text-warning",
  expired: "bg-destructive/10 text-destructive",
  none: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {label}
    </span>
  );
}

export function getWarrantyStatus(
  warrantyEndDate: string | null,
): { status: BadgeStatus; label: string } {
  if (!warrantyEndDate) return { status: "none", label: "보증 없음" };

  const days = daysUntil(warrantyEndDate);

  if (days < 0) return { status: "expired", label: "보증 만료" };
  if (days <= 30) return { status: "warning", label: `보증 D-${days}` };
  return { status: "safe", label: "보증 유효" };
}

export function getRefundStatus(
  refundDeadline: string | null,
): { status: BadgeStatus; label: string } {
  if (!refundDeadline) return { status: "none", label: "환불 없음" };

  const days = daysUntil(refundDeadline);

  if (days < 0) return { status: "expired", label: "환불 만료" };
  if (days <= 7) return { status: "warning", label: `환불 D-${days}` };
  return { status: "safe", label: "환불 가능" };
}
