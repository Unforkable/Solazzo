import { Connection, PublicKey } from "@solana/web3.js";
import { listNotifySubscribers } from "./notify-store";
import { hasDelivery, markDelivery } from "./notify-delivery-log";
import { sendEmail } from "./email";
import { listCollections, type GalleryEntry } from "./gallery-store";
import {
  fetchWalletPositions,
  fetchClaimableBalance,
} from "./onchain/client";
import { SOLANA_RPC_URL, SOL_DECIMALS } from "./onchain/constants";
import { createNotifyToken } from "./notify-token";
import { buildLaunchCopy, buildReplacedCopy, buildClaimableCopy } from "./notify-copy";

// ── Result types ─────────────────────────────────────────────────────

export interface DispatchResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
  details: string[];
}

// ── Idempotency key helpers ──────────────────────────────────────────

function launchKey(campaignId: string, email: string): string {
  return `${campaignId}__${email}`;
}

function replacedKey(wallet: string, slotId: number): string {
  return `replaced__${wallet}__slot-${slotId}`;
}

function claimableKey(
  wallet: string,
  lastUpdatedAt: bigint,
  claimableLamports: bigint,
): string {
  return `claimable__${wallet}__${lastUpdatedAt.toString()}_${claimableLamports.toString()}`;
}

// ── Email link helpers ───────────────────────────────────────────────

const BASE_URL = "https://make.solazzo.fun";
const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function emailFooter(email: string): { html: string; text: string } {
  const unsubToken = createNotifyToken(email, "unsubscribe", LINK_TTL_MS);
  const prefsToken = createNotifyToken(email, "preferences", LINK_TTL_MS);

  const unsubUrl = `${BASE_URL}/notifications/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const manageUrl = `${BASE_URL}/notifications/manage?token=${encodeURIComponent(prefsToken)}`;

  return {
    html: `<p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #333;padding-top:12px"><a href="${manageUrl}" style="color:#888">Manage preferences</a> &middot; <a href="${unsubUrl}" style="color:#888">Unsubscribe</a></p>`,
    text: `\n---\nManage preferences: ${manageUrl}\nUnsubscribe: ${unsubUrl}`,
  };
}

// ── Email composition ────────────────────────────────────────────────

function composeEmail(
  recipientEmail: string,
  copy: { subject: string; htmlBody: string; textBody: string },
): { subject: string; html: string; text: string } {
  const footer = emailFooter(recipientEmail);
  return {
    subject: copy.subject,
    html: `${copy.htmlBody}${footer.html}`,
    text: `${copy.textBody}${footer.text}`,
  };
}

// ── Main dispatch logic ──────────────────────────────────────────────

export async function runDispatch(): Promise<DispatchResult> {
  const result: DispatchResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const subscribers = await listNotifySubscribers();
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  // Pre-fetch gallery collections once for replaced detection
  let galleryEntries: GalleryEntry[] = [];
  try {
    galleryEntries = await listCollections();
  } catch {
    result.details.push("warn: failed to fetch gallery collections");
  }

  // Launch campaign gating
  const launchEnabled = process.env.NOTIFY_LAUNCH_ENABLED === "true";
  const campaignId = process.env.NOTIFY_LAUNCH_CAMPAIGN || "launch-v1";

  if (!launchEnabled) {
    result.details.push(`info: launch notifications disabled (campaign=${campaignId})`);
  }

  for (const sub of subscribers) {
    result.processed++;

    // A) Launch notification
    if (sub.notifyLaunch && launchEnabled) {
      try {
        const key = launchKey(campaignId, sub.email);
        if (await hasDelivery(key)) {
          result.skipped++;
        } else {
          const email = composeEmail(sub.email, buildLaunchCopy());
          await sendEmail({ to: sub.email, ...email });
          await markDelivery(key, {
            email: sub.email,
            subject: email.subject,
            sentAt: Date.now(),
          });
          result.sent++;
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `launch error [${sub.email.slice(0, 4)}...]: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }

    // B) Replaced notification
    if (sub.notifyReplaced && sub.wallet) {
      try {
        const wallet = new PublicKey(sub.wallet);

        // Historical slots: slots this wallet ever published to gallery
        const historicalSlots = new Set<number>();
        for (const entry of galleryEntries) {
          if (
            entry.wallet === sub.wallet &&
            typeof entry.slot === "number"
          ) {
            historicalSlots.add(entry.slot);
          }
        }

        // Active slots: currently on-chain
        const activePositions = await fetchWalletPositions(
          connection,
          wallet,
        );
        const activeSlots = new Set(activePositions.map((p) => p.slotId));

        // Replaced = historical minus active
        for (const slotId of historicalSlots) {
          if (activeSlots.has(slotId)) continue;

          const key = replacedKey(sub.wallet, slotId);
          try {
            if (await hasDelivery(key)) {
              result.skipped++;
            } else {
              const email = composeEmail(sub.email, buildReplacedCopy(slotId));
              await sendEmail({ to: sub.email, ...email });
              await markDelivery(key, {
                email: sub.email,
                subject: email.subject,
                sentAt: Date.now(),
              });
              result.sent++;
            }
          } catch (err) {
            result.errors++;
            result.details.push(
              `replaced error [${sub.email.slice(0, 4)}... slot#${slotId}]: ${err instanceof Error ? err.message : "unknown"}`,
            );
          }
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `replaced fetch error [${sub.email.slice(0, 4)}...]: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }

    // C) Claimable notification
    if (sub.notifyClaimable && sub.wallet) {
      try {
        const wallet = new PublicKey(sub.wallet);
        const cb = await fetchClaimableBalance(connection, wallet);

        if (cb && cb.claimableLamports > BigInt(0)) {
          const key = claimableKey(
            sub.wallet,
            cb.lastUpdatedAt,
            cb.claimableLamports,
          );

          if (await hasDelivery(key)) {
            result.skipped++;
          } else {
            const solAmount = Number(cb.claimableLamports) / SOL_DECIMALS;
            const email = composeEmail(
              sub.email,
              buildClaimableCopy(parseFloat(solAmount.toFixed(4))),
            );
            await sendEmail({ to: sub.email, ...email });
            await markDelivery(key, {
              email: sub.email,
              subject: email.subject,
              sentAt: Date.now(),
            });
            result.sent++;
          }
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `claimable error [${sub.email.slice(0, 4)}...]: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  }

  return result;
}
