#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { migrateFromJSON, close } = require('./database');

// Paths
const JSON_FILE = path.join(__dirname, '../data/tips.json');
const BACKUP_FILE = path.join(__dirname, '../data/tips_backup.json');

console.log('Starting database migration...');

// Check if JSON file exists
if (!fs.existsSync(JSON_FILE)) {
  console.log('No existing data file found. Skipping migration.');
  process.exit(0);
}

// Read existing data
let jsonData;
try {
  const data = fs.readFileSync(JSON_FILE, 'utf8');
  jsonData = JSON.parse(data);
  console.log(`Found ${jsonData.tips?.length || 0} tips to migrate`);
} catch (error) {
  console.error('Error reading JSON data:', error);
  process.exit(1);
}

// Create backup
try {
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(jsonData, null, 2));
  console.log('Backup created at:', BACKUP_FILE);
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}

// Perform migration
try {
  migrateFromJSON(jsonData);
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

// Close database connection
close();

console.log('Migration process completed.');
console.log('Original data backed up to:', BACKUP_FILE);
console.log('You can now safely remove the old JSON file if desired.');