// One-time script: seed existing gallery entries with random conviction values
// Run with: npx tsx scripts/seed-conviction.ts

import { list, put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

async function main() {
  const { blobs } = await list({ prefix: "gallery-meta/", token });
  const metaBlobs = blobs.filter((b) => b.pathname.endsWith(".json"));

  console.log(`Found ${metaBlobs.length} gallery entries`);

  for (const blob of metaBlobs) {
    const res = await fetch(blob.url);
    const entry = await res.json();

    // Random conviction between 0.1 and 100, with 1 decimal
    const conviction = Math.round((Math.random() * 99.9 + 0.1) * 10) / 10;

    const updated = { ...entry, conviction };

    await put(blob.pathname, JSON.stringify(updated), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });

    console.log(`  ${entry.id}: ◎ ${conviction}`);
  }

  console.log("Done!");
}

main().catch(console.error);
