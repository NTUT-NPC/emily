import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

// { schema } is used for relational queries
export const db = drizzle(client, { schema });
