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

// ── Email templates ──────────────────────────────────────────────────

function launchEmail(): { subject: string; html: string; text: string } {
  return {
    subject: "Solazzo is live",
    html: `<p>The Solazzo Portrait Studio is now live.</p>
<p>Lock your SOL, get painted into five Baroque oil portraits, and join the collection.</p>
<p><a href="https://make.solazzo.fun">Open Studio</a></p>
<p style="color:#888;font-size:12px">You signed up for launch notifications at solazzo.fun.</p>`,
    text: `Solazzo is live.\n\nLock your SOL, get painted into five Baroque oil portraits, and join the collection.\n\nhttps://make.solazzo.fun\n\nYou signed up for launch notifications at solazzo.fun.`,
  };
}

function replacedEmail(slotId: number): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `Your Solazzo slot #${slotId} was displaced`,
    html: `<p>Your slot <strong>#${slotId}</strong> has been displaced by a higher-conviction holder.</p>
<p>Your full SOL principal is available for withdrawal.</p>
<p><a href="https://make.solazzo.fun/positions">View Positions</a> &middot; <a href="https://make.solazzo.fun/gallery">Gallery</a></p>
<p style="color:#888;font-size:12px">You signed up for slot replacement alerts at solazzo.fun.</p>`,
    text: `Your Solazzo slot #${slotId} was displaced by a higher-conviction holder.\n\nYour full SOL principal is available for withdrawal.\n\nhttps://make.solazzo.fun/positions\n\nYou signed up for slot replacement alerts at solazzo.fun.`,
  };
}

function claimableEmail(solAmount: number): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `${solAmount} SOL claimable on Solazzo`,
    html: `<p>You have <strong>${solAmount} SOL</strong> available to withdraw on Solazzo.</p>
<p><a href="https://make.solazzo.fun/positions">Withdraw now</a></p>
<p style="color:#888;font-size:12px">You signed up for claimable balance alerts at solazzo.fun.</p>`,
    text: `You have ${solAmount} SOL available to withdraw on Solazzo.\n\nhttps://make.solazzo.fun/positions\n\nYou signed up for claimable balance alerts at solazzo.fun.`,
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
          const email = launchEmail();
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
              const email = replacedEmail(slotId);
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
            const email = claimableEmail(
              parseFloat(solAmount.toFixed(4)),
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
