import type { Config } from "drizzle-kit";

export default {
  schema: "./packages/db/schema.ts",
  out: "./packages/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/kinopro.db",
  },
} satisfies Config;
