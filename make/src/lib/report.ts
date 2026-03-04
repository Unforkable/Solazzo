const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function reportError(
  title: string,
  details: Record<string, unknown> = {},
) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const lines = [
    `⚠️ *SOLAZZO ERROR*`,
    `*${title}*`,
    "",
    ...Object.entries(details).map(
      ([k, v]) => `${k}: \`${v instanceof Error ? v.message : String(v)}\``,
    ),
    "",
    `_${new Date().toISOString()}_`,
  ];

  // Fire-and-forget — don't await, don't block the response
  fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: lines.join("\n"),
        parse_mode: "Markdown",
      }),
    },
  ).catch((err) => console.warn("Telegram report failed:", err));
}
