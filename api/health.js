// api/health.js
// Dedicated lightweight health checker endpoint for UptimeRobot / uptime monitors

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  // Basic environment verification
  const sheetConfigured = Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);

  return res.status(200).json({
    status: 'ok',
    app: '4N Planet POS',
    timestamp,
    uptime_seconds: Math.floor(uptime),
    sheets_configured: sheetConfigured,
  });
}
