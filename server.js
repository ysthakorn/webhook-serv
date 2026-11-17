const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// --- Paths & Files ---
const ENV_FILE = path.join(__dirname, '.env');
const DATA_FILE = path.join(__dirname, 'groups.json');
const BOTS_FILE = path.join(__dirname, 'bots.json');

// --- Environment Variable Loader ---
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const equalIdx = trimmed.indexOf('=');
        if (equalIdx > 0) {
          const key = trimmed.slice(0, equalIdx).trim();
          let val = trimmed.slice(equalIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
    } catch (err) {
      console.error('Failed to parse .env file:', err.message);
    }
  }
}

function updateEnv(key, value) {
  process.env[key] = value;
  let lines = [];
  if (fs.existsSync(ENV_FILE)) {
    lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  }
  let found = false;
  const newLines = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  fs.writeFileSync(ENV_FILE, newLines.filter(Boolean).join('\n') + '\n', 'utf8');
}

loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
let targetGroups = parseInt(process.env.TARGET_GROUPS || '91', 10);

// --- Bots Store (Supports 91 Bots Dynamically) ---
let botsList = [];

function initDefaultBots(count = 91) {
  const defaults = [];
  for (let i = 1; i <= count; i++) {
    defaults.push({
      id: `bot${i}`,
      name: `Bot ${i}`,
      displayName: `Bot ${i}`,
      token: i === 1 ? (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim() : '',
      userId: '',
      pictureUrl: '',
      status: i === 1 && process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'configured' : 'no_token',
    });
  }
  return defaults;
}

function loadBots() {
  if (fs.existsSync(BOTS_FILE)) {
    try {
      const raw = fs.readFileSync(BOTS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure at least targetGroups bots exist
        const map = new Map(parsed.map((b) => [b.id, b]));
        const count = Math.max(targetGroups, parsed.length);
        const merged = [];
        for (let i = 1; i <= count; i++) {
          const id = `bot${i}`;
          if (map.has(id)) {
            merged.push(map.get(id));
          } else {
            merged.push({
              id,
              name: `Bot ${i}`,
              displayName: `Bot ${i}`,
              token: '',
              userId: '',
              pictureUrl: '',
              status: 'no_token',
            });
          }
        }
        botsList = merged;
        return;
      }
    } catch (err) {
      console.error('Failed to load bots.json:', err.message);
    }
  }
  botsList = initDefaultBots(targetGroups);
  saveBots();
}

function saveBots() {
  try {
    fs.writeFileSync(BOTS_FILE, JSON.stringify(botsList, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save bots.json:', err.message);
  }
}

loadBots();

// --- Groups Store ---
const groupsStore = new Map();
const recentEvents = [];

function loadGroups() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (item && item.groupId) {
            groupsStore.set(item.groupId, item);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load groups.json:', err.message);
    }
  }
}

function saveGroups() {
  try {
    const list = Array.from(groupsStore.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save groups.json:', err.message);
  }
}

loadGroups();

// --- LINE API Helpers ---

// Check Bot Profile using Token
async function fetchBotProfile(token) {
  if (!token || !token.trim()) {
    return { ok: false, error: 'Token is empty' };
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    if (res.status === 200) {
      const data = await res.json();
      return {
        ok: true,
        userId: data.userId || '',
        displayName: data.displayName || '',
        pictureUrl: data.pictureUrl || '',
        basicId: data.basicId || '',
      };
    }
    const txt = await res.text();
    return { ok: false, status: res.status, error: `LINE API Error (${res.status}): ${txt}` };
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }
}

// Check a single bot for a group
async function checkSingleBotForGroup(groupId, bot) {
  if (!bot || !bot.token || !bot.token.trim()) {
    return { ok: false, status: 400, error: 'No token' };
  }

  try {
    const summaryRes = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bot.token.trim()}` },
    });

    if (summaryRes.status === 200) {
      const summaryData = await summaryRes.json();
      let memberCount = null;
      try {
        const countRes = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/members/count`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${bot.token.trim()}` },
        });
        if (countRes.status === 200) {
          const countData = await countRes.json();
          memberCount = typeof countData.count === 'number' ? countData.count : null;
        }
      } catch (_) {}

      return {
        ok: true,
        status: 'verified',
        groupName: summaryData.groupName || '(ไม่มีชื่อกลุ่ม)',
        pictureUrl: summaryData.pictureUrl || null,
        memberCount,
        botId: bot.id,
        botName: bot.displayName || bot.name,
      };
    }

    return {
      ok: false,
      status: summaryRes.status,
      botId: bot.id,
      botName: bot.displayName || bot.name,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      botId: bot.id,
      error: err.message,
    };
  }
}

// Auto-match & Fast Chunked Fallback across 91 bots
async function fetchGroupSummaryWithFallback(groupId, hint = null) {
  const activeBots = botsList.filter((b) => b.token && b.token.trim());

  if (activeBots.length === 0) {
    return {
      ok: false,
      status: 'no_token',
      error: 'ยังไม่ได้ใส่ LINE Token ของบอทตัวใดเลย (กรุณานำเข้า Token ที่ปุ่มจัดการ 91 บอท)',
    };
  }

  const group = groupsStore.get(groupId);
  const preferredBotId = (hint && hint.botId) || (group && group.botId);
  const preferredUserId = hint && hint.destination;

  // 1. Direct match by Bot ID or Destination (O(1) Instant)
  if (preferredBotId || preferredUserId) {
    const directBot = activeBots.find(
      (b) =>
        (preferredBotId && (b.id.toLowerCase() === preferredBotId.toLowerCase() || b.name.toLowerCase() === preferredBotId.toLowerCase())) ||
        (preferredUserId && b.userId === preferredUserId)
    );
    if (directBot) {
      const directResult = await checkSingleBotForGroup(groupId, directBot);
      if (directResult.ok) return directResult;
    }
  }

  // 2. Previously verified bot for this group
  if (group && group.botId) {
    const knownBot = activeBots.find((b) => b.id === group.botId);
    if (knownBot) {
      const knownResult = await checkSingleBotForGroup(groupId, knownBot);
      if (knownResult.ok) return knownResult;
    }
  }

  // 3. Fallback: Prioritize bots that do NOT have a group assigned yet (1 bot : 1 group ratio)
  const assignedBotIds = new Set(Array.from(groupsStore.values()).map((g) => g.botId).filter(Boolean));
  const queue = [...activeBots].sort((a, b) => {
    const aAssigned = assignedBotIds.has(a.id);
    const bAssigned = assignedBotIds.has(b.id);
    if (!aAssigned && bAssigned) return -1;
    if (aAssigned && !bAssigned) return 1;
    return 0;
  });

  // Check in parallel batches of 8 bots to finish in ~1-2 seconds instead of minutes
  const BATCH_SIZE = 8;
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((b) => checkSingleBotForGroup(groupId, b)));
    const found = results.find((r) => r.ok);
    if (found) {
      return found;
    }
  }

  return {
    ok: false,
    status: 'not_in_group',
    error: `ตรวจสอบบอททั้งหมดที่มี Token (${activeBots.length} บอท) แล้ว: ไม่พบบอทตัวใดอยู่ในกลุ่มนี้ (404)`,
  };
}

// Update a group record
async function checkAndUpdateGroup(groupId, force = false, hint = null) {
  let group = groupsStore.get(groupId);
  if (!group) {
    group = {
      groupId,
      groupName: null,
      pictureUrl: null,
      memberCount: null,
      status: 'pending',
      botId: null,
      botName: null,
      errorMessage: null,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      eventCount: 0,
      lastEventType: 'manual',
    };
    groupsStore.set(groupId, group);
  }

  if (!force && group.status === 'verified' && group.groupName) {
    saveGroups();
    return group;
  }

  group.status = 'checking';
  saveGroups();

  const result = await fetchGroupSummaryWithFallback(groupId, hint);
  if (result.ok) {
    group.status = 'verified';
    group.groupName = result.groupName;
    group.pictureUrl = result.pictureUrl;
    group.memberCount = result.memberCount;
    group.botId = result.botId;
    group.botName = result.botName;
    group.errorMessage = null;
  } else {
    group.status = result.status;
    group.errorMessage = result.error;
  }

  saveGroups();
  return group;
}

// Extract Group IDs from incoming payload
function extractGroupEvents(bodyText) {
  const eventsFound = [];
  let destination = null;

  try {
    const data = JSON.parse(bodyText);
    if (data && data.destination) {
      destination = data.destination;
    }

    if (data && Array.isArray(data.events)) {
      data.events.forEach((ev) => {
        const groupId = ev?.source?.groupId;
        if (groupId && typeof groupId === 'string') {
          eventsFound.push({
            groupId: groupId.trim(),
            eventType: ev.type || 'message',
            timestamp: ev.timestamp ? new Date(ev.timestamp).toISOString() : new Date().toISOString(),
            destination: destination,
            rawEvent: ev,
          });
        }
      });
    }

    if (data && (data.groupId || data.group_id)) {
      const gid = (data.groupId || data.group_id).trim();
      eventsFound.push({
        groupId: gid,
        eventType: data.type || 'direct',
        timestamp: new Date().toISOString(),
        destination: destination,
        rawEvent: data,
      });
    }
  } catch (_) {}

  // Regex fallback
  const groupRegex = /\b(C[0-9a-fA-F]{32})\b/g;
  let match;
  while ((match = groupRegex.exec(bodyText)) !== null) {
    const foundId = match[1];
    if (!eventsFound.some((e) => e.groupId === foundId)) {
      eventsFound.push({
        groupId: foundId,
        eventType: 'text_detected',
        timestamp: new Date().toISOString(),
        destination: destination,
      });
    }
  }

  return { events: eventsFound, destination };
}

// --- HTTP Helpers ---
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      const size = chunks.reduce((total, part) => total + part.length, 0);
      if (size > 2 * 1024 * 1024) {
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(body);
}

// CSV Export Helper
function exportToCsv() {
  const headers = ['ลำดับ', 'Group ID', 'ชื่อกลุ่ม (Group Name)', 'สถานะ (Status)', 'บอทที่อยู่ในกลุ่ม (Bot Owner)', 'จำนวนสมาชิก (Members)', 'พบครั้งแรก (First Seen)', 'พบล่าสุด (Last Seen)', 'จำนวน Events', 'ข้อความแจ้งเตือน (Error)'];
  const rows = [headers.join(',')];

  const list = Array.from(groupsStore.values()).sort((a, b) => {
    if (a.status === 'verified' && b.status !== 'verified') return -1;
    if (a.status !== 'verified' && b.status === 'verified') return 1;
    return (a.groupName || '').localeCompare(b.groupName || '');
  });

  list.forEach((g, idx) => {
    const safeName = (g.groupName || '').replace(/"/g, '""');
    const safeError = (g.errorMessage || '').replace(/"/g, '""');
    const safeBot = (g.botName || g.botId || '-').replace(/"/g, '""');
    const row = [
      idx + 1,
      `"${g.groupId}"`,
      `"${safeName}"`,
      `"${g.status}"`,
      `"${safeBot}"`,
      g.memberCount !== null ? g.memberCount : '',
      `"${g.firstSeen || ''}"`,
      `"${g.lastSeen || ''}"`,
      g.eventCount || 0,
      `"${safeError}"`,
    ];
    rows.push(row.join(','));
  });

  return '\uFEFF' + rows.join('\r\n');
}

const getDashboardHtml = require('./dashboard.js');

// --- Server Request Routing ---
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      });
      res.end();
      return;
    }

    // 1. Dashboard UI
    if (req.method === 'GET' && (pathname === '/dashboard' || pathname === '/')) {
      const html = getDashboardHtml(host);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html),
      });
      res.end(html);
      return;
    }

    // 2. Export CSV
    if (req.method === 'GET' && (pathname === '/api/export/csv' || pathname === '/export.csv')) {
      const csv = exportToCsv();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="line_groups.csv"',
        'Content-Length': Buffer.byteLength(csv),
      });
      res.end(csv);
      return;
    }

    // 3. API: Get all bots
    if (req.method === 'GET' && pathname === '/api/bots') {
      sendJson(res, 200, {
        ok: true,
        bots: botsList.map((b) => ({
          id: b.id,
          name: b.name,
          displayName: b.displayName || b.name,
          hasToken: Boolean(b.token && b.token.trim()),
          userId: b.userId || '',
          pictureUrl: b.pictureUrl || '',
          status: b.status || (b.token ? 'configured' : 'no_token'),
        })),
      });
      return;
    }

    // 4. API: Bulk Import Tokens (Up to 91 bots at once)
    if (req.method === 'POST' && pathname === '/api/bots/bulk-import') {
      const bodyText = await readBody(req);
      const data = JSON.parse(bodyText || '{}');
      const text = data.text || '';

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let importedCount = 0;
      let verifiedCount = 0;

      for (let i = 0; i < lines.length && i < botsList.length; i++) {
        const line = lines[i];
        let tokenCandidate = line;

        // If line is like: "Bot 1, eyJ..." or "bot1: eyJ..."
        if (line.includes(',') || line.includes(':') || line.includes('\t')) {
          const splitParts = line.split(/[,:\t]/);
          tokenCandidate = splitParts[splitParts.length - 1].trim();
        }

        tokenCandidate = tokenCandidate.replace(/^["']|["']$/g, '').trim();

        if (tokenCandidate.length > 20) {
          const bot = botsList[i];
          bot.token = tokenCandidate;
          importedCount++;

          // Try verification
          try {
            const profile = await fetchBotProfile(tokenCandidate);
            if (profile.ok) {
              bot.displayName = profile.displayName || bot.name;
              bot.userId = profile.userId || '';
              bot.pictureUrl = profile.pictureUrl || '';
              bot.status = 'active';
              verifiedCount++;
            } else {
              bot.status = 'configured';
            }
          } catch (_) {
            bot.status = 'configured';
          }
        }
      }

      saveBots();
      sendJson(res, 200, {
        ok: true,
        importedCount,
        verifiedCount,
        totalBots: botsList.length,
      });
      return;
    }

    // 5. API: Update single bot
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'bots' && parts[2]) {
      const botId = parts[2];
      const bot = botsList.find((b) => b.id.toLowerCase() === botId.toLowerCase());
      if (!bot) {
        sendJson(res, 404, { ok: false, error: 'Bot not found' });
        return;
      }

      const bodyText = await readBody(req);
      const data = JSON.parse(bodyText || '{}');
      const token = (data.token || '').trim();

      bot.token = token;

      if (!token) {
        bot.status = 'no_token';
        bot.userId = '';
        bot.pictureUrl = '';
        saveBots();
        sendJson(res, 200, { ok: true, bot });
        return;
      }

      const profile = await fetchBotProfile(token);
      if (profile.ok) {
        bot.status = 'active';
        bot.displayName = profile.displayName || bot.name;
        bot.userId = profile.userId || '';
        bot.pictureUrl = profile.pictureUrl || '';
        saveBots();

        if (botId === 'bot1') {
          updateEnv('LINE_CHANNEL_ACCESS_TOKEN', token);
        }

        sendJson(res, 200, { ok: true, bot });
      } else {
        bot.status = 'invalid_token';
        saveBots();
        sendJson(res, 400, { ok: false, error: profile.error || 'Token ไม่ถูกต้อง (LINE ปฏิเสธ)', bot });
      }
      return;
    }

    // 6. API: Get all groups & stats
    if (req.method === 'GET' && pathname === '/api/groups') {
      const list = Array.from(groupsStore.values());
      const verified = list.filter((g) => g.status === 'verified').length;
      const issues = list.filter((g) => g.status === 'not_in_group' || g.status === 'unauthorized' || g.status === 'no_token' || g.status === 'error').length;
      const pending = list.filter((g) => g.status === 'pending' || g.status === 'checking').length;

      sendJson(res, 200, {
        ok: true,
        target: targetGroups,
        groups: list,
        stats: {
          total: list.length,
          verified,
          issues,
          pending,
          targetCount: targetGroups,
        },
      });
      return;
    }

    // 7. API: Check single group
    if (req.method === 'POST' && pathname === '/api/groups/check') {
      const bodyText = await readBody(req);
      const data = JSON.parse(bodyText || '{}');
      const gid = (data.groupId || '').trim();
      const hint = data.hint || null;

      if (!gid) {
        sendJson(res, 400, { ok: false, error: 'groupId is required' });
        return;
      }

      const updated = await checkAndUpdateGroup(gid, true, hint);
      sendJson(res, 200, { ok: true, group: updated });
      return;
    }

    // 8. API: Check all groups
    if (req.method === 'POST' && pathname === '/api/groups/check-all') {
      const allIds = Array.from(groupsStore.keys());
      let successCount = 0;

      for (const gid of allIds) {
        const resGroup = await checkAndUpdateGroup(gid, true);
        if (resGroup.status === 'verified') successCount++;
      }

      sendJson(res, 200, {
        ok: true,
        total: allIds.length,
        successCount,
      });
      return;
    }

    // 9. API: Delete single group
    if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'groups' && parts[2]) {
      const gid = decodeURIComponent(parts[2]);
      groupsStore.delete(gid);
      saveGroups();
      sendJson(res, 200, { ok: true, deleted: gid });
      return;
    }

    // 10. API: Save config (Target)
    if (req.method === 'POST' && pathname === '/api/config') {
      const bodyText = await readBody(req);
      const data = JSON.parse(bodyText || '{}');

      if (data.targetGroups !== undefined && !isNaN(parseInt(data.targetGroups, 10))) {
        targetGroups = parseInt(data.targetGroups, 10);
        updateEnv('TARGET_GROUPS', targetGroups.toString());
      }

      sendJson(res, 200, { ok: true, targetGroups });
      return;
    }

    // 11. Webhook Receiver: Handles /webhook, /webhook/bot1..bot91, /webhook/line, /webhook/:source/:category
    if (parts[0] === 'webhook') {
      const source = parts[1] || 'line';
      const category = parts[2] || 'default';
      const payload = await readBody(req);

      // Check if source matches any of the 91 bot IDs (e.g. /webhook/bot42)
      let hintBot = botsList.find(
        (b) => b.id.toLowerCase() === source.toLowerCase() || b.name.toLowerCase() === source.toLowerCase()
      );

      recentEvents.unshift({
        receivedAt: new Date().toISOString(),
        source,
        category,
        method: req.method,
        size: payload.length,
      });
      if (recentEvents.length > 50) recentEvents.pop();

      // Extract all Group IDs and destination
      const { events: detected, destination } = extractGroupEvents(payload);

      // If destination (Bot User ID) is provided by LINE, find matching bot
      if (destination && !hintBot) {
        hintBot = botsList.find((b) => b.userId && b.userId === destination);
      }

      const processedGroups = [];
      for (const item of detected) {
        const { groupId, eventType } = item;
        let existing = groupsStore.get(groupId);

        const hint = {
          botId: hintBot ? hintBot.id : null,
          destination: destination || item.destination,
        };

        if (!existing) {
          existing = {
            groupId,
            groupName: null,
            pictureUrl: null,
            memberCount: null,
            status: 'pending',
            botId: hintBot ? hintBot.id : null,
            botName: hintBot ? hintBot.displayName || hintBot.name : null,
            errorMessage: null,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            eventCount: 1,
            lastEventType: eventType,
            lastSource: source,
            lastCategory: category,
          };
          groupsStore.set(groupId, existing);
          saveGroups();

          // Auto-check with fast chunked fallback
          checkAndUpdateGroup(groupId, false, hint).catch((e) => console.error('Auto-check error:', e.message));
        } else {
          existing.lastSeen = new Date().toISOString();
          existing.eventCount = (existing.eventCount || 0) + 1;
          existing.lastEventType = eventType;
          existing.lastSource = source;
          existing.lastCategory = category;

          if (existing.status !== 'verified' || !existing.groupName) {
            checkAndUpdateGroup(groupId, false, hint).catch((e) => console.error('Auto-check error:', e.message));
          } else {
            saveGroups();
          }
        }

        processedGroups.push(groupId);
      }

      sendJson(res, 200, {
        ok: true,
        source,
        category,
        hintBot: hintBot ? hintBot.name : null,
        detectedGroups: processedGroups,
        totalGroupsTracked: groupsStore.size,
      });
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (error) {
    console.error('Server error:', error);
    if (error.message === 'Payload too large') {
      sendJson(res, 413, { error: error.message });
      return;
    }
    sendJson(res, 500, { error: 'Internal Server Error', message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LINE Group Tracker Server (91 Bots Scaling) is running!`);
  console.log(`📍 Dashboard:         http://localhost:${PORT}`);
  console.log(`📥 Global Webhook:    http://localhost:${PORT}/webhook/line`);
  console.log(`🤖 Bot 1..91 Webhook: http://localhost:${PORT}/webhook/bot1 .. /bot91`);
  console.log(`🎯 Target Groups:     ${targetGroups}`);
  console.log(`======================================================\n`);
});
