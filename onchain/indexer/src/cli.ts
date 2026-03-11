import { SolazzoDb, formatSolHours, CONFIRMATION_DEPTH } from "./db";
import { ingestEvents, rebuildFromRawEvents } from "./ingest";

const DEFAULT_DB_PATH = "./solazzo-indexer.db";

function usage(): void {
  console.log(`
Solazzo Indexer CLI

Usage:
  ts-node src/cli.ts <command> [options]

Commands:
  leaderboard [--top N] [--db PATH]   Print top N wallets by points
  rebuild [--db PATH]                  Rebuild intervals + points from raw events
  status [--db PATH]                   Show DB status (cursor, counts)
  reset [--db PATH]                    Wipe all data (fresh start)

Options:
  --db PATH    SQLite database path (default: ${DEFAULT_DB_PATH})
  --top N      Number of leaderboard entries (default: 10)
  --now TS     Unix timestamp for "now" in points calc (default: current time)

Points format:
  Internally: lamport-seconds (lock_lamports * duration_seconds)
  Display: SOL-hours (lamport-seconds / 3.6e12)
  `);
}

function parseArgs(args: string[]): { command: string; flags: Record<string, string> } {
  const command = args[0] || "help";
  const flags: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return { command, flags };
}

function main(): void {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const dbPath = flags.db || DEFAULT_DB_PATH;

  if (command === "help" || command === "--help") {
    usage();
    return;
  }

  const db = new SolazzoDb(dbPath);

  try {
    switch (command) {
      case "leaderboard": {
        const top = parseInt(flags.top || "10", 10);
        const now = flags.now ? parseInt(flags.now, 10) : undefined;
        const board = db.getLeaderboard(top, now);

        if (board.length === 0) {
          console.log("No data. Ingest events first.");
          break;
        }

        console.log("");
        console.log("  Solazzo Points Leaderboard");
        console.log("  ─────────────────────────────────────────────────────────────");
        console.log(
          "  Rank  Wallet                                        SOL-hours"
        );
        console.log("  ─────────────────────────────────────────────────────────────");
        for (const entry of board) {
          const shortWallet =
            entry.wallet.slice(0, 4) + "…" + entry.wallet.slice(-4);
          console.log(
            `  #${entry.rank.toString().padStart(3)}  ${entry.wallet}  ${entry.solHours.padStart(12)}`
          );
        }
        console.log("  ─────────────────────────────────────────────────────────────");
        console.log(`  Points unit: lamport-seconds (1 SOL-hour = 3.6e12 lampsec)`);
        console.log("");
        break;
      }

      case "rebuild": {
        const result = rebuildFromRawEvents(db);
        db.recomputeWalletPoints();
        console.log("Rebuild complete:");
        console.log(`  Events replayed: ${result.eventsIngested}`);
        console.log(`  Intervals opened: ${result.intervalsOpened}`);
        console.log(`  Intervals closed: ${result.intervalsClosed}`);
        break;
      }

      case "status": {
        const cursor = db.getCursor();
        const eventCount = db.getRawEventCount();
        const intervals = db.getAllIntervals();
        const openIntervals = intervals.filter((i) => i.endTs === null);
        const closedIntervals = intervals.filter((i) => i.endTs !== null);
        const latestBlock = db.getLatestSlotBlock();
        const trackedSlots = db.getSlotBlockCount();
        const finalizedBoundary = db.getFinalizedBoundary();

        console.log("Solazzo Indexer Status:");
        console.log(`  DB path:            ${dbPath}`);
        console.log(`  Last processed slot: ${cursor.lastSlot}`);
        console.log(`  Raw events:         ${eventCount}`);
        console.log(`  Total intervals:    ${intervals.length}`);
        console.log(`  Open intervals:     ${openIntervals.length}`);
        console.log(`  Closed intervals:   ${closedIntervals.length}`);
        console.log("");
        console.log("  Finality:");
        console.log(`    Confirmation depth:  ${CONFIRMATION_DEPTH}`);
        console.log(`    Tracked slots:       ${trackedSlots}`);
        console.log(`    Latest seen slot:    ${latestBlock?.slot ?? "none"}`);
        console.log(`    Finalized boundary:  ${finalizedBoundary}`);
        break;
      }

      case "reset": {
        db.reset();
        console.log("Database reset. All data cleared.");
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        usage();
        process.exit(1);
    }
  } finally {
    db.close();
  }
}

main();
