// scripts/initSheets.js
// Initializes all Google Sheets tabs with correct headers
// Run once: node scripts/initSheets.js

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
try {
  const envFile = readFileSync(path.join(__dirname, '../.env'), 'utf8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.substring(0, eq).trim();
    const value = trimmed.substring(eq + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
} catch {
  console.error('Could not load .env file.');
}

import { google } from 'googleapis';
import { SHEET_HEADERS } from '../api/lib/sheets.js';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
  console.error('\n❌ ERROR: GOOGLE_SHEETS_SPREADSHEET_ID not set in .env\n');
  process.exit(1);
}

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

async function getExistingSheets() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return res.data.sheets.map((s) => s.properties.title);
}

async function createSheet(title) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title },
        },
      }],
    },
  });
  console.log(`  ✅ Created sheet: ${title}`);
}

async function writeHeaders(sheetName, headers) {
  // Check if headers already exist
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:A1`,
  });

  if ((res.data.values || []).length > 0) {
    console.log(`  ⏩ Headers already set for: ${sheetName}`);
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });
  console.log(`  📋 Headers written for: ${sheetName} (${headers.length} columns)`);
}

async function formatHeaderRow(sheetName, columnCount) {
  const sheetsInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetObj = sheetsInfo.data.sheets.find((s) => s.properties.title === sheetName);
  if (!sheetObj) return;

  const sheetId = sheetObj.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Bold + background for header row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.063, green: 0.196, blue: 0.4 }, // dark navy
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
}

async function main() {
  console.log('\n🔧 4N Planet — Google Sheets Initializer');
  console.log('═'.repeat(50));
  console.log(`📊 Spreadsheet ID: ${SPREADSHEET_ID}\n`);

  const existing = await getExistingSheets();
  console.log(`Found ${existing.length} existing sheets: ${existing.join(', ')}\n`);

  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    if (!existing.includes(sheetName)) {
      await createSheet(sheetName);
    }
    await writeHeaders(sheetName, headers);
    await formatHeaderRow(sheetName, headers.length);
  }

  console.log('\n✅ All sheets initialized successfully!');
  console.log('\nNext step: Create the first admin account by running:');
  console.log('  node scripts/createAdmin.js\n');
}

main().catch((err) => {
  console.error('\n❌ Initialization failed:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
