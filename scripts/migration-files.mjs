export function selectMigrationFiles(names) {
  return names.filter(name => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
}
