import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const client = postgres(process.env.DATABASE_URL);

// { schema } is used for relational queries
export const db = drizzle(client, { schema });
