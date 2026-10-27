// api/settings/index.js
import { readSheet, updateRow, appendRow } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

// Default settings schema
const DEFAULT_SETTINGS = {
  shop_name: '4N Planet',
  shop_address: '',
  shop_phone: '',
  shop_email: '',
  shop_website: '',
  shop_logo_url: '',
  currency: 'LKR',
  currency_symbol: 'Rs.',
  timezone: 'Asia/Colombo',
  tax_enabled: 'false',
  tax_rate: '0',
  tax_label: 'VAT',
  receipt_footer: 'Thank you for shopping at 4N Planet!',
  warranty_disclaimer: 'Warranty covers manufacturing defects only.',
  low_stock_threshold: '5',
  allow_negative_stock: 'false',
  max_discount_percent: '20',
  manager_discount_limit: '30',
  invoice_prefix: 'INV',
  po_prefix: 'PO',
  job_prefix: 'JOB',
};

export default asyncHandler(async (req, res) => {

  if (req.method === 'GET') {
    requireAuth(req, 'settings.view');
    const rows = await readSheet('Settings');
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => { settings[r.key] = r.value; });
    return ok(res, { settings });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { user } = requireAuth(req, 'settings.edit');
    const updates = req.body;
    const rows = await readSheet('Settings');
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      const existing = rows.find((r) => r.key === key);
      if (existing) {
        await updateRow('Settings', 'key', key, { value: String(value), updated_at: now, updated_by: user.user_id });
      } else {
        await appendRow('Settings', {
          key,
          value: String(value),
          description: '',
          updated_at: now,
          updated_by: user.user_id,
        });
      }
    }

    return ok(res, {}, 'Settings updated');
  }

  return fail(res, 'Method not allowed', 405);
});
