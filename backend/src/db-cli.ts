import { loadConfig } from "./config";
import { migrate } from "./migrate";
import { resetAndSeed } from "./store/prisma-store";

/** `npm run db:migrate` and `npm run db:seed` (reset to the demo data). */
const command = process.argv[2];
if (command === "migrate") {
  migrate();
} else if (command === "seed") {
  await resetAndSeed(loadConfig());
  console.log("Database reset to the demo data.");
} else {
  console.log("usage: tsx src/db-cli.ts migrate|seed");
  process.exit(1);
}
