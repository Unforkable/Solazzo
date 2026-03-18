/**
 * Centralized blob client options for notification storage.
 *
 * Uses a dedicated NOTIFY_BLOB_READ_WRITE_TOKEN in production to isolate
 * notification data in a private blob store. Falls back to the default
 * BLOB_READ_WRITE_TOKEN in local dev only.
 */

function resolveToken(): string {
  const dedicated = process.env.NOTIFY_BLOB_READ_WRITE_TOKEN;
  if (dedicated) return dedicated;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NOTIFY_BLOB_READ_WRITE_TOKEN is required in production. " +
        "Notification storage cannot fall back to the default blob token.",
    );
  }

  // Local dev fallback
  const fallback = process.env.BLOB_READ_WRITE_TOKEN;
  if (!fallback) {
    throw new Error(
      "Neither NOTIFY_BLOB_READ_WRITE_TOKEN nor BLOB_READ_WRITE_TOKEN is set.",
    );
  }
  return fallback;
}

/** Options to spread into every notify blob `put` call. */
export function notifyPutOptions() {
  return {
    access: "private" as const,
    token: resolveToken(),
    contentType: "application/json",
    addRandomSuffix: false,
  };
}

/** Options to spread into every notify blob `list` call. */
export function notifyListOptions() {
  return {
    token: resolveToken(),
  };
}

/** Auth headers for reading private blob object URLs via fetch(). */
export function notifyReadHeaders() {
  return {
    Authorization: `Bearer ${resolveToken()}`,
  };
}
