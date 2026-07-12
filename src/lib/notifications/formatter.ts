import { escapeHtml } from "@/lib/escape-html";

interface AlertItem {
  productTitle: string;
  type: "warranty" | "refund";
  deadline: string;
  daysLeft: number;
}

function getUrgencyPrefix(daysLeft: number): string {
  if (daysLeft <= 3) return "[긴급]";
  if (daysLeft <= 7) return "[주의]";
  return "[알림]";
}

function getUrgencyEmoji(daysLeft: number): string {
  if (daysLeft <= 3) return "!!";
  if (daysLeft <= 7) return "!";
  return "";
}

export function formatEmailHtml(alerts: AlertItem[], email: string): string {
  const rows = alerts
    .map((a) => {
      const typeLabel = a.type === "warranty" ? "보증 만료" : "환불 마감";
      const prefix = getUrgencyPrefix(a.daysLeft);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${prefix} ${escapeHtml(a.productTitle)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${typeLabel}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${a.deadline}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${a.daysLeft}일 남음</td>
      </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#333">ASHD 기한 알림</h2>
      <p>안녕하세요, ${escapeHtml(email)}님!</p>
      <p>다음 제품의 기한이 임박했습니다:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">제품</th>
            <th style="padding:8px;text-align:left">유형</th>
            <th style="padding:8px;text-align:left">기한</th>
            <th style="padding:8px;text-align:left">남은 일수</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#888;font-size:12px">이 알림은 ASHD 서비스에서 자동 발송되었습니다.<br/>
      알림 수신을 원하지 않으시면 설정 페이지에서 변경해주세요.</p>
    </div>
  `;
}

export function formatTelegramMessage(alerts: AlertItem[]): string {
  const lines = alerts.map((a) => {
    const typeLabel = a.type === "warranty" ? "보증 만료" : "환불 마감";
    const urgency = getUrgencyEmoji(a.daysLeft);
    return `${urgency} <b>${escapeHtml(a.productTitle)}</b>\n   ${typeLabel}: ${a.deadline} (${a.daysLeft}일 남음)`;
  });

  return `<b>[ASHD 기한 알림]</b>\n\n${lines.join("\n\n")}\n\n---\n기한을 놓치지 않도록 확인해주세요.`;
}

export type { AlertItem };
