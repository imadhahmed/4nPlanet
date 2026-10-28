// api/lib/sheets.js
// Core Google Sheets API v4 repository layer
// All Sheets access goes through this file — never accessed directly from React

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import {
  readLocalSheet, writeLocalSheet, appendLocalRow,
  updateLocalRow, deleteLocalRow
} from './localData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env if process.env not set
try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.substring(0, eq).trim();
      const value = trimmed.substring(eq + 1).trim().replace(/^"|"$/g, '');
      if (!process.env[key]) process.env[key] = value;
    });
  }
} catch { /* ignore */ }

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID;

export function getSpreadsheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID;
}

export function isGoogleConfigured() {
  if (process.env.FORCE_LOCAL_DATA === 'true' || process.env.VITEST === 'true') {
    return false;
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = getSpreadsheetId();
  return Boolean(email && key && sheetId && !sheetId.includes('your_spreadsheet_id'));
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

// ─────────────────────────────────────────────
// SHEET DEFINITIONS — headers for each sheet
// ─────────────────────────────────────────────
export const SHEET_HEADERS = {
  Users: [
    'user_id', 'name', 'email', 'password_hash', 'role',
    'is_active', 'phone', 'created_at', 'updated_at', 'last_login',
  ],
  Products: [
    'product_id', 'name', 'brand_id', 'brand_name', 'category_id', 'category_name',
    'subcategory_id', 'subcategory_name', 'model', 'sku', 'barcode', 'description',
    'supplier_id', 'supplier_name', 'purchase_cost', 'retail_price', 'wholesale_price',
    'stock_quantity', 'min_stock_level', 'storage_location', 'image_url',
    'is_serialized', 'is_active', 'product_type',
    'ram', 'internal_storage', 'color', 'condition', 'warranty_duration',
    'network_config', 'created_at', 'updated_at',
  ],
  Serials: [
    'serial_id', 'product_id', 'imei1', 'imei2', 'serial_number',
    'condition', 'color', 'status', // available | sold | reserved | damaged | returned
    'purchase_id', 'sale_id', 'warranty_start', 'warranty_expiry',
    'created_at', 'updated_at',
  ],
  Categories: [
    'category_id', 'name', 'description', 'is_active', 'created_at', 'updated_at',
  ],
  Subcategories: [
    'subcategory_id', 'category_id', 'category_name', 'name', 'description',
    'is_active', 'created_at', 'updated_at',
  ],
  Brands: [
    'brand_id', 'name', 'description', 'is_active', 'created_at', 'updated_at',
  ],
  Suppliers: [
    'supplier_id', 'name', 'contact_person', 'phone', 'email', 'address',
    'notes', 'outstanding_balance', 'is_active', 'created_at', 'updated_at',
  ],
  Customers: [
    'customer_id', 'name', 'phone', 'email', 'address', 'customer_type',
    'notes', 'total_purchases', 'total_payments', 'outstanding_balance',
    'is_active', 'created_at', 'updated_at',
  ],
  Purchases: [
    'purchase_id', 'purchase_number', 'supplier_id', 'supplier_name',
    'purchase_date', 'subtotal', 'discount', 'additional_costs', 'total_cost',
    'amount_paid', 'outstanding_balance', 'payment_method', 'reference_number',
    'notes', 'status', // draft | confirmed | cancelled
    'created_by', 'created_at', 'updated_at',
  ],
  Purchase_Items: [
    'item_id', 'purchase_id', 'product_id', 'product_name',
    'serial_id', 'imei1', 'imei2', 'serial_number',
    'quantity', 'unit_cost', 'discount', 'total_cost',
    'created_at',
  ],
  Sales: [
    'sale_id', 'invoice_number', 'customer_id', 'customer_name',
    'cashier_id', 'cashier_name', 'sale_date', 'subtotal',
    'discount_amount', 'tax_amount', 'grand_total',
    'amount_paid', 'outstanding_balance', 'payment_status',
    // payment_status: paid | partial | unpaid
    'sale_status', // completed | cancelled | returned
    'notes', 'created_at', 'updated_at',
  ],
  Sale_Items: [
    'item_id', 'sale_id', 'product_id', 'product_name', 'model', 'brand',
    'serial_id', 'imei1', 'imei2', 'serial_number',
    'quantity', 'unit_price', 'discount', 'total_price',
    'purchase_cost', 'warranty_duration',
    'created_at',
  ],
  Payments: [
    'payment_id', 'payment_type', // customer_receipt | supplier_payment
    'related_id', // sale_id or purchase_id
    'party_id', 'party_name', 'party_type', // customer | supplier
    'amount', 'payment_method', // cash | card | bank_transfer | mobile_payment | split
    'reference_number', 'payment_date', 'notes',
    'recorded_by', 'idempotency_key', 'created_at',
  ],
  Expenses: [
    'expense_id', 'title', 'category', 'amount', 'expense_date',
    'payment_method', 'reference_number', 'notes',
    'recorded_by', 'created_at', 'updated_at',
  ],
  Stock_Movements: [
    'movement_id', 'product_id', 'product_name', 'serial_id',
    'movement_type', // purchase_in | sale_out | adjustment | return_in | damage | transfer
    'quantity_change', 'quantity_before', 'quantity_after',
    'related_id', 'related_type', // sale | purchase | adjustment | return
    'reason', 'notes', 'recorded_by', 'created_at',
  ],
  Warranties: [
    'warranty_id', 'product_id', 'product_name', 'serial_id', 'imei1',
    'customer_id', 'customer_name', 'sale_id', 'invoice_number',
    'sale_date', 'warranty_start', 'warranty_expiry', 'warranty_duration',
    'warranty_provider', 'status', // active | expired | claimed | void
    'notes', 'created_at', 'updated_at',
  ],
  Warranty_Claims: [
    'claim_id', 'warranty_id', 'product_name', 'imei1', 'customer_name',
    'claim_date', 'problem_description', 'resolution', 'status',
    'resolved_date', 'notes', 'recorded_by', 'created_at', 'updated_at',
  ],
  Repair_Jobs: [
    'job_id', 'job_number', 'customer_id', 'customer_name', 'customer_phone',
    'brand', 'model', 'imei', 'reported_problem', 'device_condition',
    'accessories_received', 'assigned_technician_id', 'assigned_technician_name',
    'diagnosis', 'estimated_cost', 'final_cost', 'labor_charges',
    'payment_status', // paid | partial | unpaid
    'status', // received | diagnosing | waiting_parts | in_progress | ready | collected | cancelled
    'date_received', 'expected_completion', 'completed_date',
    'notes', 'created_by', 'created_at', 'updated_at',
  ],
  Repair_Parts: [
    'part_id', 'job_id', 'product_id', 'product_name', 'serial_id',
    'quantity', 'unit_cost', 'total_cost', 'notes', 'created_at',
  ],
  Returns: [
    'return_id', 'return_number', 'original_sale_id', 'original_invoice',
    'customer_id', 'customer_name', 'return_type', 'return_date', 'reason',
    'product_id', 'product_name', 'quantity', 'unit_price', 'total_amount',
    'exchange_product_id', 'exchange_product_name', 'exchange_quantity', 'exchange_unit_price',
    'difference_amount',
    'payment_method',
    'refund_amount', 'refund_method', 'refund_reference',
    'stock_action', // restock | damaged | discard
    'status', // pending | approved | completed | rejected
    'processed_by', 'processed_by_name', 'items_json', 'notes', 'created_at', 'updated_at',
  ],
  Settings: [
    'key', 'value', 'description', 'updated_at', 'updated_by',
  ],
  Activity_Logs: [
    'log_id', 'user_id', 'user_name', 'action', 'entity_type',
    'entity_id', 'details', 'ip_address', 'created_at',
  ],
  OTP_Tokens: [
    'token_id', 'email', 'otp_hash', 'expires_at', 'used', 'created_at',
  ],
};

// ─────────────────────────────────────────────
// CORE REPOSITORY FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Read all rows from a sheet, returning array of objects keyed by header.
 */
export async function readSheet(sheetName, { skipHeader = true } = {}) {
  if (!isGoogleConfigured()) {
    return readLocalSheet(sheetName);
  }
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0];
  const dataRows = skipHeader ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

/**
 * Read a single record by matching a column value.
 */
export async function findOne(sheetName, column, value) {
  const rows = await readSheet(sheetName);
  return rows.find((r) => r[column] === value) || null;
}

/**
 * Read all records matching a column value.
 */
export async function findMany(sheetName, column, value) {
  const rows = await readSheet(sheetName);
  return rows.filter((r) => r[column] === value);
}

/**
 * Append a new row to a sheet. Record must be a flat object matching headers.
 */
export async function appendRow(sheetName, record) {
  if (!isGoogleConfigured()) {
    appendLocalRow(sheetName, record);
    return;
  }
  const headers = SHEET_HEADERS[sheetName];
  if (!headers) throw new Error(`No header definition for sheet: ${sheetName}`);

  const row = headers.map((h) => record[h] !== undefined ? String(record[h]) : '');

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

/**
 * Update a row in a sheet matching idColumn === idValue.
 * Returns true if found and updated, false if not found.
 */
export async function updateRow(sheetName, idColumn, idValue, updates) {
  if (!isGoogleConfigured()) {
    return updateLocalRow(sheetName, idColumn, idValue, updates);
  }
  const sheets = getSheetsClient();
  const headers = SHEET_HEADERS[sheetName];

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return false;

  const headerRow = rows[0];
  const idColIndex = headerRow.indexOf(idColumn);
  if (idColIndex === -1) throw new Error(`Column "${idColumn}" not found in sheet "${sheetName}"`);

  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idColIndex] === idValue);
  if (rowIndex === -1) return false;

  // Sheet rows are 1-indexed; row 0 is header, so data rows start at row index 2
  const sheetRowNumber = rowIndex + 1; // 1-indexed

  // Merge existing values with updates
  const existing = {};
  headerRow.forEach((h, i) => { existing[h] = rows[rowIndex][i] || ''; });
  const merged = { ...existing, ...updates };
  const newRow = (headers || headerRow).map((h) => merged[h] !== undefined ? String(merged[h]) : '');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${sheetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  });

  return true;
}

export async function deleteRow(sheetName, idColumn, idValue) {
  if (!isGoogleConfigured()) {
    return deleteLocalRow(sheetName, idColumn, idValue);
  }
  return softDelete(sheetName, idColumn, idValue);
}

/**
 * Logically delete by setting is_active = false, or hard delete row.
 * For audit safety, prefer soft deletes on transactional records.
 */
export async function softDelete(sheetName, idColumn, idValue) {
  return updateRow(sheetName, idColumn, idValue, { is_active: 'false', updated_at: new Date().toISOString() });
}

/**
 * Get total row count (excluding header).
 */
export async function getRowCount(sheetName) {
  const rows = await readSheet(sheetName);
  return rows.length;
}

/**
 * Generate a unique prefixed ID.
 * e.g. generateId('PROD') => 'PROD-000123'
 */
export async function generateId(prefix, sheetName, idColumn) {
  const rows = await readSheet(sheetName);
  const count = rows.length + 1;
  return `${prefix}-${String(count).padStart(6, '0')}`;
}

/**
 * Batch append multiple rows.
 */
export async function batchAppend(sheetName, records) {
  if (!records || records.length === 0) return;
  if (!isGoogleConfigured()) {
    const cur = readLocalSheet(sheetName);
    writeLocalSheet(sheetName, [...cur, ...records]);
    return;
  }
  const headers = SHEET_HEADERS[sheetName];
  if (!headers) throw new Error(`No header definition for sheet: ${sheetName}`);

  const rowValues = records.map((record) =>
    headers.map((h) => record[h] !== undefined ? String(record[h]) : '')
  );

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowValues },
  });
}

/**
 * Validate that a sheet has the correct headers. Useful for initialization checks.
 */
export async function validateHeaders(sheetName) {
  const sheets = getSheetsClient();
  const expected = SHEET_HEADERS[sheetName];
  if (!expected) return { valid: false, error: `No header definition for ${sheetName}` };

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });

  const actual = (res.data.values || [[]])[0] || [];
  const missing = expected.filter((h) => !actual.includes(h));
  return { valid: missing.length === 0, missing, actual };
}

/**
 * Write headers to a sheet (idempotent — only writes if headers not present).
 */
export async function ensureHeaders(sheetName) {
  const sheets = getSheetsClient();
  const expected = SHEET_HEADERS[sheetName];
  if (!expected) throw new Error(`No header definition for ${sheetName}`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:A1`,
  });

  const hasData = (res.data.values || []).length > 0;
  if (hasData) return; // Already has data, skip

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [expected] },
  });
}

export { SPREADSHEET_ID };
