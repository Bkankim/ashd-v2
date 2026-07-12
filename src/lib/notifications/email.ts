import { Resend } from "resend";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM ?? "ASHD <noreply@ashd.app>",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
