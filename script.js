/* Spiritual Practice Tracker — v2.0.0 — Complete Rebuild */
(function () {
  'use strict';
  const VERSION = 'v2.0.0';
  let currentPage = 'daily';
  let currentIdx = 0;

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];
  const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && k.length > 2) e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => { if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  };

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function friendlyDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  /* ── Schedule logic ─────────────────────────────── */
  function dayType(iso) {
    const d = new Date(iso + 'T12:00:00');
    const dow = d.getDay();
    return (dow === 0 || dow === 1 || dow === 3 || dow === 5) ? 'A' : 'B';
  }

  function getInstructions(type) {
    const steps = [
      '<strong>Step 1 — Safety & Kedushah</strong>\nSettle yourself. Recite a short protective prayer (e.g., Kriat Shema) asking that only truth and goodness come forward.',
      '<strong>Step 2 — Tiferet Alignment</strong>\nFocus on your heart center. Breathe slowly (inhale 4, exhale 6–8), repeating a word like "emet" on each inhale until you feel present and humble.',
      type === 'A'
        ? '<strong>Step 3 — Invitation (A-Day)</strong>\n"If there are beings permitted to help me toward purity and wholeness, I am open to receiving help in a way aligned with truth and goodness." Then rest in silence.'
        : '<strong>Step 3 — Baseline (B-Day)</strong>\nRest quietly and continue focusing on the breath. No invitation is extended on baseline days.',
      '<strong>Step 4 — Closing & Integration</strong>\nThank whatever has arisen. Seal the session: "This session is complete. Only what serves truth and goodness remains." Ground yourself by noticing your body and surroundings.'
    ];
    return steps.join('\n\n');
  }

  function buildSchedule(startDate, length) {
    const schedule = [];
    const start = new Date(startDate + 'T12:00:00');
    for (let i = 0; i < length; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      schedule.push({ date: iso, dayType: dayType(iso) });
    }
    return schedule;
  }

  /* ── Data ────────────────────────────────────────── */
  function getCfg() { try { return JSON.parse(localStorage.getItem('st2_cfg')) || null; } catch { return null; } }
  function saveCfg(c) { localStorage.setItem('st2_cfg', JSON.stringify(c)); }
  function getSchedule() { try { return JSON.parse(localStorage.getItem('st2_sched')) || []; } catch { return []; } }
  function saveSchedule(s) { localStorage.setItem('st2_sched', JSON.stringify(s)); }
  function getMetrics() { try { return JSON.parse(localStorage.getItem('st2_metrics')) || {}; } catch { return {}; } }
  function saveMetrics(m) { localStorage.setItem('st2_metrics', JSON.stringify(m)); }

  /* ── Toast ───────────────────────────────────────── */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  /* ── Navigation ──────────────────────────────────── */
  const main = $('#main');
  const navBtns = $$('.nav-btn');

  function navigate(page) {
    currentPage = page;
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === page));
    main.innerHTML = '';
    main.style.animation = 'none'; void main.offsetHeight; main.style.animation = 'fadeUp .35s ease-out';
    switch (page) {
      case 'daily': renderDaily(); break;
      case 'data': renderData(); break;
      case 'setup': renderSetup(); break;
    }
  }

  navBtns.forEach(b => b.addEventListener('click', () => navigate(b.dataset.page)));

  /* ── Daily View ──────────────────────────────────── */
  function renderDaily() {
    const cfg = getCfg();
    const schedule = getSchedule();

    if (!cfg || !schedule.length) {
      main.appendChild(el('div', { className: 'empty-state' }, [
        el('div', { className: 'empty-icon', text: '◎' }),
        el('p', { text: 'Configure your practice to get started.' }),
        el('button', { className: 'btn btn-primary', text: 'Set Up Practice', style: 'margin-top:1rem;max-width:200px;margin-left:auto;margin-right:auto', onClick: () => navigate('setup') })
      ]));
      return;
    }

    // Find today in schedule
    const today = todayISO();
    let idx = schedule.findIndex(s => s.date === today);
    if (idx < 0) idx = currentIdx;
    currentIdx = idx;

    const entry = schedule[idx];
    if (!entry) return;

    const type = entry.dayType;
    const metrics = getMetrics();
    const hasMetrics = !!metrics[entry.date];

    // Header
    main.appendChild(el('h2', { className: 'page-title', text: friendlyDate(entry.date) }));
    const subWrap = el('div', { style: 'display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem' });
    subWrap.appendChild(el('span', { className: `day-badge ${type === 'A' ? 'a-day' : 'b-day'}`, text: type === 'A' ? 'Invitation Day (A)' : 'Baseline Day (B)' }));
    subWrap.appendChild(el('span', { className: 'page-subtitle', style: 'margin:0', text: `Day ${idx + 1} of ${schedule.length}` }));
    main.appendChild(subWrap);

    // Instructions
    const instrCard = el('div', { className: 'card' });
    instrCard.appendChild(el('div', { className: 'card-label', text: 'Session Guide' }));
    instrCard.appendChild(el('div', { className: 'instructions', html: getInstructions(type) }));
    main.appendChild(instrCard);

    // Record metrics button or show existing
    if (hasMetrics) {
      const m = metrics[entry.date];
      const card = el('div', { className: 'card' });
      card.appendChild(el('div', { className: 'card-label', text: '✓ Metrics Recorded' }));
      card.appendChild(el('p', { style: 'font-size:0.82rem;color:var(--text-light)', text: `Mood: ${m.mood}/10 · Groundedness: ${m.ground}/10` }));
      if (m.notes) card.appendChild(el('p', { style: 'font-size:0.82rem;color:var(--text-muted);margin-top:0.25rem;font-style:italic', text: m.notes }));
      const editBtn = el('button', { className: 'btn btn-ghost', text: 'Edit Metrics', style: 'margin-top:0.5rem', onClick: () => showMetricsForm(entry.date, m) });
      card.appendChild(editBtn);
      main.appendChild(card);
    } else {
      const recBtn = el('button', { className: 'btn btn-primary', text: '◉ Record Today\'s Metrics', onClick: () => showMetricsForm(entry.date) });
      main.appendChild(recBtn);
    }

    // Day navigation
    const nav = el('div', { className: 'nav-row' });
    const prevBtn = el('button', { text: '← Previous', onClick: () => { currentIdx = Math.max(0, currentIdx - 1); navigate('daily'); } });
    if (idx === 0) prevBtn.disabled = true;
    const nextBtn = el('button', { text: 'Next →', onClick: () => { currentIdx = Math.min(schedule.length - 1, currentIdx + 1); navigate('daily'); } });
    if (idx >= schedule.length - 1) nextBtn.disabled = true;
    nav.append(prevBtn, nextBtn);
    main.appendChild(nav);
  }

  /* ── Metrics Form ────────────────────────────────── */
  function showMetricsForm(date, existing = {}) {
    main.innerHTML = '';
    main.appendChild(el('h2', { className: 'page-title', text: 'Daily Metrics' }));
    main.appendChild(el('p', { className: 'page-subtitle', text: friendlyDate(date) }));

    const card = el('div', { className: 'card' });

    // Urge sliders
    card.appendChild(el('div', { className: 'card-label', text: 'Urge Levels (0–10)' }));
    const urges = [
      { key: 'pornUrge', label: 'Pornography urge' },
      { key: 'mastUrge', label: 'Masturbation urge' },
      { key: 'cigUrge', label: 'Cigarette craving' },
      { key: 'weedUrge', label: 'Marijuana craving' }
    ];

    urges.forEach(u => {
      const g = el('div', { className: 'metric-group' });
      g.appendChild(el('div', { className: 'metric-label', html: `${u.label} <span class="metric-hint">0 = none, 10 = extreme</span>` }));
      const wrap = el('div', { className: 'slider-wrap' });
      const val = el('span', { className: 'slider-val', text: existing[u.key] || '0' });
      const slider = el('input', { type: 'range', min: '0', max: '10', value: existing[u.key] || '0', id: `m-${u.key}` });
      slider.addEventListener('input', () => val.textContent = slider.value);
      wrap.append(slider, val);
      g.appendChild(wrap);
      card.appendChild(g);
    });

    // Behavior toggles
    card.appendChild(el('div', { className: 'card-label', text: 'Behaviors Today', style: 'margin-top:0.75rem' }));
    const toggles = [
      { key: 'pornUsed', label: 'Viewed pornography' },
      { key: 'mastUsed', label: 'Masturbated' },
      { key: 'cigUsed', label: 'Smoked cigarettes' },
      { key: 'weedUsed', label: 'Used marijuana' }
    ];

    toggles.forEach(t => {
      const row = el('div', { className: 'toggle-row' });
      row.appendChild(el('span', { className: 'toggle-label', text: t.label }));
      const btn = el('button', {
        className: `toggle-btn${existing[t.key] === 'yes' ? ' yes' : ''}`,
        text: existing[t.key] === 'yes' ? 'Yes' : 'No',
        id: `m-${t.key}`,
        type: 'button'
      });
      btn.addEventListener('click', () => {
        const isYes = btn.classList.toggle('yes');
        btn.textContent = isYes ? 'Yes' : 'No';
      });
      row.appendChild(btn);
      card.appendChild(row);
    });

    // Mood & groundedness
    card.appendChild(el('div', { className: 'card-label', text: 'Wellbeing', style: 'margin-top:0.75rem' }));
    [{ key: 'mood', label: 'Mood / Clarity' }, { key: 'ground', label: 'Spiritual Groundedness' }].forEach(u => {
      const g = el('div', { className: 'metric-group' });
      g.appendChild(el('div', { className: 'metric-label', text: u.label }));
      const wrap = el('div', { className: 'slider-wrap' });
      const val = el('span', { className: 'slider-val', text: existing[u.key] || '5' });
      const slider = el('input', { type: 'range', min: '0', max: '10', value: existing[u.key] || '5', id: `m-${u.key}` });
      slider.addEventListener('input', () => val.textContent = slider.value);
      wrap.append(slider, val);
      g.appendChild(wrap);
      card.appendChild(g);
    });

    // Notes
    card.appendChild(el('div', { className: 'card-label', text: 'Notes', style: 'margin-top:0.5rem' }));
    const noteArea = el('textarea', { className: 'input-field', placeholder: 'Observations, experiences, insights...', rows: '3', id: 'm-notes' });
    noteArea.value = existing.notes || '';
    card.appendChild(noteArea);

    main.appendChild(card);

    // Save / Cancel buttons
    const btnRow = el('div', { className: 'btn-row' });
    const saveBtn = el('button', { className: 'btn btn-primary', text: '✓ Save Metrics', style: 'flex:2' });
    saveBtn.addEventListener('click', () => {
      const metrics = getMetrics();
      const entry = {};
      urges.forEach(u => entry[u.key] = $(`#m-${u.key}`).value);
      toggles.forEach(t => entry[t.key] = $(`#m-${t.key}`).classList.contains('yes') ? 'yes' : 'no');
      entry.mood = $('#m-mood').value;
      entry.ground = $('#m-ground').value;
      entry.notes = $('#m-notes').value.trim();
      metrics[date] = entry;
      saveMetrics(metrics);
      toast('Metrics saved ✓');
      navigate('daily');
    });
    const cancelBtn = el('button', { className: 'btn btn-ghost', text: 'Cancel', style: 'flex:1', onClick: () => navigate('daily') });
    btnRow.append(saveBtn, cancelBtn);
    main.appendChild(btnRow);
  }

  /* ── Data View ───────────────────────────────────── */
  function renderData() {
    const schedule = getSchedule();
    const metrics = getMetrics();
    main.appendChild(el('h2', { className: 'page-title', text: 'Practice Data' }));

    const dates = Object.keys(metrics).sort((a, b) => b.localeCompare(a));
    if (!dates.length) {
      main.appendChild(el('div', { className: 'empty-state' }, [
        el('div', { className: 'empty-icon', text: '◷' }),
        el('p', { text: 'No metrics recorded yet.' })
      ]));
      return;
    }

    main.appendChild(el('p', { className: 'page-subtitle', text: `${dates.length} days with data` }));

    // Summary stats
    const card = el('div', { className: 'card' });
    card.appendChild(el('div', { className: 'card-label', text: 'Averages' }));
    const sums = { mood: 0, ground: 0, pornUrge: 0, cigUrge: 0 };
    let count = 0;
    dates.forEach(d => {
      const m = metrics[d];
      if (m.mood != null) { sums.mood += Number(m.mood); sums.ground += Number(m.ground); sums.pornUrge += Number(m.pornUrge || 0); sums.cigUrge += Number(m.cigUrge || 0); count++; }
    });
    if (count) {
      const avg = k => (sums[k] / count).toFixed(1);
      card.appendChild(el('p', { style: 'font-size:0.85rem;color:var(--text-light);line-height:1.8', html: `Mood: <strong>${avg('mood')}</strong>/10 · Groundedness: <strong>${avg('ground')}</strong>/10<br>Avg Porn Urge: <strong>${avg('pornUrge')}</strong> · Avg Cig Craving: <strong>${avg('cigUrge')}</strong>` }));
    }
    main.appendChild(card);

    // Table (scrollable)
    const tableWrap = el('div', { style: 'overflow-x:auto' });
    const tbl = el('table');
    const hRow = el('tr');
    ['Date', 'Type', 'Mood', 'Ground', 'P-Urge', 'M-Urge', 'C-Urge', 'W-Urge'].forEach(h => hRow.appendChild(el('th', { text: h })));
    tbl.appendChild(hRow);

    dates.forEach(d => {
      const m = metrics[d];
      const sched = schedule.find(s => s.date === d);
      const row = el('tr');
      [d.slice(5), sched?.dayType || '?', m.mood, m.ground, m.pornUrge, m.mastUrge, m.cigUrge, m.weedUrge].forEach(v => row.appendChild(el('td', { text: v ?? '' })));
      tbl.appendChild(row);
    });
    tableWrap.appendChild(tbl);
    main.appendChild(tableWrap);

    // Export
    const expBtn = el('button', { className: 'btn btn-ghost', text: '↓ Export CSV', style: 'margin-top:0.75rem' });
    expBtn.addEventListener('click', () => {
      const headers = ['date', 'dayType', 'pornUrge', 'mastUrge', 'cigUrge', 'weedUrge', 'pornUsed', 'mastUsed', 'cigUsed', 'weedUsed', 'mood', 'ground', 'notes'];
      let csv = headers.join(',') + '\n';
      schedule.forEach(s => {
        const m = metrics[s.date] || {};
        csv += [s.date, s.dayType, m.pornUrge || '', m.mastUrge || '', m.cigUrge || '', m.weedUrge || '', m.pornUsed || '', m.mastUsed || '', m.cigUsed || '', m.weedUsed || '', m.mood || '', m.ground || '', `"${(m.notes || '').replace(/"/g, '""')}"`].join(',') + '\n';
      });
      const a = el('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'spiritual-practice-data.csv' });
      a.click();
      toast('CSV downloaded');
    });
    main.appendChild(expBtn);
  }

  /* ── Setup ───────────────────────────────────────── */
  function renderSetup() {
    const cfg = getCfg() || {};
    main.appendChild(el('h2', { className: 'page-title', text: 'Setup' }));
    main.appendChild(el('p', { className: 'page-subtitle', text: 'Configure your spiritual practice program' }));

    const card = el('div', { className: 'card' });

    const g1 = el('div', { className: 'form-group' });
    g1.appendChild(el('label', { text: 'Start Date' }));
    g1.appendChild(el('input', { className: 'input-field', type: 'date', id: 's-start', value: cfg.startDate || todayISO() }));
    card.appendChild(g1);

    const g2 = el('div', { className: 'form-group' });
    g2.appendChild(el('label', { text: 'Program Length (days)' }));
    g2.appendChild(el('input', { className: 'input-field', type: 'number', id: 's-len', min: '28', max: '366', value: cfg.programLength || '180' }));
    card.appendChild(g2);

    const g3 = el('div', { className: 'form-group' });
    g3.appendChild(el('label', { text: 'Session Time' }));
    g3.appendChild(el('input', { className: 'input-field', type: 'time', id: 's-session', value: cfg.sessionTime || '09:00' }));
    card.appendChild(g3);

    const g4 = el('div', { className: 'form-group' });
    g4.appendChild(el('label', { text: 'Data Entry Time' }));
    g4.appendChild(el('input', { className: 'input-field', type: 'time', id: 's-record', value: cfg.recordTime || '21:00' }));
    card.appendChild(g4);

    card.appendChild(el('div', { style: 'font-size:0.8rem;color:var(--text-muted);line-height:1.5;padding:0.75rem;background:var(--warm);border-radius:var(--radius-sm);border-left:3px solid var(--lavender)', html: '<strong>A-Days</strong> (Sun, Mon, Wed, Fri): Invitation protocol<br><strong>B-Days</strong> (Tue, Thu, Sat): Baseline — breath only, no invitation' }));

    const saveBtn = el('button', { className: 'btn btn-primary', text: cfg.startDate ? 'Update & Rebuild Schedule' : 'Save & Start', style: 'margin-top:0.75rem' });
    saveBtn.addEventListener('click', () => {
      const newCfg = {
        startDate: $('#s-start').value,
        programLength: parseInt($('#s-len').value) || 180,
        sessionTime: $('#s-session').value,
        recordTime: $('#s-record').value
      };
      saveCfg(newCfg);
      const sched = buildSchedule(newCfg.startDate, newCfg.programLength);
      saveSchedule(sched);
      toast('Practice configured ✓');
      currentIdx = 0;
      navigate('daily');
    });
    card.appendChild(saveBtn);
    main.appendChild(card);

    // Reset
    const resetBtn = el('button', { className: 'btn btn-danger', text: 'Reset All Data', style: 'margin-top:0.75rem' });
    resetBtn.addEventListener('click', () => {
      if (confirm('Clear all data and start fresh?')) {
        ['st2_cfg', 'st2_sched', 'st2_metrics'].forEach(k => localStorage.removeItem(k));
        toast('Data cleared');
        navigate('setup');
      }
    });
    main.appendChild(resetBtn);
  }

  /* ── Init ─────────────────────────────────────────── */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});

  document.addEventListener('DOMContentLoaded', () => {
    const v = $('#version');
    if (v) v.textContent = VERSION;
    const cfg = getCfg();
    const sched = getSchedule();
    if (cfg && sched.length) {
      const today = todayISO();
      currentIdx = sched.findIndex(s => s.date === today);
      if (currentIdx < 0) currentIdx = 0;
      navigate('daily');
    } else {
      navigate('setup');
    }
  });
})();
