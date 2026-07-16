#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const DB_URL = process.env.TARGET_DATABASE_URL;
const PRODUCTION_PROJECT_REF = "dtxbrnrpzepwoxooqwlj";
const DESTRUCTIVE_CONFIRMATION = "IMPORT_BACKUP_TO_NON_PRODUCTION";

function assertSafeTarget() {
  if (!DB_URL) {
    throw new Error("TARGET_DATABASE_URL puudub. Määra eraldi mitte-production andmebaasi ühendus.");
  }

  if (DB_URL.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("Import katkestati: see skript ei tohi kunagi production-andmebaasi muuta.");
  }

  if (process.env.CONFIRM_DESTRUCTIVE_IMPORT !== DESTRUCTIVE_CONFIRMATION) {
    throw new Error(
      `Import kustutab sihttabelite sisu. Jätkamiseks määra CONFIRM_DESTRUCTIVE_IMPORT=${DESTRUCTIVE_CONFIRMATION}.`,
    );
  }
}

function toSqlValue(value) {
  if (value === null) return "NULL";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return String(value);
}

async function importJSONFile(tableName, filePath, fieldMapping = {}) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    throw new Error(`Vigane tabeli nimi: ${tableName}`);
  }

  return new Promise((resolve, reject) => {
    console.log(`📥 Importing ${tableName}...`);

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log(`   Found ${data.length} records`);

    if (data.length === 0) {
      console.log("   ⚠️  No data to import");
      resolve(0);
      return;
    }

    const tempFile = `/tmp/${tableName}_${process.pid}_import.sql`;
    let sql = `BEGIN;\nTRUNCATE TABLE public.${tableName} CASCADE;\n`;

    for (const record of data) {
      const mappedRecord = {};
      for (const [key, value] of Object.entries(record)) {
        mappedRecord[fieldMapping[key] || key] = value;
      }

      const columns = Object.keys(mappedRecord);
      const values = columns.map((column) => toSqlValue(mappedRecord[column]));
      sql += `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});\n`;
    }

    sql += "COMMIT;\n";
    fs.writeFileSync(tempFile, sql, { mode: 0o600 });

    const psql = spawn("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-f", tempFile]);
    let error = "";

    psql.stderr.on("data", (chunk) => {
      error += chunk.toString();
    });

    psql.on("close", (code) => {
      fs.rmSync(tempFile, { force: true });

      if (code === 0) {
        console.log(`   ✅ Imported ${data.length} records`);
        resolve(data.length);
      } else {
        reject(new Error(error || `psql lõpetas koodiga ${code}`));
      }
    });
  });
}

async function main() {
  assertSafeTarget();

  console.log("🚀 Importing backup data to a non-production database...");
  console.log("========================================================");

  const backupDir = "production-backup";
  const files = fs.readdirSync(backupDir).filter((file) => file.endsWith(".json"));
  const fieldMappings = {
    "exercises.json": { title: "name" },
    "articles.json": { title: "name" },
  };
  const importOrder = [
    "user_roles.json",
    "profiles.json",
    "user_entitlements.json",
    "subscribers.json",
    "workout_templates.json",
    "template_days.json",
    "template_items.json",
    "client_programs.json",
    "client_days.json",
    "client_items.json",
    "exercises.json",
    "articles.json",
    "custom_habits.json",
    "user_streaks.json",
    "userprogress.json",
    "workout_sessions.json",
    "set_logs.json",
    "exercise_notes.json",
    "training_journal.json",
    "challenge_logs.json",
    "support_conversations.json",
    "support_messages.json",
    "booking_requests.json",
  ];

  let totalImported = 0;

  for (const filename of importOrder) {
    if (!files.includes(filename)) continue;

    const filePath = path.join(backupDir, filename);
    const tableName = filename.replace(".json", "");
    const fieldMapping = fieldMappings[filename] || {};
    totalImported += await importJSONFile(tableName, filePath, fieldMapping);
  }

  console.log("\n🎉 Non-production data import completed");
  console.log(`✅ Total records imported: ${totalImported}`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
