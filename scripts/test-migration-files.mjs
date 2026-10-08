import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { selectMigrationFiles } from "./migration-files.mjs";

const filenames = readdirSync("db/migrations");
const selected = selectMigrationFiles(filenames);
assert.ok(selected.length >= 15, "Expected at least 15 versioned migrations.");
assert.equal(selected[0], "0001_bootstrap.sql");
assert.ok(selected.includes("0015_control_settings.sql"));
assert.equal(selected.length, filenames.filter(name => name.endsWith(".sql")).length);
assert.deepEqual(selectMigrationFiles(["bad.sql", "0031_test.sql", "0016_more.sql", "0001_bootstrap.sql"]),
  ["0001_bootstrap.sql", "0016_more.sql", "0031_test.sql"]);
console.info("Migration discovery passed:", selected.length, "files.");
