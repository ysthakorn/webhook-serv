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
  const totalEvents = categories.reduce((total, [, events]) => total + events.length, 0);

  const categorySections = categories.length
    ? categories.map(([category, events]) => {
        const items = events
          .slice()
          .reverse()
          .map((event, index) => {
            const payloadText = event.payload === '' ? '(empty)' : event.payload;
            return `
              <article class="event">
                <div class="event-index">#${events.length - index}</div>
                <div class="event-content">
                  <div class="event-meta">
                    <span class="badge badge-source">${escapeHtml(event.source)}</span>
                    <span class="badge">${escapeHtml(event.method)}</span>
                    <time datetime="${escapeHtml(event.receivedAt)}">${escapeHtml(event.receivedAt)}</time>
                  </div>
                  <details>
                    <summary>View payload</summary>
                    <pre>${escapeHtml(payloadText)}</pre>
                  </details>
                </div>
              </article>
            `;
          })
          .join('');

        return `
          <section class="category-card">
            <div class="category-heading">
              <div>
                <p class="eyebrow">Category</p>
                <h2>${escapeHtml(category)}</h2>
              </div>
              <span class="count-pill">${events.length} ${events.length === 1 ? 'event' : 'events'}</span>
            </div>
            <div class="event-list">${items}</div>
          </section>
        `;
      }).join('')
    : `
      <div class="empty-state">
        <div class="empty-icon">⌁</div>
        <h2>No webhook events yet</h2>
        <p>Send your first request and it will appear here in real time.</p>
      </div>
    `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhook Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --background: #fafafa;
      --card: #ffffff;
      --foreground: #18181b;
      --muted: #71717a;
      --border: #e4e4e7;
      --accent: #18181b;
      --accent-soft: #f4f4f5;
      --success: #16a34a;
      --radius: 0.75rem;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--background);
      color: var(--foreground);
      font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .shell { max-width: 1120px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 3rem; }
    .brand { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; letter-spacing: -0.02em; }
    .brand-mark { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 0.5rem; background: var(--accent); color: white; font-size: 1.25rem; }
    .status { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--muted); font-size: 0.8125rem; }
    .status-dot { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: var(--success); box-shadow: 0 0 0 3px #dcfce7; }
    .hero { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
    .eyebrow { margin: 0 0 0.4rem; color: var(--muted); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    h1, h2, p { margin-top: 0; }
    h1 { margin-bottom: 0.65rem; font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; letter-spacing: -0.055em; }
    .hero-copy { max-width: 650px; margin: 0; color: var(--muted); font-size: 1rem; }
    .hero-copy code, code { padding: 0.15rem 0.35rem; border: 1px solid var(--border); border-radius: 0.35rem; background: var(--accent-soft); color: var(--foreground); font: 0.85em/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; min-width: 250px; }
    .stat-card { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: 0 1px 2px rgb(0 0 0 / 4%); }
    .stat-label { color: var(--muted); font-size: 0.75rem; }
    .stat-value { display: block; margin-top: 0.2rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.04em; }
    .category-card { overflow: hidden; margin-bottom: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: 0 1px 2px rgb(0 0 0 / 4%); }
    .category-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
    .category-heading .eyebrow { margin-bottom: 0.15rem; }
    h2 { margin-bottom: 0; font-size: 1rem; letter-spacing: -0.02em; }
    .count-pill, .badge { display: inline-flex; align-items: center; border-radius: 999px; background: var(--accent-soft); color: var(--muted); font-size: 0.75rem; font-weight: 600; }
    .count-pill { padding: 0.3rem 0.65rem; white-space: nowrap; }
    .event { display: flex; gap: 1rem; padding: 1rem 1.5rem; }
    .event + .event { border-top: 1px solid var(--border); }
    .event-index { width: 2rem; flex: 0 0 2rem; padding-top: 0.1rem; color: var(--muted); font: 0.75rem ui-monospace, SFMono-Regular, Menlo, monospace; }
    .event-content { min-width: 0; flex: 1; }
    .event-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .badge { padding: 0.25rem 0.55rem; }
    .badge-source { background: #ecfdf5; color: #047857; }
    time { color: var(--muted); font-size: 0.75rem; }
    details { margin-top: 0.75rem; }
    summary { width: fit-content; color: var(--muted); cursor: pointer; font-size: 0.8125rem; }
    summary:hover { color: var(--foreground); }
    pre { max-height: 260px; margin: 0.75rem 0 0; overflow: auto; padding: 0.9rem; border: 1px solid var(--border); border-radius: 0.5rem; background: #fafafa; color: #3f3f46; font: 0.75rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .empty-state { padding: 4rem 1.5rem; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--card); text-align: center; }
    .empty-icon { display: grid; width: 3rem; height: 3rem; place-items: center; margin: 0 auto 1rem; border-radius: 0.75rem; background: var(--accent-soft); font-size: 1.5rem; }
    .empty-state h2 { margin-bottom: 0.35rem; }
    .empty-state p { margin-bottom: 0; color: var(--muted); }
    @media (max-width: 700px) {
      .shell { padding-top: 1.25rem; }
      .topbar, .hero { align-items: flex-start; flex-direction: column; }
      .topbar { margin-bottom: 2rem; }
      .stats { width: 100%; min-width: 0; }
      .category-heading, .event { padding-left: 1rem; padding-right: 1rem; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">⌁</span><span>Webhook Console</span></div>
      <div class="status"><span class="status-dot"></span>Server is running</div>
    </header>
    <section class="hero">
      <div>
        <p class="eyebrow">Overview</p>
        <h1>Webhook activity</h1>
        <p class="hero-copy">Monitor incoming events by category. Send requests to <code>/webhook/&lt;source&gt;/&lt;category&gt;</code>.</p>
      </div>
      <div class="stats">
        <div class="stat-card"><span class="stat-label">Total events</span><strong class="stat-value">${totalEvents}</strong></div>
        <div class="stat-card"><span class="stat-label">Categories</span><strong class="stat-value">${categories.length}</strong></div>
      </div>
    </section>
    <section aria-label="Webhook categories">${categorySections}</section>
  </main>
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
