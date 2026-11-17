#!/usr/bin/env node

/**
 * SHAHA ONE — Automated Backup, Verification & Disaster Recovery Script
 *
 * Usage:
 *   node scripts/backup-restore.mjs export      # Exports local stores and metadata
 *   node scripts/backup-restore.mjs verify <dir> # Verifies backup integrity
 *   node scripts/backup-restore.mjs list        # Lists available backups
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

const CRITICAL_FILES = [
  '.listings_store.json',
  '.users.json',
  '.audit_logs.json',
  '.admin_members.json',
  '.admin_auth.json',
  'firestore.rules',
  'firestore.indexes.json',
  'firebase-blueprint.json'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function calculateFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function createBackup() {
  ensureDir(BACKUPS_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.join(BACKUPS_DIR, `backup-${timestamp}`);
  ensureDir(targetDir);

  const manifest = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    files: {},
    totalItems: 0,
    status: 'success'
  };

  console.log(`[Backup] Initiating backup into: ${targetDir}`);

  for (const fileName of CRITICAL_FILES) {
    const srcPath = path.join(ROOT_DIR, fileName);
    const destPath = path.join(targetDir, fileName);

    if (fs.existsSync(srcPath)) {
      const stats = fs.statSync(srcPath);
      const sha256 = calculateFileSha256(srcPath);
      fs.copyFileSync(srcPath, destPath);

      let recordCount = 0;
      if (fileName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
          if (Array.isArray(parsed)) {
            recordCount = parsed.length;
          } else if (parsed && typeof parsed === 'object') {
            recordCount = Object.keys(parsed).length;
          }
        } catch {
          // not json array
        }
      }

      manifest.files[fileName] = {
        sizeBytes: stats.size,
        sha256,
        records: recordCount
      };
      manifest.totalItems += recordCount;
      console.log(`  ✓ Copied ${fileName} (${stats.size} bytes, ${recordCount} records)`);
    } else {
      console.log(`  - Skipped non-existent file: ${fileName}`);
    }
  }

  // Write manifest
  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Backup] Complete! Total records backed up: ${manifest.totalItems}`);
  return targetDir;
}

export function verifyBackup(targetDir) {
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`[Verify Error] Manifest missing in ${targetDir}`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  let allValid = true;

  console.log(`[Verify] Verifying backup from ${manifest.timestamp}...`);

  for (const [fileName, meta] of Object.entries(manifest.files)) {
    const filePath = path.join(targetDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ Missing file: ${fileName}`);
      allValid = false;
      continue;
    }

    const currentHash = calculateFileSha256(filePath);
    if (currentHash !== meta.sha256) {
      console.error(`  ✗ Hash mismatch on ${fileName}`);
      allValid = false;
    } else {
      console.log(`  ✓ Verified ${fileName} (SHA256: ${currentHash.substring(0, 12)}...)`);
    }
  }

  if (allValid) {
    console.log(`[Verify] All checksums match! Backup is 100% valid.`);
  }
  return allValid;
}

export function listBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('[List] No backups found.');
    return [];
  }
  const entries = fs.readdirSync(BACKUPS_DIR)
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse();

  console.log(`[List] Found ${entries.length} backup(s):`);
  entries.forEach(name => console.log(`  - ${name}`));
  return entries;
}

// CLI handler
const cmd = process.argv[2] || 'export';
if (cmd === 'export') {
  createBackup();
} else if (cmd === 'verify') {
  const target = process.argv[3] || listBackups()[0];
  if (target) {
    verifyBackup(path.isAbsolute(target) ? target : path.join(BACKUPS_DIR, target));
  } else {
    console.error('Please specify a backup directory to verify.');
  }
} else if (cmd === 'list') {
  listBackups();
}
