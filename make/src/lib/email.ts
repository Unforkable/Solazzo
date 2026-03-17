import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Email delivery is disabled.");
  }
  _client = new Resend(apiKey);
  return _client;
}

function getFrom(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set. Example: Solazzo <notify@solazzo.fun>",
    );
  }
  return from;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getClient();
  const from = getFrom();

  const { error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
