export function reportError(
  title: string,
  details: Record<string, unknown> = {},
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log("[reportError]", title, JSON.stringify(details));

  if (!token || !chatId) {
    console.warn("[reportError] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return;
  }

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
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
      }),
    },
  ).catch((err) => console.warn("Telegram report failed:", err));
}
