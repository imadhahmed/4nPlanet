// server.js — Local development Express server for API routes
// This simulates the Vercel serverless environment locally.
// Usage: node server.js

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
try {
  const envFile = readFileSync(path.join(__dirname, '.env'), 'utf8');
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
  console.warn('[server] No .env file found. Ensure environment variables are set.');
}

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Route loader helper — maps /api/xxx to api/xxx/index.js
async function loadRoute(routePath) {
  try {
    const mod = await import(routePath);
    return mod.default;
  } catch (err) {
    return null;
  }
}
// Dynamic API routing
app.use('/api', async (req, res, next) => {
  const urlPath = req.path; // e.g., /auth/login
  const segments = urlPath.split('/').filter(Boolean);

  // Try exact match first: /api/auth/login -> api/auth/login.js or api/auth/login/index.js
  const candidates = [
    path.join(__dirname, 'api', ...segments) + '.js',
    path.join(__dirname, 'api', ...segments, 'index.js'),
  ];

  // Also handle :id segments: /api/sales/SALE-000001 -> api/sales/[id].js
  if (segments.length >= 2) {
    candidates.push(path.join(__dirname, 'api', segments[0], '[id].js'));
    candidates.push(path.join(__dirname, 'api', segments[0], segments[1], '[id].js'));
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    try {
      const fileUrl = pathToFileURL(candidate).href + `?t=${Date.now()}`;
      const mod = await import(fileUrl);
      const handler = mod.default;

      if (typeof handler === 'function') {
        const queryObj = { ...req.query };
        if (candidate.endsWith('[id].js') && segments.length >= 2) {
          queryObj.id = segments[1];
          if (segments.length >= 3) queryObj.action = segments[2];
        }
        Object.defineProperty(req, 'query', {
          value: queryObj,
          writable: true,
          configurable: true,
        });
        req.params = { ...req.params, id: queryObj.id, action: queryObj.action };
        return await handler(req, res);
      }
    } catch (err) {
      console.error(`[server] Handler error for ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: err.message || 'Internal handler error' });
      }
      return;
    }
  }

  next();
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.path}` });
});

// Serve frontend in production (when dist exists)
const distPath = path.join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 4N Planet server running at http://localhost:${PORT}`);
  if (existsSync(distPath)) {
    console.log(`   Serving production frontend from dist/`);
  } else {
    console.log(`   Frontend dev server: http://localhost:5173`);
  }
  console.log(`   Press Ctrl+C to stop\n`);
});
