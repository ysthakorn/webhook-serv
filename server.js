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

// --- Bots Store (Supports 6 Bots) ---
let botsList = [];

function initDefaultBots() {
  const defaults = [];
  for (let i = 1; i <= 6; i++) {
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
        botsList = parsed;
        return;
      }
    } catch (err) {
      console.error('Failed to load bots.json:', err.message);
    }
  }
  botsList = initDefaultBots();
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

// Auto-match & Fallback Group Summary Check across all 6 bots
async function fetchGroupSummaryWithFallback(groupId, hint = null) {
  const activeBots = botsList.filter((b) => b.token && b.token.trim());

  if (activeBots.length === 0) {
    return {
      ok: false,
      status: 'no_token',
      error: 'ยังไม่ได้ใส่ LINE Token ของบอทตัวใดเลย (กรุณาตั้งค่า Token ที่ปุ่มจัดการบอท)',
    };
  }

  // Queue prioritization:
  // 1. Hint by Bot ID / URL (e.g. /webhook/bot2) or by Destination (Bot User ID)
  // 2. Previously successful Bot ID for this group
  // 3. Remaining active bots
  const group = groupsStore.get(groupId);
  const preferredBotId = (hint && hint.botId) || (group && group.botId);
  const preferredUserId = hint && hint.destination;

  const queue = [...activeBots].sort((a, b) => {
    const aMatch = (preferredBotId && (a.id === preferredBotId || a.name === preferredBotId)) || (preferredUserId && a.userId === preferredUserId);
    const bMatch = (preferredBotId && (b.id === preferredBotId || b.name === preferredBotId)) || (preferredUserId && b.userId === preferredUserId);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const checkedDetails = [];

  for (const bot of queue) {
    try {
      // 1. Check Group Summary
      const summaryRes = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${bot.token.trim()}` },
      });

      if (summaryRes.status === 200) {
        const summaryData = await summaryRes.json();
        let memberCount = null;

        // 2. Check Member Count
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

        // Match found successfully!
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

      if (summaryRes.status === 404) {
        checkedDetails.push(`${bot.displayName || bot.name}: ไม่อยู่ในกลุ่ม`);
        continue; // Fallback to next bot
      }

      if (summaryRes.status === 401) {
        checkedDetails.push(`${bot.displayName || bot.name}: Token ไม่ถูกต้อง`);
        continue;
      }

      checkedDetails.push(`${bot.displayName || bot.name}: Error ${summaryRes.status}`);
    } catch (err) {
      checkedDetails.push(`${bot.displayName || bot.name}: ${err.message}`);
    }
  }

  // If all bots failed
  return {
    ok: false,
    status: 'not_in_group',
    error: `ตรวจสอบบอท ${queue.length} ตัวแล้วแต่ไม่พบในกลุ่ม: (${checkedDetails.join(', ')})`,
  };
}

// Function to check and update a group record
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

// --- Dashboard UI Template ---
function getDashboardHtml(reqHost) {
  return `<!DOCTYPE html>
<html lang="th" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINE Group Tracker (เป้าหมาย 91 ห้อง - รองรับ 6 บอท)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', '"Sarabun"', 'sans-serif'],
          },
          colors: {
            line: {
              DEFAULT: '#06C755',
              dark: '#05ab49',
              light: '#2cdb73',
              glow: 'rgba(6, 199, 85, 0.25)',
            }
          }
        }
      }
    }
  </script>
  <style>
    [x-cloak] { display: none !important; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    .glass {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .line-pulse {
      box-shadow: 0 0 0 0 rgba(6, 199, 85, 0.7);
      animation: pulse-green 2s infinite cubic-bezier(0.66, 0, 0, 1);
    }
    @keyframes pulse-green {
      to { box-shadow: 0 0 0 10px rgba(6, 199, 85, 0); }
    }
  </style>
</head>
<body class="h-full antialiased font-sans flex flex-col">
  <!-- Top Navigation -->
  <header class="glass sticky top-0 z-30 border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-line flex items-center justify-center shadow-lg shadow-line/20">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.92 1.63 5.51 4.18 7.03-.18.66-.65 2.4-0.75 2.78-.12.48.17.47.36.35.15-.1 2.37-1.57 3.32-2.22.95.26 1.95.41 2.89.41 5.52 0 10-3.92 10-8.75S17.52 2 12 2z"/>
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              LINE Group Tracker
              <span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Auto-Match 6 บอท</span>
            </h1>
          </div>
          <p class="text-xs text-slate-400">ระบบตรวจจับและดึงชื่อกลุ่ม LINE อัตโนมัติด้วย Fallback 6 บอท</p>
        </div>
      </div>

      <!-- Right Actions: Bots Manager & Settings -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Manage 6 Bots Button -->
        <button onclick="openBotsModal()" class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition shadow-lg shadow-emerald-950/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 line-pulse"></span>
          <span>🤖 จัดการ 6 บอท (<span id="activeBotsCount">0</span>/6 พร้อม)</span>
        </button>

        <button onclick="openConfigModal()" title="ตั้งค่าเป้าหมายกลุ่ม" class="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- Progress & Overview Hero -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      
      <!-- Target 91 Groups Progress Card -->
      <div class="md:col-span-2 glass rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div class="absolute -right-8 -bottom-8 w-40 h-40 bg-line/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase tracking-wider font-semibold text-slate-400">ความคืบหน้าภาพรวม</span>
            <span id="targetBadge" class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">เป้าหมาย 91 กลุ่ม</span>
          </div>
          <div class="flex items-baseline gap-3">
            <span id="statProgressNumber" class="text-4xl font-extrabold tracking-tight text-white">0</span>
            <span class="text-slate-400 text-base font-medium">/ <span id="statTargetNumber">91</span> กลุ่มที่ตรวจพบ</span>
            <span id="statPercentBadge" class="ml-auto text-sm font-bold text-line">0%</span>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div class="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700/50">
            <div id="progressBar" class="bg-gradient-to-r from-emerald-500 to-line h-full rounded-full transition-all duration-500 ease-out" style="width: 0%"></div>
          </div>
          <div class="flex justify-between text-xs text-slate-400">
            <span>เริ่มรับ Webhook ผ่านบอททั้ง 6 ตัวได้พร้อมกัน</span>
            <span id="statRemainingText">ขาดอีก 91 กลุ่มจะครบเป้าหมาย</span>
          </div>
        </div>
      </div>

      <!-- Stat Card: Verified Groups -->
      <div class="glass rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs uppercase tracking-wider font-semibold">ดึงชื่อสำเร็จ</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>
        <div class="mt-3">
          <div id="statVerified" class="text-3xl font-extrabold text-white">0</div>
          <div class="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <span>● มีชื่อและระบุบอทที่ดูแลแล้ว</span>
          </div>
        </div>
      </div>

      <!-- Stat Card: Issues / Need Attention -->
      <div class="glass rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs uppercase tracking-wider font-semibold">ต้องตรวจสอบ</span>
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
        </div>
        <div class="mt-3">
          <div id="statIssues" class="text-3xl font-extrabold text-white">0</div>
          <div class="text-xs text-amber-400 font-medium mt-1">
            <span>ยังไม่มีบอทตัวใดอยู่ในกลุ่ม</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bots Quick Bar (Status of all 6 Bots) -->
    <div class="glass rounded-2xl p-4 border border-slate-800">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">สถานะบอททั้ง 6 ตัว & สัดส่วนห้อง</span>
          <span class="text-[11px] text-slate-500">(คลิกเพื่อกรองเฉพาะกลุ่มของบอทนั้น ๆ)</span>
        </div>
        <button onclick="openBotsModal()" class="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium">ตั้งค่า Token บอท</button>
      </div>

      <div id="botsBarContainer" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <!-- Rendered by JS -->
      </div>
    </div>

    <!-- Filter & Toolbar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input 
          type="text" 
          id="searchInput" 
          oninput="renderGroups()" 
          placeholder="ค้นหาตามชื่อกลุ่ม, Group ID (C...) หรือชื่อบอท" 
          class="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-line focus:ring-1 focus:ring-line transition"
        >
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Filter Tabs -->
        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center text-xs">
          <button onclick="setFilter('all')" id="filterAll" class="px-3 py-1.5 rounded-lg font-medium transition bg-slate-800 text-white">ทั้งหมด (<span id="countAll">0</span>)</button>
          <button onclick="setFilter('verified')" id="filterVerified" class="px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white">มีชื่อแล้ว (<span id="countVerified">0</span>)</button>
          <button onclick="setFilter('attention')" id="filterAttention" class="px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white">ต้องดูแล (<span id="countAttention">0</span>)</button>
        </div>

        <!-- Add Manual Group Button -->
        <button onclick="openManualCheckModal()" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          เช็ก Group ID เอง
        </button>

        <!-- Re-check All with Fallback -->
        <button onclick="recheckAllGroups()" id="recheckAllBtn" title="เช็กชื่อกลุ่มใหม่ทั้งหมดโดยวน Fallback 6 บอท" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition">
          <svg id="recheckIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          เช็กชื่อทั้งหมดใหม่ (Fallback)
        </button>

        <!-- Export CSV -->
        <a href="/api/export/csv" download="line_groups.csv" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export CSV
        </a>
      </div>
    </div>

    <!-- Active Filter Notice (if filtering by specific bot) -->
    <div id="botFilterNotice" class="hidden glass rounded-xl px-4 py-2 text-xs flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10">
      <span class="text-emerald-300 flex items-center gap-1.5">
        <span>🔍 กำลังกรองเฉพาะกลุ่มที่ดูแลโดย: <strong id="activeBotFilterName">-</strong></span>
      </span>
      <button onclick="clearBotFilter()" class="text-xs font-semibold text-slate-300 hover:text-white underline">ล้างตัวกรอง</button>
    </div>

    <!-- Groups Grid -->
    <div id="groupsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Cards rendered via JS -->
    </div>

    <!-- Empty State -->
    <div id="emptyState" class="hidden glass rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto space-y-4">
      <div class="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
      <h3 class="text-base font-bold text-white">ยังไม่พบข้อมูลกลุ่ม LINE</h3>
      <p class="text-xs text-slate-400 leading-relaxed">
        ส่งข้อความในกลุ่มที่มีบอทตัวใดตัวหนึ่งอยู่ หรือลองกดปุ่ม <strong>"เช็ก Group ID เอง"</strong> เพื่อให้ระบบลอง Fallback ทั้ง 6 บอทได้ทันทีครับ
      </p>
    </div>
  </main>

  <!-- Modal: Manage 6 Bots -->
  <div id="botsModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass max-w-3xl w-full rounded-2xl border border-slate-700 p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>🤖 จัดการ LINE Bot ทั้ง 6 ตัว & Channel Access Token</span>
          </h3>
          <p class="text-xs text-slate-400">ใส่ Token ของแต่ละบอทเพื่อให้ระบบใช้ Fallback ดึงชื่อกลุ่มได้ครบ 100%</p>
        </div>
        <button onclick="closeBotsModal()" class="text-slate-400 hover:text-white p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Bots List inside modal -->
      <div id="botsModalList" class="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
        <!-- Rendered by JS -->
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between">
        <span class="text-[11px] text-slate-400">ระบบจะจำลองส่งคำขอไปเช็กชื่อบอทจริงจาก LINE Messaging API อัตโนมัติ</span>
        <button onclick="closeBotsModal()" class="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition">เสร็จสิ้น</button>
      </div>
    </div>
  </div>

  <!-- Modal: Settings (Target only) -->
  <div id="configModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass max-w-md w-full rounded-2xl border border-slate-700 p-6 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white">⚙️ ตั้งค่าเป้าหมายจำนวนกลุ่ม</h3>
        <button onclick="closeConfigModal()" class="text-slate-400 hover:text-white p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-medium text-slate-300 mb-1">จำนวนกลุ่มเป้าหมาย (Target Groups):</label>
          <input 
            type="number" 
            id="cfgTargetInput" 
            value="91" 
            min="1"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-line"
          >
        </div>
      </div>

      <div class="pt-2 flex justify-end gap-2 text-xs">
        <button onclick="closeConfigModal()" class="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800">ยกเลิก</button>
        <button onclick="saveTargetConfig()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl">บันทึก</button>
      </div>
    </div>
  </div>

  <!-- Modal: Manual Group Check -->
  <div id="manualModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass max-w-md w-full rounded-2xl border border-slate-700 p-6 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white">🔍 เช็กชื่อกลุ่มจาก Group ID (Auto-Fallback)</h3>
        <button onclick="closeManualCheckModal()" class="text-slate-400 hover:text-white p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <p class="text-xs text-slate-400">
        ใส่ Group ID (ขึ้นต้นด้วย <code>C</code> ตามด้วย 32 ตัวอักษร) ระบบจะนำไปวนเช็กกับบอททั้ง 6 ตัวให้ทันที ตัวไหนอยู่ในกลุ่มจะดึงชื่อมาให้ทันที
      </p>

      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-medium text-slate-300 mb-1">LINE Group ID:</label>
          <input 
            type="text" 
            id="manualGroupIdInput" 
            placeholder="C1234567890abcdef1234567890abcdef" 
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-line"
          >
        </div>
      </div>

      <div class="pt-2 flex justify-end gap-2 text-xs">
        <button onclick="closeManualCheckModal()" class="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800">ปิด</button>
        <button onclick="submitManualCheck()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl">เริ่มค้นหากลุ่มด้วย 6 บอท</button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl shadow-2xl text-xs font-medium">
    <span id="toastIcon">ℹ️</span>
    <span id="toastMsg">แจ้งเตือน</span>
  </div>

  <script>
    let allGroups = [];
    let allBots = [];
    let currentFilter = 'all';
    let filterBotId = null;
    let targetCount = 91;

    function showToast(msg, icon = '✅') {
      const toast = document.getElementById('toast');
      document.getElementById('toastIcon').innerText = icon;
      document.getElementById('toastMsg').innerText = msg;
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 3500);
    }

    function openBotsModal() {
      renderBotsModal();
      document.getElementById('botsModal').classList.remove('hidden');
    }
    function closeBotsModal() {
      document.getElementById('botsModal').classList.add('hidden');
      fetchGroupsData();
    }
    function openConfigModal() {
      document.getElementById('configModal').classList.remove('hidden');
    }
    function closeConfigModal() {
      document.getElementById('configModal').classList.add('hidden');
    }
    function openManualCheckModal() {
      document.getElementById('manualModal').classList.remove('hidden');
    }
    function closeManualCheckModal() {
      document.getElementById('manualModal').classList.add('hidden');
    }

    function copyToClipboard(text, msg = 'คัดลอก Group ID แล้ว!') {
      navigator.clipboard.writeText(text).then(() => {
        showToast(msg, '📋');
      }).catch(() => {
        const inp = document.createElement('input');
        inp.value = text;
        document.body.appendChild(inp);
        inp.select();
        document.execCommand('copy');
        document.body.removeChild(inp);
        showToast(msg, '📋');
      });
    }

    function setFilter(filter) {
      currentFilter = filter;
      ['filterAll', 'filterVerified', 'filterAttention'].forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('text-slate-400');
      });

      if (filter === 'all') {
        document.getElementById('filterAll').classList.add('bg-slate-800', 'text-white');
      } else if (filter === 'verified') {
        document.getElementById('filterVerified').classList.add('bg-slate-800', 'text-white');
      } else {
        document.getElementById('filterAttention').classList.add('bg-slate-800', 'text-white');
      }
      renderGroups();
    }

    function filterByBot(botId) {
      if (filterBotId === botId) {
        clearBotFilter();
        return;
      }
      filterBotId = botId;
      const b = allBots.find(x => x.id === botId);
      document.getElementById('activeBotFilterName').innerText = (b && (b.displayName || b.name)) || botId;
      document.getElementById('botFilterNotice').classList.remove('hidden');
      renderGroups();
      renderBotsBar();
    }

    function clearBotFilter() {
      filterBotId = null;
      document.getElementById('botFilterNotice').classList.add('hidden');
      renderGroups();
      renderBotsBar();
    }

    // Fetch live data
    async function fetchGroupsData() {
      try {
        const [groupsRes, botsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/bots')
        ]);
        if (!groupsRes.ok || !botsRes.ok) return;

        const data = await groupsRes.json();
        const botsData = await botsRes.json();

        allGroups = data.groups || [];
        allBots = botsData.bots || [];
        targetCount = data.target || 91;

        updateStats(data.stats);
        renderBotsBar();
        renderGroups();
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    function updateStats(stats) {
      const total = stats.total || 0;
      const verified = stats.verified || 0;
      const issues = stats.issues || 0;
      const target = stats.targetCount || targetCount;

      document.getElementById('statProgressNumber').innerText = total;
      document.getElementById('statTargetNumber').innerText = target;
      document.getElementById('targetBadge').innerText = \`เป้าหมาย \${target} กลุ่ม\`;

      const percent = Math.min(100, Math.round((total / target) * 100));
      document.getElementById('progressBar').style.width = \`\${percent}%\`;
      document.getElementById('statPercentBadge').innerText = \`\${percent}%\`;

      const remaining = Math.max(0, target - total);
      document.getElementById('statRemainingText').innerText = remaining > 0 ? \`ขาดอีก \${remaining} กลุ่มจะครบเป้าหมาย\` : '🎉 ครบเป้าหมาย 91 กลุ่มแล้ว!';

      document.getElementById('statVerified').innerText = verified;
      document.getElementById('statIssues').innerText = issues;

      document.getElementById('countAll').innerText = total;
      document.getElementById('countVerified').innerText = verified;
      document.getElementById('countAttention').innerText = issues;

      const activeBots = allBots.filter(b => b.status === 'configured' || b.status === 'active' || (b.token && b.token.trim())).length;
      document.getElementById('activeBotsCount').innerText = activeBots;
    }

    function renderBotsBar() {
      const container = document.getElementById('botsBarContainer');
      const host = window.location.host;

      container.innerHTML = allBots.map((b) => {
        const isConfigured = Boolean(b.token && b.token.trim());
        const groupCount = allGroups.filter(g => g.botId === b.id).length;
        const isSelected = filterBotId === b.id;

        return \`
          <div onclick="filterByBot('\${b.id}')" class="p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between \${
            isSelected 
              ? 'bg-emerald-500/10 border-line shadow-lg shadow-line/10' 
              : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800'
          }">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full \${isConfigured ? 'bg-line line-pulse' : 'bg-slate-600'}"></span>
              <span class="font-bold text-xs truncate text-white" title="\${b.displayName || b.name}">\${b.displayName || b.name}</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px]">
              <span class="text-slate-400">\${isConfigured ? 'พร้อมใช้งาน' : 'ไม่มี Token'}</span>
              <span class="font-bold \${groupCount > 0 ? 'text-line' : 'text-slate-500'}">\${groupCount} ห้อง</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function formatTime(isoString) {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ')';
    }

    function renderGroups() {
      const container = document.getElementById('groupsContainer');
      const emptyState = document.getElementById('emptyState');
      const searchQuery = (document.getElementById('searchInput').value || '').trim().toLowerCase();

      let filtered = allGroups.filter(g => {
        if (currentFilter === 'verified' && g.status !== 'verified') return false;
        if (currentFilter === 'attention' && g.status === 'verified') return false;
        if (filterBotId && g.botId !== filterBotId) return false;

        if (searchQuery) {
          const matchId = (g.groupId || '').toLowerCase().includes(searchQuery);
          const matchName = (g.groupName || '').toLowerCase().includes(searchQuery);
          const matchBot = (g.botName || g.botId || '').toLowerCase().includes(searchQuery);
          return matchId || matchName || matchBot;
        }
        return true;
      });

      filtered.sort((a, b) => {
        if (a.status === 'verified' && b.status !== 'verified') return -1;
        if (a.status !== 'verified' && b.status === 'verified') return 1;
        return new Date(b.lastSeen) - new Date(a.lastSeen);
      });

      if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      container.innerHTML = filtered.map((g) => {
        const isVerified = g.status === 'verified';
        const isChecking = g.status === 'checking';
        const isNotInGroup = g.status === 'not_in_group';

        let statusBadge = '';
        if (isVerified) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ ได้ชื่อแล้ว</span>';
        } else if (isChecking) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">กำลังตรวจสอบ...</span>';
        } else if (isNotInGroup) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="ไม่มีบอทตัวใดใน 6 ตัวอยู่ในกลุ่มนี้">⚠ บอทไม่อยู่ในกลุ่ม</span>';
        } else if (g.status === 'no_token') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">ยังไม่มี Token</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">รอดึงชื่อ</span>';
        }

        const avatar = g.pictureUrl 
          ? \`<img src="\${g.pictureUrl}" alt="Group" class="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md flex-shrink-0">\`
          : \`<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-base flex-shrink-0 shadow-md">
              \${(g.groupName || 'L').charAt(0).toUpperCase()}
            </div>\`;

        const botBadge = g.botName
          ? \`<span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">🤖 \${g.botName}</span>\`
          : '';

        const memberBadge = (g.memberCount !== null && g.memberCount !== undefined) 
          ? \`<span class="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 font-medium">👥 \${g.memberCount} สมาชิก</span>\`
          : '';

        return \`
          <div class="glass rounded-2xl p-4 border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between group shadow-lg">
            <div>
              <div class="flex items-start gap-3">
                \${avatar}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="text-sm font-bold text-white truncate" title="\${g.groupName || 'ยังไม่ทราบชื่อกลุ่ม'}">
                      \${g.groupName || '<span class="text-slate-400 font-normal italic">ยังไม่ทราบชื่อกลุ่ม</span>'}
                    </h4>
                    \${statusBadge}
                  </div>
                  
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    \${botBadge}
                    \${memberBadge}
                    <span class="text-[11px] text-slate-500">Events: \${g.eventCount || 1}</span>
                  </div>
                </div>
              </div>

              <!-- Group ID Box -->
              <div class="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                <code class="text-xs font-mono text-emerald-400 truncate select-all">\${g.groupId}</code>
                <button onclick="copyToClipboard('\${g.groupId}')" title="คัดลอก Group ID" class="p-1 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition flex-shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>
                  </svg>
                </button>
              </div>

              \${g.errorMessage ? \`
                <div class="mt-2 text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-snug">
                  ℹ️ \${g.errorMessage}
                </div>
              \` : ''}
            </div>

            <!-- Footer Details & Actions -->
            <div class="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span title="พบล่าสุด">🕒 \${formatTime(g.lastSeen)}</span>
              <div class="flex items-center gap-1.5">
                <button onclick="checkSingleGroup('\${g.groupId}')" title="วน Fallback ทั้ง 6 บอทเพื่อดึงชื่อกลุ่ม" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 font-medium">
                  <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>ดึงชื่อใหม่</span>
                </button>
                <button onclick="deleteGroup('\${g.groupId}')" title="ลบกลุ่มนี้" class="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Modal: Render 6 Bots Settings
    function renderBotsModal() {
      const list = document.getElementById('botsModalList');
      const host = window.location.host;

      list.innerHTML = allBots.map((b) => {
        const webhookUrl = \`http://\${host}/webhook/\${b.id}\`;
        const hasToken = Boolean(b.token && b.token.trim());

        return \`
          <div class="glass p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                \${b.pictureUrl 
                  ? \`<img src="\${b.pictureUrl}" class="w-8 h-8 rounded-lg object-cover border border-slate-600">\`
                  : \`<div class="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center font-bold text-white">\${b.name.slice(-1)}</div>\`
                }
                <div>
                  <h4 class="font-bold text-white text-sm">\${b.displayName || b.name}</h4>
                  <div class="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Webhook URL ของบอทตัวนี้:</span>
                    <code class="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">\${webhookUrl}</code>
                    <button onclick="copyToClipboard('\${webhookUrl}', 'คัดลอก URL บอทแล้ว!')" class="underline text-slate-400 hover:text-white">ก๊อปปี้</button>
                  </div>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold \${hasToken ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                \${hasToken ? '✓ เชื่อมต่อแล้ว' : 'ยังไม่ใส่ Token'}
              </span>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-[11px] text-slate-300 font-medium">Channel Access Token (Long-lived):</label>
                \${hasToken ? '<span class="text-[11px] text-slate-500">บันทึกแล้ว</span>' : ''}
              </div>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  id="botTokenInput_\${b.id}" 
                  value="\${b.token || ''}" 
                  placeholder="วาง Channel Access Token ของ \${b.name} ที่นี่..." 
                  class="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-line"
                >
                <button onclick="saveAndVerifyBotToken('\${b.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition flex-shrink-0">
                  บันทึก & ทดสอบ
                </button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Actions
    async function saveAndVerifyBotToken(botId) {
      const input = document.getElementById(\`botTokenInput_\${botId}\`);
      const token = (input.value || '').trim();

      showToast(\`กำลังบันทึกและตรวจสอบ Token ของ \${botId}...\`, '⏳');

      try {
        const res = await fetch(\`/api/bots/\${botId}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (data.ok) {
          showToast(\`บันทึกสำเร็จ! เชื่อมต่อกับบอท "\${data.bot.displayName || data.bot.name}" เรียบร้อย\`, '✅');
          await fetchGroupsData();
          renderBotsModal();
        } else {
          showToast(data.error || 'Token ไม่ถูกต้อง', '❌');
        }
      } catch (err) {
        showToast(err.message, '❌');
      }
    }

    async function checkSingleGroup(groupId) {
      showToast('กำลังวนเช็กผ่านบอททั้ง 6 ตัว (Fallback)...', '⏳');
      try {
        const res = await fetch('/api/groups/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId })
        });
        const data = await res.json();
        if (data.ok) {
          const owner = data.group.botName ? \` (ผ่าน \${data.group.botName})\` : '';
          showToast(\`อัปเดตแล้ว: \${data.group.groupName || data.group.status}\${owner}\`, '✅');
          fetchGroupsData();
        } else {
          showToast(data.error || 'เกิดข้อผิดพลาด', '❌');
          fetchGroupsData();
        }
      } catch (err) {
        showToast(err.message, '❌');
      }
    }

    async function recheckAllGroups() {
      const icon = document.getElementById('recheckIcon');
      icon.classList.add('animate-spin');
      showToast('กำลังวนเช็กชื่อกลุ่มทั้งหมดใหม่ด้วย Fallback 6 บอท...', '⏳');

      try {
        const res = await fetch('/api/groups/check-all', { method: 'POST' });
        const data = await res.json();
        showToast(\`ตรวจสอบเสร็จสิ้น: พบชื่อสำเร็จ \${data.successCount} / \${data.total} กลุ่ม\`, '✅');
        fetchGroupsData();
      } catch (err) {
        showToast(err.message, '❌');
      } finally {
        icon.classList.remove('animate-spin');
      }
    }

    async function submitManualCheck() {
      const input = document.getElementById('manualGroupIdInput');
      const val = (input.value || '').trim();
      if (!val) {
        alert('กรุณากรอก LINE Group ID');
        return;
      }
      closeManualCheckModal();
      input.value = '';
      await checkSingleGroup(val);
    }

    async function deleteGroup(groupId) {
      if (!confirm(\`ต้องการลบกลุ่ม \${groupId} หรือไม่?\`)) return;
      try {
        await fetch(\`/api/groups/\${encodeURIComponent(groupId)}\`, { method: 'DELETE' });
        showToast('ลบกลุ่มเรียบร้อย', '🗑️');
        fetchGroupsData();
      } catch (err) {
        showToast(err.message, '❌');
      }
    }

    async function saveTargetConfig() {
      const target = document.getElementById('cfgTargetInput').value.trim();
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetGroups: target })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('บันทึกเป้าหมายแล้ว!', '✅');
          closeConfigModal();
          fetchGroupsData();
        }
      } catch (err) {
        showToast(err.message, '❌');
      }
    }

    // Auto-polling every 3.5s
    fetchGroupsData();
    setInterval(fetchGroupsData, 3500);
  </script>
</body>
</html>`;
}

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
          token: b.token ? b.token.slice(0, 10) + '...' + b.token.slice(-6) : '',
          hasToken: Boolean(b.token && b.token.trim()),
          userId: b.userId || '',
          pictureUrl: b.pictureUrl || '',
          status: b.status || (b.token ? 'configured' : 'no_token'),
        })),
      });
      return;
    }

    // 4. API: Update and verify a bot's token
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'bots' && parts[2]) {
      const botId = parts[2];
      const bot = botsList.find((b) => b.id === botId);
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

      // Verify token with LINE
      const profile = await fetchBotProfile(token);
      if (profile.ok) {
        bot.status = 'active';
        bot.displayName = profile.displayName || bot.name;
        bot.userId = profile.userId || '';
        bot.pictureUrl = profile.pictureUrl || '';
        saveBots();

        // If it's bot1, also sync to .env
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

    // 5. API: Get all groups & stats
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

    // 6. API: Check single group
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

    // 7. API: Check all groups
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

    // 8. API: Delete single group
    if (req.method === 'DELETE' && parts[0] === 'api' && parts[1] === 'groups' && parts[2]) {
      const gid = decodeURIComponent(parts[2]);
      groupsStore.delete(gid);
      saveGroups();
      sendJson(res, 200, { ok: true, deleted: gid });
      return;
    }

    // 9. API: Save config (Target)
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

    // 10. Webhook Receiver: Handles /webhook, /webhook/bot1..bot6, /webhook/line, /webhook/:source/:category
    if (parts[0] === 'webhook') {
      const source = parts[1] || 'line';
      const category = parts[2] || 'default';
      const payload = await readBody(req);

      // Check if source matches any of the bot IDs (e.g. /webhook/bot2)
      let hintBot = botsList.find((b) => b.id.toLowerCase() === source.toLowerCase() || b.name.toLowerCase() === source.toLowerCase());

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

          // Auto-check with fallback
          checkAndUpdateGroup(groupId, false, hint).catch((e) => console.error('Auto-check error:', e.message));
        } else {
          existing.lastSeen = new Date().toISOString();
          existing.eventCount = (existing.eventCount || 0) + 1;
          existing.lastEventType = eventType;
          existing.lastSource = source;
          existing.lastCategory = category;

          // If previously failed or not verified, trigger fallback check
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
  console.log(`🚀 LINE Group Tracker Server (Multi-Bot 6 Support) is running!`);
  console.log(`📍 Dashboard:        http://localhost:${PORT}`);
  console.log(`📥 Global Webhook:   http://localhost:${PORT}/webhook/line`);
  console.log(`🤖 Bot 1..6 Webhook: http://localhost:${PORT}/webhook/bot1 .. /bot6`);
  console.log(`🎯 Target:           ${targetGroups} groups`);
  console.log(`======================================================\n`);
});
