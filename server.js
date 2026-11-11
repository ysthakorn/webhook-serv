const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// In-memory webhook storage grouped by category.
const webhookByCategory = new Map();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);

      // Basic protection against oversized request bodies.
      const size = chunks.reduce((total, part) => total + part.length, 0);
      if (size > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function renderDashboard() {
  const categories = [...webhookByCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b));

  const categorySections = categories.length
    ? categories.map(([category, events]) => {
        const items = events
          .slice()
          .reverse()
          .map((event, index) => {
            const payloadText = event.payload === '' ? '(empty)' : event.payload;
            return `
              <li>
                <strong>#${events.length - index}</strong>
                <div>source: <code>${escapeHtml(event.source)}</code></div>
                <div>method: <code>${escapeHtml(event.method)}</code></div>
                <div>time: <code>${escapeHtml(event.receivedAt)}</code></div>
                <details>
                  <summary>payload</summary>
                  <pre>${escapeHtml(payloadText)}</pre>
                </details>
              </li>
            `;
          })
          .join('');

        return `
          <section>
            <h2>${escapeHtml(category)} <small>(${events.length})</small></h2>
            <ul>${items}</ul>
          </section>
        `;
      }).join('')
    : '<p>No webhook events yet.</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhook Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.4; }
    code { background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 4px; }
    section { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: 0.8rem; }
    pre { background: #fafafa; border: 1px solid #eee; padding: 0.7rem; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Webhook Dashboard</h1>
  <p>Send webhooks to <code>/webhook/&lt;source&gt;/&lt;category&gt;</code>, for example <code>/webhook/bot/m2</code>.</p>
  ${categorySections}
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && url.pathname === '/dashboard') {
      const html = renderDashboard();
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html),
      });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/dashboard.json') {
      const result = {};
      for (const [category, events] of webhookByCategory.entries()) {
        result[category] = events;
      }
      sendJson(res, 200, result);
      return;
    }

    if (parts.length === 3 && parts[0] === 'webhook') {
      const [, source, category] = parts;
      const payload = await readBody(req);

      if (!webhookByCategory.has(category)) {
        webhookByCategory.set(category, []);
      }

      webhookByCategory.get(category).push({
        source,
        method: req.method,
        payload,
        receivedAt: new Date().toISOString(),
      });

      sendJson(res, 200, {
        ok: true,
        category,
        totalInCategory: webhookByCategory.get(category).length,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      sendJson(res, 200, {
        message: 'Webhook server is running',
        webhookFormat: '/webhook/<source>/<category>',
        dashboard: '/dashboard',
        dashboardJson: '/dashboard.json',
      });
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (error) {
    if (error.message === 'Payload too large') {
      sendJson(res, 413, { error: error.message });
      return;
    }

    sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Webhook server listening on http://localhost:${PORT}`);
});
