// Seeds the demo account: `npm run db:seed` (add `-- --reset` to also delete the
// demo account's other investigations). Reads .env.local / .env like the app.
// Override credentials with SEED_DEMO_EMAIL / SEED_DEMO_PASSWORD.
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { DEMO_DEFAULTS, seedDemo } from "@/lib/demo/seed";

for (const file of [".env.local", ".env"]) {
  // loadEnvFile never overrides variables already set in the shell.
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (shell, .env.local or .env).");
  const prisma = new PrismaClient();
  try {
    const result = await seedDemo(prisma, {
      email: process.env.SEED_DEMO_EMAIL,
      password: process.env.SEED_DEMO_PASSWORD,
      reset: process.argv.includes("--reset"),
    });
    console.log(`Seeded ${result.investigations.length} investigations for ${result.email} (removed ${result.removed}).`);
    console.table(result.investigations);
    console.log(`Screenshots: ${result.screenshots}`);
    for (const w of result.warnings) console.warn(`warning: ${w}`);
    console.log(`Log in as ${result.email} / ${process.env.SEED_DEMO_PASSWORD ? "(SEED_DEMO_PASSWORD)" : DEMO_DEFAULTS.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
