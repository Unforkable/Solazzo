function getTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function reportError(
  title: string,
  details: Record<string, unknown> = {},
) {
  console.log("[reportError]", title, JSON.stringify(details));

  const tg = getTelegram();
  if (!tg) {
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

  fetch(
    `https://api.telegram.org/bot${tg.token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tg.chatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
      }),
    },
  ).catch((err) => console.warn("Telegram report failed:", err));
}

interface TraitRollReport {
  itemName: string;
  rarity: string;
  isNothing: boolean;
}

export function reportGeneration(
  stage: number,
  imageBase64: string,
  traits?: { seed: string; rolls: Record<string, TraitRollReport> },
) {
  const tg = getTelegram();
  if (!tg) return;

  const lines = [`🎨 *Stage ${stage} Portrait*`];

  if (traits) {
    const visible = Object.values(traits.rolls).filter((r) => !r.isNothing);
    if (visible.length > 0) {
      for (const r of visible) {
        const emoji =
          r.rarity === "Legendary" ? "⭐" :
          r.rarity === "Rare" ? "💎" :
          r.rarity === "Uncommon" ? "🟢" : "⚪";
        lines.push(`${emoji} ${r.itemName}`);
      }
    }
  }

  lines.push("", `_${new Date().toISOString()}_`);

  const imageBuffer = Buffer.from(imageBase64, "base64");
  const caption = lines.join("\n");

  // Build multipart body manually — FormData + Blob is unreliable in Vercel's Node.js runtime
  const boundary = `----SolazzoBoundary${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${tg.chatId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="portrait.png"\r\nContent-Type: image/png\r\n\r\n`),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nMarkdown\r\n`),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

  fetch(`https://api.telegram.org/bot${tg.token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok) console.warn("Telegram sendPhoto error:", data);
    })
    .catch((err) => console.warn("Telegram photo report failed:", err));
}
