import { put, list } from "@vercel/blob";

const PREFIX = "notify-deliveries/";

/**
 * Check if a delivery has already been made for the given event key.
 * Uses Blob listing by exact prefix match.
 */
export async function hasDelivery(eventKey: string): Promise<boolean> {
  const { blobs } = await list({ prefix: `${PREFIX}${eventKey}.json` });
  return blobs.length > 0;
}

/**
 * Record a delivery so the same event is never sent twice.
 */
export async function markDelivery(
  eventKey: string,
  payload: { email: string; subject: string; sentAt: number },
): Promise<void> {
  await put(`${PREFIX}${eventKey}.json`, JSON.stringify(payload), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
}
