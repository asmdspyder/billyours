import fs from "fs";
import { neon } from "@neondatabase/serverless";

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

const sql = neon(url);

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS paid_setup_requests (
      id VARCHAR(64) PRIMARY KEY,
      plan VARCHAR(50) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      city VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  console.log("paid_setup_requests table created or verified successfully");
}

run().catch(console.error);
