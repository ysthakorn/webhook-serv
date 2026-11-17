// --- Hallmark Anti-AI-Slop Engineered Dashboard ---
module.exports = function getDashboardHtml(reqHost) {
  return `<!DOCTYPE html>
<html lang="th" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINE Group Operations — 91 Groups & 91 Bots Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Prompt:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --bg-base: #09090b;
      --bg-surface: #111114;
      --bg-subtle: #18181c;
      --bg-hover: #202026;
      --border: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.16);
      --text-primary: #f4f4f5;
      --text-secondary: #a1a1aa;
      --text-tertiary: #71717a;
      --accent: #06c755;
      --accent-surface: rgba(6, 199, 85, 0.1);
      --accent-border: rgba(6, 199, 85, 0.3);
      --accent-text: #2cdb73;
      --warning-surface: rgba(245, 158, 11, 0.1);
      --warning-border: rgba(245, 158, 11, 0.28);
      --warning-text: #fbbf24;
      --danger-surface: rgba(239, 68, 68, 0.1);
      --danger-border: rgba(239, 68, 68, 0.28);
      --danger-text: #f87171;
      --font-sans: 'Plus Jakarta Sans', 'Prompt', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    }

    html, body {
      overflow-x: clip;
      background: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      margin: 0;
      padding: 0;
      height: 100%;
    }

    button, a, input, textarea, select {
      transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease;
    }

    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

    .font-mono { font-family: var(--font-mono); }
    .surface-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border);
    }
    .surface-hover:hover {
      background: var(--bg-hover);
    }
  </style>
</head>
<body class="antialiased flex flex-col min-h-screen">

  <!-- Top Operational Header -->
  <header class="border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-30">
    <div class="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
      <!-- Left: Breadcrumb & App Identity -->
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] font-semibold text-xs">
          91
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="font-semibold text-white">LINE Group Operations</span>
          <span class="text-[var(--text-tertiary)]">/</span>
          <span class="text-[var(--text-secondary)] font-mono text-[11px]">91 Bots & Groups Console</span>
        </div>
      </div>

      <!-- Right: Operational Controls -->
      <div class="flex items-center gap-2">
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
          <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
          <span>Live Sync</span>
          <span class="text-[var(--text-tertiary)] font-mono text-[10px] ml-1">3.5s</span>
        </div>

        <button onclick="openBotsModal()" class="px-3 py-1.5 text-xs font-medium rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-zinc-200 border border-[var(--border)] flex items-center gap-2">
          <span>ไดเรกทอรี 91 บอท</span>
          <span id="activeBotsBadge" class="font-mono text-[11px] px-1.5 py-0.2 rounded bg-zinc-800 text-[var(--accent-text)]">0/91</span>
        </button>

        <button onclick="openConfigModal()" title="ตั้งค่าระบบ" class="p-1.5 rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-zinc-400 hover:text-white border border-[var(--border)]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

    <!-- KPI Metric Strip (High Density & Architectural) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      
      <!-- Metric 1: Group Discovery Progress -->
      <div class="surface-panel rounded p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>ตรวจพบกลุ่ม</span>
          <span id="targetBadge" class="font-mono text-[11px] text-[var(--text-tertiary)]">เป้าหมาย 91 ห้อง</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <div class="flex items-baseline gap-1.5">
            <span id="statProgressNumber" class="text-2xl font-bold font-mono text-white">0</span>
            <span class="text-xs text-[var(--text-tertiary)] font-mono">/ <span id="statTargetNumber">91</span></span>
          </div>
          <span id="statPercentBadge" class="text-xs font-mono font-medium text-[var(--accent-text)]">0%</span>
        </div>
        <div class="mt-3 w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
          <div id="progressBar" class="bg-[var(--accent)] h-full transition-[width] duration-300 ease-out" style="width: 0%"></div>
        </div>
      </div>

      <!-- Metric 2: Verified Groups -->
      <div class="surface-panel rounded p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>ดึงชื่อกลุ่มสำเร็จ</span>
          <span class="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statVerified" class="text-2xl font-bold font-mono text-white">0</span>
          <span class="text-xs text-[var(--text-secondary)]">ห้องมีข้อมูลครบ</span>
        </div>
        <div class="mt-3 text-[11px] text-[var(--text-tertiary)]">
          LINE API Verified
        </div>
      </div>

      <!-- Metric 3: Bot 1:1 Pairing Ratio -->
      <div class="surface-panel rounded p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>บอทที่จับคู่ห้องแล้ว</span>
          <span class="font-mono text-[11px] text-[var(--text-tertiary)]">สัดส่วน 1:1</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statMatchedBots" class="text-2xl font-bold font-mono text-white">0</span>
          <span class="text-xs text-[var(--text-secondary)]">/ 91 บอท</span>
        </div>
        <div class="mt-3 text-[11px] text-[var(--text-tertiary)]">
          จับคู่ตรงห้องแล้ว
        </div>
      </div>

      <!-- Metric 4: Attention Needed -->
      <div class="surface-panel rounded p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>ต้องตรวจสอบ</span>
          <span class="w-2 h-2 rounded-full bg-[var(--warning-text)]"></span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statIssues" class="text-2xl font-bold font-mono text-white">0</span>
          <span class="text-xs text-[var(--warning-text)]">บอทไม่อยู่ในกลุ่ม</span>
        </div>
        <div class="mt-3 text-[11px] text-[var(--text-tertiary)]">
          ต้องการคำเชิญเข้ากลุ่ม
        </div>
      </div>
    </div>

    <!-- Operational Toolbar -->
    <div class="surface-panel rounded p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Search Input with Keyboard shortcut -->
      <div class="relative flex-1 max-w-sm">
        <input 
          type="text" 
          id="searchInput" 
          oninput="renderGroups()" 
          placeholder="ค้นหาชื่อกลุ่ม, Group ID (C...) หรือชื่อบอท..." 
          class="w-full pl-8 pr-12 py-1.5 bg-zinc-950 border border-[var(--border)] rounded text-xs text-white placeholder-zinc-500 focus:border-zinc-500"
        >
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs font-mono">/</span>
        <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 border border-zinc-800 rounded px-1">ESC</span>
      </div>

      <!-- Center & Right Actions -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Filter Tabs -->
        <div class="bg-zinc-950 border border-[var(--border)] p-0.5 rounded flex items-center text-xs">
          <button onclick="setFilter('all')" id="filterAll" class="px-2.5 py-1 rounded font-medium bg-zinc-800 text-white">ทั้งหมด (<span id="countAll">0</span>)</button>
          <button onclick="setFilter('verified')" id="filterVerified" class="px-2.5 py-1 rounded font-medium text-zinc-400 hover:text-white">มีชื่อแล้ว (<span id="countVerified">0</span>)</button>
          <button onclick="setFilter('attention')" id="filterAttention" class="px-2.5 py-1 rounded font-medium text-zinc-400 hover:text-white">ต้องดูแล (<span id="countAttention">0</span>)</button>
        </div>

        <!-- View Switcher: Table vs Grid -->
        <div class="bg-zinc-950 border border-[var(--border)] p-0.5 rounded flex items-center text-xs">
          <button onclick="setViewMode('table')" id="btnViewTable" title="มุมมองตารางความละเอียดสูง" class="p-1 rounded bg-zinc-800 text-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <button onclick="setViewMode('grid')" id="btnViewGrid" title="มุมมองการ์ด" class="p-1 rounded text-zinc-400 hover:text-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
        </div>

        <!-- Operational Action Buttons -->
        <button onclick="openManualCheckModal()" class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-[var(--border)] rounded text-xs font-medium flex items-center gap-1.5">
          <span>+ เช็ก Group ID</span>
        </button>

        <button onclick="openBulkImportModal()" class="px-2.5 py-1.5 bg-[var(--accent-surface)] hover:bg-[rgba(6,199,85,0.18)] text-[var(--accent-text)] border border-[var(--accent-border)] rounded text-xs font-medium flex items-center gap-1.5">
          <span>นำเข้า 91 Token</span>
        </button>

        <button onclick="recheckAllGroups()" id="recheckAllBtn" title="เช็กชื่อกลุ่มทั้งหมดใหม่ (Fallback 91 บอท)" class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-[var(--border)] rounded text-xs font-medium flex items-center gap-1.5">
          <svg id="recheckIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>ตรวจสอบซ้ำ</span>
        </button>

        <a href="/api/export/csv" download="line_groups.csv" class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-[var(--border)] rounded text-xs font-medium flex items-center gap-1.5">
          <span>ส่งออก CSV</span>
        </a>
      </div>
    </div>

    <!-- Table View (Default High-Density) -->
    <div id="tableViewContainer" class="surface-panel rounded overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[var(--border)] bg-zinc-950/60 text-zinc-400 font-medium">
              <th class="py-2.5 px-3 w-12 text-center font-mono">#</th>
              <th class="py-2.5 px-3">ชื่อกลุ่ม (LINE Group)</th>
              <th class="py-2.5 px-3 font-mono">Group ID</th>
              <th class="py-2.5 px-3">บอทประจำห้อง (1:1)</th>
              <th class="py-2.5 px-3 text-right">สมาชิก</th>
              <th class="py-2.5 px-3">เวลากิจกรรมล่าสุด</th>
              <th class="py-2.5 px-3">สถานะ</th>
              <th class="py-2.5 px-3 text-right">คำสั่ง</th>
            </tr>
          </thead>
          <tbody id="groupsTableBody" class="divide-y divide-[var(--border)]">
            <!-- Table rows rendered by JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Grid View (Optional Toggle) -->
    <div id="gridViewContainer" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <!-- Cards rendered by JS -->
    </div>

    <!-- Empty State -->
    <div id="emptyState" class="hidden surface-panel rounded p-12 text-center max-w-md mx-auto space-y-3">
      <div class="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 font-mono text-sm">
        ∅
      </div>
      <h3 class="text-sm font-semibold text-white">ไม่พบข้อมูลกลุ่ม</h3>
      <p class="text-xs text-zinc-400 leading-relaxed">
        ส่งข้อความในกลุ่มที่มีบอท หรือคลิก <strong>"+ เช็ก Group ID"</strong> เพื่อสั่งให้ระบบทดสอบ Fallback 91 บอทได้ทันที
      </p>
    </div>
  </main>

  <!-- Modal: 91 Bots Directory -->
  <div id="botsModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-panel max-w-4xl w-full rounded border border-zinc-700 p-5 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>ไดเรกทอรีบอท 91 ตัว (Directory of 91 Bots)</span>
          </h3>
          <p class="text-xs text-zinc-400">ตรวจสอบความพร้อมของ Token, การจับคู่กลุ่ม และ Webhook URL ประจำห้อง</p>
        </div>
        <button onclick="closeBotsModal()" class="text-zinc-400 hover:text-white p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Controls inside Bots Modal -->
      <div class="flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
        <input 
          type="text" 
          id="botModalSearch" 
          oninput="renderBotsModalList()" 
          placeholder="ค้นหาบอทตามชื่อ, ID หรือห้องที่จับคู่..." 
          class="w-full sm:w-64 px-2.5 py-1.5 bg-zinc-950 border border-[var(--border)] rounded text-xs text-white placeholder-zinc-500 focus:border-zinc-500"
        >
        <div class="flex items-center gap-2">
          <button onclick="copyAllWebhookUrls()" class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-[var(--border)] rounded font-mono text-[11px]">
            คัดลอก 91 URLs
          </button>
          <button onclick="openBulkImportModal()" class="px-2.5 py-1.5 bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] rounded text-xs font-medium">
            นำเข้า Token 91 ตัว
          </button>
        </div>
      </div>

      <!-- Bots Table inside modal -->
      <div id="botsModalList" class="overflow-y-auto space-y-1.5 flex-1 pr-1 text-xs">
        <!-- Rendered by JS -->
      </div>

      <div class="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
        <span class="text-zinc-400">บอทที่พร้อมใช้งาน: <span id="modalActiveBotsText" class="font-mono text-white">0</span> / 91</span>
        <button onclick="closeBotsModal()" class="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-[var(--border)] rounded">ปิด</button>
      </div>
    </div>
  </div>

  <!-- Modal: Bulk Import 91 Tokens -->
  <div id="bulkModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-panel max-w-2xl w-full rounded border border-zinc-700 p-5 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h3 class="text-sm font-bold text-white">นำเข้า Channel Access Token 91 ตัว (Bulk Import)</h3>
          <p class="text-xs text-zinc-400">วาง Token ทีละบรรทัด (1 บรรทัด = 1 บอท) ระบบจะจัดสรรเข้า Bot 1 ถึง Bot 91 อัตโนมัติ</p>
        </div>
        <button onclick="closeBulkImportModal()" class="text-zinc-400 hover:text-white p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-2 text-xs">
        <div class="flex justify-between items-center text-zinc-300">
          <span>วาง Token รายบรรทัด:</span>
          <span id="bulkLineCount" class="font-mono text-[11px] text-zinc-500">0 บรรทัด</span>
        </div>
        <textarea 
          id="bulkTokensInput" 
          rows="12" 
          oninput="updateBulkLineCount()"
          placeholder="eyJhbGciOiJIUzI1Ni... (Token ของ Bot 1)&#10;eyJhbGciOiJIUzI1Ni... (Token ของ Bot 2)&#10;... (รองรับสูงสุด 91 บรรทัด)" 
          class="w-full p-2.5 bg-zinc-950 border border-[var(--border)] rounded text-zinc-100 font-mono text-[11px] leading-relaxed focus:border-zinc-500"
        ></textarea>
        <p class="text-[11px] text-zinc-500">
          รูปแบบที่รองรับ: วางเฉพาะ Token โดด ๆ หรือ <code>Bot 1, eyJhbGci...</code> ระบบจะสกัดเฉพาะ Token ไปจัดเก็บอัตโนมัติ
        </p>
      </div>

      <div class="pt-2 flex justify-end gap-2 text-xs">
        <button onclick="closeBulkImportModal()" class="px-3 py-1.5 rounded text-zinc-400 hover:text-white">ยกเลิก</button>
        <button onclick="submitBulkImport()" id="btnSubmitBulk" class="px-4 py-1.5 bg-[var(--accent)] hover:bg-[#05ab49] text-black font-semibold rounded">
          นำเข้าและตรวจสอบ
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Manual Group Check -->
  <div id="manualModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-panel max-w-md w-full rounded border border-zinc-700 p-5 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <h3 class="text-sm font-bold text-white">ตรวจสอบชื่อกลุ่มจาก Group ID</h3>
        <button onclick="closeManualCheckModal()" class="text-zinc-400 hover:text-white p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <p class="text-xs text-zinc-400">
        ใส่ Group ID (ขึ้นต้นด้วย <code>C</code> ตามด้วย 32 ตัวอักษร) ระบบจะตรวจสอบผ่าน 91 บอทแบบคู่ขนานทันที
      </p>

      <div class="space-y-2 text-xs">
        <label class="text-zinc-300">LINE Group ID:</label>
        <input 
          type="text" 
          id="manualGroupIdInput" 
          placeholder="Ca56940639c669147e09641753c15383a" 
          class="w-full px-2.5 py-1.5 bg-zinc-950 border border-[var(--border)] rounded text-white font-mono text-xs focus:border-zinc-500"
        >
      </div>

      <div class="pt-2 flex justify-end gap-2 text-xs">
        <button onclick="closeManualCheckModal()" class="px-3 py-1.5 rounded text-zinc-400 hover:text-white">ปิด</button>
        <button onclick="submitManualCheck()" class="px-4 py-1.5 bg-[var(--accent)] hover:bg-[#05ab49] text-black font-semibold rounded">
          ตรวจสอบทันที
        </button>
      </div>
    </div>
  </div>

  <!-- Modal: Settings (Target) -->
  <div id="configModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="surface-panel max-w-md w-full rounded border border-zinc-700 p-5 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <h3 class="text-sm font-bold text-white">ตั้งค่าเป้าหมายจำนวนกลุ่ม</h3>
        <button onclick="closeConfigModal()" class="text-zinc-400 hover:text-white p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-2 text-xs">
        <label class="text-zinc-300">จำนวนกลุ่มเป้าหมาย (Target Groups):</label>
        <input 
          type="number" 
          id="cfgTargetInput" 
          value="91" 
          min="1"
          class="w-full px-2.5 py-1.5 bg-zinc-950 border border-[var(--border)] rounded text-white font-mono text-xs focus:border-zinc-500"
        >
      </div>

      <div class="pt-2 flex justify-end gap-2 text-xs">
        <button onclick="closeConfigModal()" class="px-3 py-1.5 rounded text-zinc-400 hover:text-white">ยกเลิก</button>
        <button onclick="saveTargetConfig()" class="px-4 py-1.5 bg-zinc-100 hover:bg-white text-black font-semibold rounded">บันทึก</button>
      </div>
    </div>
  </div>

  <!-- Operational Toast Feedback -->
  <div id="toast" class="fixed bottom-5 right-5 z-50 transform translate-y-16 opacity-0 transition-opacity transition-transform duration-150 flex items-center gap-2 bg-zinc-900 border border-zinc-700 text-zinc-100 px-3.5 py-2.5 rounded shadow-xl text-xs font-mono">
    <span id="toastIcon" class="text-[var(--accent-text)]">✓</span>
    <span id="toastMsg">สถานะ</span>
  </div>

  <script>
    let allGroups = [];
    let allBots = [];
    let currentFilter = 'all';
    let currentViewMode = 'table';
    let targetCount = 91;

    // Toast helper (clean, fast feedback)
    function showToast(msg, icon = '✓') {
      const toast = document.getElementById('toast');
      document.getElementById('toastIcon').innerText = icon;
      document.getElementById('toastMsg').innerText = msg;
      toast.classList.remove('translate-y-16', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-16', 'opacity-0');
      }, 3000);
    }

    // Modal controllers
    function openBotsModal() {
      renderBotsModalList();
      document.getElementById('botsModal').classList.remove('hidden');
    }
    function closeBotsModal() {
      document.getElementById('botsModal').classList.add('hidden');
      fetchGroupsData();
    }
    function openBulkImportModal() {
      document.getElementById('bulkModal').classList.remove('hidden');
    }
    function closeBulkImportModal() {
      document.getElementById('bulkModal').classList.add('hidden');
    }
    function openManualCheckModal() {
      document.getElementById('manualModal').classList.remove('hidden');
    }
    function closeManualCheckModal() {
      document.getElementById('manualModal').classList.add('hidden');
    }
    function openConfigModal() {
      document.getElementById('configModal').classList.remove('hidden');
    }
    function closeConfigModal() {
      document.getElementById('configModal').classList.add('hidden');
    }

    function updateBulkLineCount() {
      const text = document.getElementById('bulkTokensInput').value;
      const lines = text.split(/\\r?\\n/).filter(l => l.trim().length > 0);
      document.getElementById('bulkLineCount').innerText = \`\${lines.length} บรรทัด\`;
    }

    function copyToClipboard(text, msg = 'คัดลอกเรียบร้อย') {
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

    async function copyAllWebhookUrls() {
      const host = window.location.host;
      const lines = allBots.map(b => \`\${b.name}: http://\${host}/webhook/\${b.id}\`);
      copyToClipboard(lines.join('\\n'), 'คัดลอก 91 URLs เรียบร้อย');
    }

    function setViewMode(mode) {
      currentViewMode = mode;
      const btnTable = document.getElementById('btnViewTable');
      const btnGrid = document.getElementById('btnViewGrid');
      const tableContainer = document.getElementById('tableViewContainer');
      const gridContainer = document.getElementById('gridViewContainer');

      if (mode === 'table') {
        btnTable.className = 'p-1 rounded bg-zinc-800 text-white';
        btnGrid.className = 'p-1 rounded text-zinc-400 hover:text-white';
        tableContainer.classList.remove('hidden');
        gridContainer.classList.add('hidden');
      } else {
        btnGrid.className = 'p-1 rounded bg-zinc-800 text-white';
        btnTable.className = 'p-1 rounded text-zinc-400 hover:text-white';
        gridContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
      }
      renderGroups();
    }

    function setFilter(filter) {
      currentFilter = filter;
      ['filterAll', 'filterVerified', 'filterAttention'].forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('bg-zinc-800', 'text-white');
        btn.classList.add('text-zinc-400');
      });

      if (filter === 'all') {
        document.getElementById('filterAll').classList.add('bg-zinc-800', 'text-white');
      } else if (filter === 'verified') {
        document.getElementById('filterVerified').classList.add('bg-zinc-800', 'text-white');
      } else {
        document.getElementById('filterAttention').classList.add('bg-zinc-800', 'text-white');
      }
      renderGroups();
    }

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      if (e.key === 'Escape') {
        document.getElementById('searchInput').blur();
        closeBotsModal();
        closeBulkImportModal();
        closeManualCheckModal();
        closeConfigModal();
      }
    });

    // Fetch live system state
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
      document.getElementById('targetBadge').innerText = \`เป้าหมาย \${target} ห้อง\`;

      const percent = Math.min(100, Math.round((total / target) * 100));
      document.getElementById('progressBar').style.width = \`\${percent}%\`;
      document.getElementById('statPercentBadge').innerText = \`\${percent}%\`;

      document.getElementById('statVerified').innerText = verified;
      document.getElementById('statIssues').innerText = issues;

      const activeBots = allBots.filter(b => b.hasToken).length;
      document.getElementById('activeBotsBadge').innerText = \`\${activeBots}/91\`;
      document.getElementById('modalActiveBotsText').innerText = activeBots;

      const matchedBotsCount = new Set(allGroups.filter(g => g.status === 'verified' && g.botId).map(g => g.botId)).size;
      document.getElementById('statMatchedBots').innerText = matchedBotsCount;

      document.getElementById('countAll').innerText = total;
      document.getElementById('countVerified').innerText = verified;
      document.getElementById('countAttention').innerText = issues;
    }

    function formatTime(isoString) {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    }

    function renderGroups() {
      const tableBody = document.getElementById('groupsTableBody');
      const gridContainer = document.getElementById('gridViewContainer');
      const emptyState = document.getElementById('emptyState');
      const searchQuery = (document.getElementById('searchInput').value || '').trim().toLowerCase();

      let filtered = allGroups.filter(g => {
        if (currentFilter === 'verified' && g.status !== 'verified') return false;
        if (currentFilter === 'attention' && g.status === 'verified') return false;

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
        tableBody.innerHTML = '';
        gridContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      // 1. Render Table Rows
      tableBody.innerHTML = filtered.map((g, idx) => {
        const isVerified = g.status === 'verified';
        const isChecking = g.status === 'checking';
        const isNotInGroup = g.status === 'not_in_group';

        let statusBadge = '';
        if (isVerified) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[var(--accent-text)] bg-[var(--accent-surface)] border border-[var(--accent-border)]">verified</span>';
        } else if (isChecking) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-blue-400 bg-blue-950/40 border border-blue-800">checking</span>';
        } else if (isNotInGroup) {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[var(--warning-text)] bg-[var(--warning-surface)] border border-[var(--warning-border)]">not in group</span>';
        } else if (g.status === 'no_token') {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[var(--danger-text)] bg-[var(--danger-surface)] border border-[var(--danger-border)]">no token</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">pending</span>';
        }

        const avatar = g.pictureUrl 
          ? \`<img src="\${g.pictureUrl}" class="w-6 h-6 rounded object-cover border border-zinc-700 flex-shrink-0">\`
          : \`<div class="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-300 flex-shrink-0">\${(g.groupName || 'G').charAt(0).toUpperCase()}</div>\`;

        const botCol = g.botName 
          ? \`<span class="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">\${g.botName}</span>\`
          : '<span class="text-zinc-500 font-mono text-[11px]">-</span>';

        return \`
          <tr class="surface-hover">
            <td class="py-2.5 px-3 text-center font-mono text-zinc-500">\${idx + 1}</td>
            <td class="py-2.5 px-3">
              <div class="flex items-center gap-2.5">
                \${avatar}
                <div class="font-medium text-white truncate max-w-xs" title="\${g.groupName || g.groupId}">
                  \${g.groupName || '<span class="text-zinc-500 italic">ไม่ทราบชื่อ</span>'}
                </div>
              </div>
            </td>
            <td class="py-2.5 px-3">
              <div class="flex items-center gap-1.5">
                <code class="font-mono text-[11px] text-zinc-300 select-all max-w-[130px] truncate">\${g.groupId}</code>
                <button onclick="copyToClipboard('\${g.groupId}')" title="คัดลอก ID" class="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
                </button>
              </div>
            </td>
            <td class="py-2.5 px-3">\${botCol}</td>
            <td class="py-2.5 px-3 text-right font-mono text-zinc-300">\${g.memberCount !== null ? g.memberCount : '-'}</td>
            <td class="py-2.5 px-3 font-mono text-[11px] text-zinc-400">\${formatTime(g.lastSeen)}</td>
            <td class="py-2.5 px-3">\${statusBadge}</td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button onclick="checkSingleGroup('\${g.groupId}')" title="ดึงข้อมูลใหม่" class="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
                <button onclick="deleteGroup('\${g.groupId}')" title="ลบรายการ" class="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');

      // 2. Render Grid Cards
      gridContainer.innerHTML = filtered.map((g) => {
        const isVerified = g.status === 'verified';
        const avatar = g.pictureUrl 
          ? \`<img src="\${g.pictureUrl}" class="w-10 h-10 rounded object-cover border border-zinc-700 flex-shrink-0">\`
          : \`<div class="w-10 h-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-zinc-300 text-sm flex-shrink-0">\${(g.groupName || 'G').charAt(0).toUpperCase()}</div>\`;

        return \`
          <div class="surface-panel rounded p-3.5 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-start gap-2.5">
                \${avatar}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1">
                    <h4 class="text-xs font-bold text-white truncate" title="\${g.groupName || g.groupId}">
                      \${g.groupName || '<span class="text-zinc-500 italic">ไม่ทราบชื่อ</span>'}
                    </h4>
                    <span class="font-mono text-[10px] px-1.5 py-0.2 rounded \${isVerified ? 'text-[var(--accent-text)] bg-[var(--accent-surface)]' : 'text-zinc-400 bg-zinc-800'}">
                      \${g.status}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    \${g.botName ? \`<span class="font-mono text-[10px] text-zinc-300">บอท: \${g.botName}</span>\` : ''}
                    \${g.memberCount !== null ? \`<span class="font-mono text-[10px] text-zinc-400">• \${g.memberCount} สมาชิก</span>\` : ''}
                  </div>
                </div>
              </div>

              <div class="mt-2.5 bg-zinc-950 p-1.5 rounded border border-zinc-800 flex items-center justify-between gap-1 text-[11px]">
                <code class="font-mono text-zinc-300 truncate select-all">\${g.groupId}</code>
                <button onclick="copyToClipboard('\${g.groupId}')" class="text-zinc-500 hover:text-white px-1">copy</button>
              </div>
            </div>

            <div class="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>\${formatTime(g.lastSeen)}</span>
              <div class="flex items-center gap-1">
                <button onclick="checkSingleGroup('\${g.groupId}')" class="hover:text-white px-1">ตรวจซ้ำ</button>
                <button onclick="deleteGroup('\${g.groupId}')" class="hover:text-red-400 px-1">ลบ</button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Modal: Render 91 Bots Directory
    function renderBotsModalList() {
      const list = document.getElementById('botsModalList');
      const search = (document.getElementById('botModalSearch').value || '').trim().toLowerCase();
      const host = window.location.host;

      let filtered = allBots.filter(b => {
        if (!search) return true;
        const matchId = (b.id || '').toLowerCase().includes(search);
        const matchName = (b.name || '').toLowerCase().includes(search);
        const matchDisplay = (b.displayName || '').toLowerCase().includes(search);
        const matchGroup = allGroups.some(g => g.botId === b.id && (g.groupName || '').toLowerCase().includes(search));
        return matchId || matchName || matchDisplay || matchGroup;
      });

      list.innerHTML = filtered.map((b) => {
        const webhookUrl = \`http://\${host}/webhook/\${b.id}\`;
        const hasToken = b.hasToken;
        const assignedGroup = allGroups.find(g => g.botId === b.id && g.status === 'verified');

        return \`
          <div class="surface-panel rounded p-2.5 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5 min-w-[180px]">
              <div class="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-300 flex-shrink-0">
                \${b.name.replace('Bot ', '')}
              </div>
              <div class="truncate">
                <div class="font-medium text-white truncate">\${b.displayName || b.name}</div>
                <div class="text-[10px] text-zinc-500 font-mono">\${b.id}</div>
              </div>
            </div>

            <div class="flex-1 min-w-[200px] truncate text-[11px]">
              \${assignedGroup 
                ? \`<span class="text-[var(--accent-text)] font-medium truncate">🔗 \${assignedGroup.groupName}</span>\`
                : '<span class="text-zinc-500 font-mono text-[10px]">ยังไม่จับคู่</span>'
              }
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <code class="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 hidden md:inline-block">/webhook/\${b.id}</code>
              <button onclick="copyToClipboard('\${webhookUrl}', 'คัดลอก URL \${b.name} แล้ว')" class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-mono">
                copy URL
              </button>
              <button onclick="promptEditBotToken('\${b.id}')" class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-mono">
                \${hasToken ? 'แก้ไข' : 'ใส่ Token'}
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function promptEditBotToken(botId) {
      const b = allBots.find(x => x.id === botId);
      const token = prompt(\`กรุณาใส่ Channel Access Token สำหรับ \${b ? b.name : botId}:\`);
      if (token === null) return;

      showToast(\`กำลังบันทึก \${botId}...\`, '⏳');
      try {
        const res = await fetch(\`/api/bots/\${botId}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim() })
        });
        const data = await res.json();
        if (data.ok) {
          showToast(\`บันทึกบอท \${data.bot.displayName || data.bot.name} สำเร็จ\`, '✓');
          await fetchGroupsData();
          renderBotsModalList();
        } else {
          showToast(data.error || 'Token ไม่ถูกต้อง', '✕');
        }
      } catch (err) {
        showToast(err.message, '✕');
      }
    }

    async function submitBulkImport() {
      const input = document.getElementById('bulkTokensInput');
      const text = input.value.trim();
      if (!text) {
        alert('กรุณาวางรายการ Token ก่อนกดยืนยัน');
        return;
      }

      const btn = document.getElementById('btnSubmitBulk');
      btn.innerText = 'กำลังประมวลผล...';
      btn.disabled = true;

      showToast('กำลังนำเข้าและตรวจสอบ Token 91 ตัว...', '⏳');

      try {
        const res = await fetch('/api/bots/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.ok) {
          showToast(\`นำเข้าสำเร็จ \${data.importedCount} บอท (ตรวจสอบผ่าน \${data.verifiedCount} ตัว)\`, '✓');
          closeBulkImportModal();
          input.value = '';
          await fetchGroupsData();
          renderBotsModalList();
        } else {
          showToast(data.error || 'นำเข้าไม่สำเร็จ', '✕');
        }
      } catch (err) {
        showToast(err.message, '✕');
      } finally {
        btn.innerText = 'นำเข้าและตรวจสอบ';
        btn.disabled = false;
      }
    }

    async function checkSingleGroup(groupId) {
      showToast('กำลังตรวจสอบผ่าน 91 บอท...', '⏳');
      try {
        const res = await fetch('/api/groups/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId })
        });
        const data = await res.json();
        if (data.ok) {
          const owner = data.group.botName ? \` (\${data.group.botName})\` : '';
          showToast(\`อัปเดต: \${data.group.groupName || data.group.status}\${owner}\`, '✓');
          fetchGroupsData();
        } else {
          showToast(data.error || 'ตรวจสอบไม่สำเร็จ', '✕');
          fetchGroupsData();
        }
      } catch (err) {
        showToast(err.message, '✕');
      }
    }

    async function recheckAllGroups() {
      const icon = document.getElementById('recheckIcon');
      icon.classList.add('animate-spin');
      showToast('กำลังตรวจสอบกลุ่มทั้งหมดใหม่ (Fallback 91 บอท)...', '⏳');

      try {
        const res = await fetch('/api/groups/check-all', { method: 'POST' });
        const data = await res.json();
        showToast(\`เสร็จสิ้น: สำเร็จ \${data.successCount} / \${data.total} ห้อง\`, '✓');
        fetchGroupsData();
      } catch (err) {
        showToast(err.message, '✕');
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
      if (!confirm(\`ต้องการลบรายการ \${groupId} หรือไม่?\`)) return;
      try {
        await fetch(\`/api/groups/\${encodeURIComponent(groupId)}\`, { method: 'DELETE' });
        showToast('ลบรายการเรียบร้อย', '✓');
        fetchGroupsData();
      } catch (err) {
        showToast(err.message, '✕');
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
          showToast('บันทึกเป้าหมายเรียบร้อย', '✓');
          closeConfigModal();
          fetchGroupsData();
        }
      } catch (err) {
        showToast(err.message, '✕');
      }
    }

    // Auto-polling every 3.5s
    fetchGroupsData();
    setInterval(fetchGroupsData, 3500);
  </script>
</body>
</html>`;
};
