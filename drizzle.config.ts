import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dialect: "postgresql", // Informujemy, że to Postgres
  schema: "./src/db/schema.ts", // Wskazujemy schemat
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Zaciągamy link z .env
  },
});