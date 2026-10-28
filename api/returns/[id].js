// api/returns/[id].js
// GET /api/returns/:id — get return details and receipt data

import { readSheet, findOne } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);
  const id = req.query.id;

  if (!id) return fail(res, 'Return ID required', 400);

  const returns = await readSheet('Returns');
  const returnRecord = returns.find(
    (r) => r.return_id === id || r.return_number === id
  );

  if (!returnRecord) {
    return fail(res, 'Return record not found', 404);
  }

  // Parse items_json
  let itemsDetail = null;
  if (returnRecord.items_json) {
    try {
      itemsDetail = JSON.parse(returnRecord.items_json);
    } catch {
      itemsDetail = null;
    }
  }

  // Fetch original sale info
  let originalSale = null;
  if (returnRecord.original_sale_id) {
    originalSale = await findOne('Sales', 'sale_id', returnRecord.original_sale_id);
  }

  return ok(res, {
    return: {
      ...returnRecord,
      details: itemsDetail,
      original_sale: originalSale,
    },
  });
});
