/* Spiritual Practice Tracker v5.0.0 — Complete A/B Day Practice & Metrics */
(function () {
  'use strict';

  const VERSION = 'v5.0.0';
  const PREFIX = 'spt_';

  /* ─── Utilities ─────────────────────────────────────── */
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on') && k.length > 2) {
          e.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          e.setAttribute(k, v);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (!c) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      });
    }
    return e;
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function friendlyDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function shortDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ─── Data Layer ────────────────────────────────────── */
  function getConfig() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'config')) || null; }
    catch { return null; }
  }
  function saveConfig(c) { localStorage.setItem(PREFIX + 'config', JSON.stringify(c)); }

  function getSchedule() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'schedule')) || []; }
    catch { return []; }
  }
  function saveSchedule(s) { localStorage.setItem(PREFIX + 'schedule', JSON.stringify(s)); }

  function getMetrics() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'metrics')) || {}; }
    catch { return {}; }
  }
  function saveMetrics(m) { localStorage.setItem(PREFIX + 'metrics', JSON.stringify(m)); }

  /* ─── Schedule Generation ───────────────────────────── */
  function generateSchedule(startDate, length) {
    const schedule = [];
    const start = new Date(startDate + 'T12:00:00');
    for (let i = 0; i < length; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const dayType = [0, 1, 3, 5].includes(dow) ? 'A' : 'B';
      schedule.push({
        date: d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0'),
        dayType: dayType,
        dayNumber: i + 1
      });
    }
    return schedule;
  }

  /* ─── Practice Content ──────────────────────────────── */
  const A_DAY_STEPS = [
    {
      icon: '\u{1F6E1}\uFE0F',
      title: 'Safety & Kedushah',
      detail: 'Begin with protective prayer (Kriat Shema) to ground yourself in sanctity. Settle your body, quiet your mind, and ask that only truth and goodness come forward in this session.'
    },
    {
      icon: '\u{1F4AB}',
      title: 'Tiferet Alignment',
      detail: 'Focus on your heart center. Breathe in for 4 counts, out for 6-8 counts. Repeat a word like "emet" on each inhale until you feel present, aligned, and humble. Feel the balance of chesed and gevurah.'
    },
    {
      icon: '\u{1F64F}',
      title: 'The Invitation',
      detail: '"If there are beings permitted to help me toward purity and wholeness, I am open to receiving help in a way aligned with truth and goodness." Then rest in silence. Be open and receptive. Notice any impressions, feelings, or subtle shifts.'
    },
    {
      icon: '\u{1F305}',
      title: 'Closing & Integration',
      detail: 'Express gratitude for whatever arose. Seal the session: "This session is complete. Only what serves truth and goodness remains." Ground yourself by noticing your body, your surroundings, and the solidity of the earth beneath you. Carry the practice into your day.'
    }
  ];

  const B_DAY_STEPS = [
    {
      icon: '\u{1F6E1}\uFE0F',
      title: 'Safety & Grounding',
      detail: 'Begin with a brief protective intention. Settle into your seat. Notice your body and breath.'
    },
    {
      icon: '\u{1F32C}\uFE0F',
      title: 'Breath Focus',
      detail: 'Breathe in for 4 counts, out for 6 counts. Keep attention gently on the breath. When the mind wanders, return without judgment. Continue for 5-10 minutes.'
    },
    {
      icon: '\u{1F305}',
      title: 'Closing',
      detail: 'Note any observations. Express brief gratitude. Ground yourself and return to your day with calm awareness.'
    }
  ];

  /* ─── App State ─────────────────────────────────────── */
  let currentTab = 'today';
  let viewingDayIdx = 0;
  let appRoot;

  /* ─── Toast ─────────────────────────────────────────── */
  let toastEl;
  let toastTimer;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = el('div', { className: 'toast' });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  /* ─── Confirmation Modal ────────────────────────────── */
  function showConfirm(title, message, onConfirm) {
    const overlay = el('div', { className: 'modal-overlay' });
    const box = el('div', { className: 'modal-box' });
    box.appendChild(el('div', { className: 'modal-title', text: title }));
    box.appendChild(el('div', { className: 'modal-message', text: message }));

    const btns = el('div', { className: 'modal-buttons' });
    btns.appendChild(el('button', {
      className: 'modal-btn modal-btn-cancel',
      text: 'Cancel',
      onClick: () => overlay.remove()
    }));
    btns.appendChild(el('button', {
      className: 'modal-btn modal-btn-confirm',
      text: 'Confirm',
      onClick: () => { overlay.remove(); onConfirm(); }
    }));
    box.appendChild(btns);
    overlay.appendChild(box);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ═══════════════════════════════════════════════════════
     ONBOARDING
     ═══════════════════════════════════════════════════════ */

  function runOnboarding() {
    let step = 0;
    const totalSteps = 6;
    let breathingTimeout = null;

    const overlay = el('div', { className: 'onboarding-overlay' });
    const contentArea = el('div');
    const nav = el('div', { className: 'ob-nav' });

    overlay.appendChild(contentArea);
    overlay.appendChild(nav);
    document.body.appendChild(overlay);

    function renderStep() {
      contentArea.innerHTML = '';
      nav.innerHTML = '';

      // Clear any breathing animation timers
      if (breathingTimeout) {
        clearTimeout(breathingTimeout);
        breathingTimeout = null;
      }

      const stepEl = el('div', { className: 'onboarding-step' });

      switch (step) {
        case 0: renderWelcome(stepEl); break;
        case 1: renderPracticeIntro(stepEl); break;
        case 2: renderADays(stepEl); break;
        case 3: renderBDays(stepEl); break;
        case 4: renderTracking(stepEl); break;
        case 5: renderConfigure(stepEl); break;
      }

      contentArea.appendChild(stepEl);

      // Dots
      const dots = el('div', { className: 'ob-dots' });
      for (let i = 0; i < totalSteps; i++) {
        const dot = el('div', { className: 'ob-dot' });
        if (i === step) dot.classList.add('active');
        else if (i < step) dot.classList.add('done');
        dots.appendChild(dot);
      }

      // Buttons
      if (step > 0 && step < 5) {
        nav.appendChild(el('button', {
          className: 'ob-btn ob-btn-secondary',
          text: 'Back',
          onClick: () => { step--; renderStep(); }
        }));
      } else {
        nav.appendChild(el('div'));
      }

      nav.appendChild(dots);

      if (step === 0) {
        nav.appendChild(el('button', {
          className: 'ob-btn ob-btn-primary',
          text: 'Begin \u2192',
          onClick: () => { step++; renderStep(); }
        }));
      } else if (step < 5) {
        nav.appendChild(el('button', {
          className: 'ob-btn ob-btn-primary',
          text: 'Next \u2192',
          onClick: () => { step++; renderStep(); }
        }));
      } else {
        // Last step has its own button inside
        nav.appendChild(el('div'));
      }
    }

    function renderWelcome(container) {
      const ring = el('div', { className: 'glow-ring' });
      ring.appendChild(el('div', { className: 'glow-ring-inner' }));
      container.appendChild(ring);
      container.appendChild(el('h1', { className: 'ob-title', text: 'Spiritual Practice' }));
      container.appendChild(el('p', {
        className: 'ob-subtitle',
        text: 'A structured path for inner transformation'
      }));
    }

    function renderPracticeIntro(container) {
      container.appendChild(el('h2', { className: 'ob-header', text: 'A Committed Practice' }));
      const textBlock = el('div', { className: 'ob-text ob-text-stagger' });
      textBlock.appendChild(el('span', { text: 'This is a multi-month spiritual practice program.' }));
      textBlock.appendChild(el('span', {
        text: 'Every day follows a structured protocol designed to build awareness, connection, and strength.'
      }));
      textBlock.appendChild(el('span', {
        text: 'You\'ll track your practice and observe how it transforms your daily experience.'
      }));
      textBlock.appendChild(el('span', { text: 'Most programs run 90\u2013180 days.' }));
      container.appendChild(textBlock);
    }

    function renderADays(container) {
      const header = el('h2', { className: 'ob-header' });
      header.appendChild(document.createTextNode('A Days: Invitation '));
      header.appendChild(el('span', { className: 'badge-inline badge-a', text: 'INDIGO' }));
      container.appendChild(header);

      // Mini calendar
      const cal = el('div', { className: 'mini-calendar' });
      const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      dayLabels.forEach(d => cal.appendChild(el('div', { className: 'mini-cal-header', text: d })));
      for (let i = 0; i < 7; i++) {
        const dayEl = el('div', { className: 'mini-cal-day', text: String(i + 1) });
        if ([0, 1, 3, 5].includes(i)) dayEl.classList.add('highlight-a');
        cal.appendChild(dayEl);
      }
      container.appendChild(cal);

      container.appendChild(el('p', {
        className: 'ob-text',
        style: 'margin: 12px 0',
        text: 'On A days, you follow the full protocol. Tap each step to learn more:'
      }));

      // Step cards
      const cards = el('div', { className: 'step-cards' });
      A_DAY_STEPS.forEach((s, i) => {
        const card = el('div', { className: 'step-card' });
        const header = el('div', { className: 'step-card-header' });
        header.appendChild(el('span', { className: 'step-card-icon', text: s.icon }));
        header.appendChild(el('span', { text: s.title }));
        header.appendChild(el('span', { className: 'step-card-chevron', text: '\u25B6' }));
        card.appendChild(header);
        card.appendChild(el('div', { className: 'step-card-body', text: s.detail }));
        card.addEventListener('click', () => card.classList.toggle('expanded'));
        cards.appendChild(card);
      });
      container.appendChild(cards);
    }

    function renderBDays(container) {
      const header = el('h2', { className: 'ob-header' });
      header.appendChild(document.createTextNode('B Days: Baseline '));
      header.appendChild(el('span', { className: 'badge-inline badge-b', text: 'EMERALD' }));
      container.appendChild(header);

      // Mini calendar
      const cal = el('div', { className: 'mini-calendar' });
      const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      dayLabels.forEach(d => cal.appendChild(el('div', { className: 'mini-cal-header', text: d })));
      for (let i = 0; i < 7; i++) {
        const dayEl = el('div', { className: 'mini-cal-day', text: String(i + 1) });
        if ([2, 4, 6].includes(i)) dayEl.classList.add('highlight-b');
        cal.appendChild(dayEl);
      }
      container.appendChild(cal);

      container.appendChild(el('p', {
        className: 'ob-text',
        style: 'margin: 12px 0',
        text: 'B days are simpler \u2014 breath-focused only. Consistency is the goal.'
      }));

      container.appendChild(el('p', {
        className: 'ob-text',
        style: 'margin: 8px 0 16px',
        text: 'Let\'s try a breath cycle now:'
      }));

      // Breathing exercise
      const breathContainer = el('div', { className: 'breath-container' });
      const circle = el('div', { className: 'breath-circle' });
      const breathText = el('div', { className: 'breath-text', text: '\u00B7' });
      circle.appendChild(breathText);
      breathContainer.appendChild(circle);
      const label = el('div', { className: 'breath-label', text: 'Tap to begin' });
      breathContainer.appendChild(label);
      container.appendChild(breathContainer);

      const afterText = el('p', {
        className: 'ob-text',
        style: 'margin-top: 16px; opacity: 0; transition: opacity 0.5s ease',
        text: 'That\'s it. Simple, powerful, daily.'
      });
      container.appendChild(afterText);

      let breathStarted = false;

      circle.style.cursor = 'pointer';
      circle.addEventListener('click', () => {
        if (breathStarted) return;
        breathStarted = true;
        circle.style.cursor = 'default';
        runBreathCycle(circle, breathText, label, afterText);
      });
    }

    function runBreathCycle(circle, breathText, label, afterText) {
      let count = 0;
      const inhaleTotal = 4;
      const exhaleTotal = 6;

      // Inhale phase
      circle.classList.add('inhale');
      label.textContent = 'Breathe in...';
      breathText.textContent = '';

      function inhaleCount() {
        count++;
        breathText.textContent = count;
        label.textContent = 'Breathe in... ' + count;
        if (count < inhaleTotal) {
          breathingTimeout = setTimeout(inhaleCount, 1000);
        } else {
          breathingTimeout = setTimeout(startExhale, 800);
        }
      }
      breathingTimeout = setTimeout(inhaleCount, 800);

      function startExhale() {
        circle.classList.remove('inhale');
        circle.classList.add('exhale');
        count = 0;
        label.textContent = 'Breathe out...';
        breathText.textContent = '';
        breathingTimeout = setTimeout(exhaleCount, 800);
      }

      function exhaleCount() {
        count++;
        breathText.textContent = count;
        label.textContent = 'Breathe out... ' + count;
        if (count < exhaleTotal) {
          breathingTimeout = setTimeout(exhaleCount, 1000);
        } else {
          breathingTimeout = setTimeout(finishBreath, 800);
        }
      }

      function finishBreath() {
        circle.classList.remove('exhale');
        breathText.textContent = '\u2713';
        label.textContent = '';
        afterText.style.opacity = '1';
      }
    }

    function renderTracking(container) {
      container.appendChild(el('h2', { className: 'ob-header', text: 'Why We Track' }));
      container.appendChild(el('p', {
        className: 'ob-text',
        style: 'margin-bottom: 16px',
        text: 'Each evening, you\'ll record a few key metrics. Over time, patterns emerge that reveal your growth.'
      }));

      const cards = el('div', { className: 'ob-track-cards' });

      const items = [
        { title: 'Urge Intensity', desc: 'Rate specific urges on a 0\u201310 scale' },
        { title: 'Behavior', desc: 'Did you act on any urges? Honest tracking, no judgment' },
        { title: 'Wellbeing', desc: 'Rate your mood, clarity, and spiritual groundedness' },
        { title: 'Notes', desc: 'Free-form observations about your day' }
      ];

      items.forEach(item => {
        const card = el('div', { className: 'ob-track-card' });
        card.appendChild(el('div', { className: 'ob-track-card-title', text: item.title }));
        card.appendChild(el('div', { className: 'ob-track-card-desc', text: item.desc }));
        cards.appendChild(card);
      });

      container.appendChild(cards);

      container.appendChild(el('p', {
        className: 'ob-text',
        style: 'margin-top: 16px; font-style: italic; opacity: 0.7',
        text: 'Compassionate, honest self-observation \u2014 not judgment.'
      }));
    }

    function renderConfigure(container) {
      container.style.justifyContent = 'flex-start';
      container.style.paddingTop = '40px';
      container.appendChild(el('h2', { className: 'ob-header', text: 'Set Up Your Practice' }));

      const form = el('div', { className: 'ob-config-form' });

      // Start date
      const g1 = el('div', { className: 'ob-form-group' });
      g1.appendChild(el('label', { text: 'Start Date' }));
      g1.appendChild(el('input', {
        className: 'ob-input',
        type: 'date',
        id: 'ob-start',
        value: todayISO()
      }));
      form.appendChild(g1);

      // Program length
      const g2 = el('div', { className: 'ob-form-group' });
      g2.appendChild(el('label', { text: 'Program Length' }));
      const radioGroup = el('div', { className: 'ob-radio-group' });
      const lengths = [90, 120, 180];
      lengths.forEach(len => {
        const btn = el('button', {
          className: 'ob-radio-btn' + (len === 180 ? ' active' : ''),
          text: len + ' days',
          type: 'button',
          'data-len': String(len)
        });
        btn.addEventListener('click', () => {
          $$('.ob-radio-btn', form).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const customInput = $('#ob-custom-len');
          if (customInput) customInput.value = '';
        });
        radioGroup.appendChild(btn);
      });
      // Custom
      const customBtn = el('button', {
        className: 'ob-radio-btn',
        text: 'Custom',
        type: 'button',
        'data-len': 'custom'
      });
      customBtn.addEventListener('click', () => {
        $$('.ob-radio-btn', form).forEach(b => b.classList.remove('active'));
        customBtn.classList.add('active');
        const ci = $('#ob-custom-len');
        if (ci) ci.focus();
      });
      radioGroup.appendChild(customBtn);
      g2.appendChild(radioGroup);

      const customInput = el('input', {
        className: 'ob-input',
        type: 'number',
        id: 'ob-custom-len',
        placeholder: 'Custom number of days',
        min: '7',
        max: '366',
        style: 'margin-top: 8px'
      });
      g2.appendChild(customInput);
      form.appendChild(g2);

      // Session time
      const g3 = el('div', { className: 'ob-form-group' });
      g3.appendChild(el('label', { text: 'Session Time' }));
      g3.appendChild(el('input', {
        className: 'ob-input',
        type: 'time',
        id: 'ob-session',
        value: '09:00'
      }));
      g3.appendChild(el('div', { className: 'hint', text: 'When will you practice?' }));
      form.appendChild(g3);

      // Data entry time
      const g4 = el('div', { className: 'ob-form-group' });
      g4.appendChild(el('label', { text: 'Data Entry Time' }));
      g4.appendChild(el('input', {
        className: 'ob-input',
        type: 'time',
        id: 'ob-record',
        value: '21:00'
      }));
      g4.appendChild(el('div', { className: 'hint', text: 'When will you record metrics?' }));
      form.appendChild(g4);

      // Begin button
      const beginBtn = el('button', {
        className: 'ob-btn ob-btn-primary',
        text: 'Begin Practice \u2192',
        style: 'width: 100%; padding: 14px; margin-top: 8px; font-size: 0.95rem',
        type: 'button'
      });

      beginBtn.addEventListener('click', () => {
        const startDate = $('#ob-start').value;
        if (!startDate) { showToast('Please select a start date'); return; }

        // Determine length
        let programLength = 180;
        const activeRadio = $('.ob-radio-btn.active', form);
        if (activeRadio) {
          const lenAttr = activeRadio.getAttribute('data-len');
          if (lenAttr === 'custom') {
            const cv = parseInt($('#ob-custom-len').value);
            if (!cv || cv < 7) { showToast('Enter a valid number of days (7+)'); return; }
            programLength = cv;
          } else {
            programLength = parseInt(lenAttr);
          }
        }

        const config = {
          startDate: startDate,
          programLength: programLength,
          sessionTime: $('#ob-session').value || '09:00',
          recordTime: $('#ob-record').value || '21:00',
          onboardingComplete: true
        };

        saveConfig(config);
        const schedule = generateSchedule(config.startDate, config.programLength);
        saveSchedule(schedule);

        // Clean up breathing timeout
        if (breathingTimeout) clearTimeout(breathingTimeout);

        overlay.remove();
        initApp();
        showToast('Practice configured \u2713');
      });

      form.appendChild(beginBtn);
      container.appendChild(form);
    }

    renderStep();
  }

  /* ═══════════════════════════════════════════════════════
     MAIN APP
     ═══════════════════════════════════════════════════════ */

  function initApp() {
    appRoot = $('#app');
    appRoot.innerHTML = '';

    const config = getConfig();
    const schedule = getSchedule();

    // Find current day index
    const today = todayISO();
    const idx = schedule.findIndex(s => s.date === today);
    viewingDayIdx = idx >= 0 ? idx : 0;

    // Build app shell
    buildHeader(schedule);
    buildContent();
    buildTabBar();
    navigate('today');
  }

  function buildHeader(schedule) {
    const header = el('div', { className: 'app-header' });
    const row = el('div', { className: 'header-row' });
    row.appendChild(el('span', { className: 'header-brand', text: 'Spiritual Practice' }));

    const dayPill = el('span', { className: 'header-day-pill', id: 'header-day-pill' });
    row.appendChild(dayPill);
    header.appendChild(row);

    const progress = el('div', { className: 'header-progress' });
    progress.appendChild(el('div', {
      className: 'header-progress-fill',
      id: 'header-progress-fill'
    }));
    header.appendChild(progress);

    appRoot.appendChild(header);
    updateHeaderPill();
  }

  function updateHeaderPill() {
    const schedule = getSchedule();
    const metrics = getMetrics();
    const pill = $('#header-day-pill');
    const fill = $('#header-progress-fill');
    if (!pill || !schedule.length) return;

    // Count completed days
    const completedDays = Object.keys(metrics).length;
    pill.textContent = 'Day ' + (viewingDayIdx + 1);
    if (fill) {
      const pct = (completedDays / schedule.length) * 100;
      fill.style.width = Math.min(pct, 100) + '%';
    }
  }

  function buildContent() {
    const main = el('div', { className: 'app-main', id: 'app-main' });
    appRoot.appendChild(main);
  }

  function buildTabBar() {
    const bar = el('div', { className: 'tab-bar' });
    const tabs = [
      { id: 'today', icon: '\u25C9', label: 'Today' },
      { id: 'data', icon: '\uD83D\uDCCA', label: 'Data' },
      { id: 'setup', icon: '\u2699', label: 'Setup' }
    ];

    tabs.forEach(t => {
      const btn = el('button', {
        className: 'tab-btn' + (t.id === 'today' ? ' active' : ''),
        'data-tab': t.id
      });
      btn.appendChild(el('span', { className: 'tab-icon', text: t.icon }));
      btn.appendChild(document.createTextNode(t.label));
      btn.addEventListener('click', () => navigate(t.id));
      bar.appendChild(btn);
    });

    appRoot.appendChild(bar);
  }

  function navigate(tab) {
    currentTab = tab;
    const main = $('#app-main');
    if (!main) return;

    // Update tab bar active state
    $$('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });

    main.innerHTML = '';
    main.style.animation = 'none';
    void main.offsetHeight;
    main.style.animation = 'fadeUp 0.35s ease-out';

    switch (tab) {
      case 'today': renderToday(); break;
      case 'data': renderData(); break;
      case 'setup': renderSetup(); break;
    }

    updateHeaderPill();
  }

  /* ─── TODAY VIEW ────────────────────────────────────── */

  function renderToday() {
    const main = $('#app-main');
    const schedule = getSchedule();
    const config = getConfig();

    if (!config || !schedule.length) {
      renderEmptyState(main, 'No practice configured yet.');
      return;
    }

    const entry = schedule[viewingDayIdx];
    if (!entry) return;

    const isA = entry.dayType === 'A';
    const metrics = getMetrics();
    const dayMetrics = metrics[entry.date] || null;

    // Day navigation
    const dayNav = el('div', { className: 'day-nav' });
    const prevBtn = el('button', {
      className: 'day-nav-btn',
      text: '\u2190',
      onClick: () => {
        viewingDayIdx = Math.max(0, viewingDayIdx - 1);
        navigate('today');
      }
    });
    if (viewingDayIdx === 0) prevBtn.disabled = true;

    const banner = el('div', { className: 'day-banner', style: 'flex:1' });
    banner.appendChild(el('div', {
      className: 'day-banner-number',
      text: 'Day ' + entry.dayNumber + ' of ' + schedule.length
    }));
    banner.appendChild(el('div', {
      className: 'day-banner-type ' + (isA ? 'type-a' : 'type-b'),
      text: isA ? 'A Day \u2014 Invitation' : 'B Day \u2014 Baseline'
    }));
    banner.appendChild(el('div', {
      className: 'day-banner-date',
      text: friendlyDate(entry.date)
    }));

    const nextBtn = el('button', {
      className: 'day-nav-btn',
      text: '\u2192',
      onClick: () => {
        viewingDayIdx = Math.min(schedule.length - 1, viewingDayIdx + 1);
        navigate('today');
      }
    });
    if (viewingDayIdx >= schedule.length - 1) nextBtn.disabled = true;

    dayNav.appendChild(prevBtn);
    dayNav.appendChild(banner);
    dayNav.appendChild(nextBtn);
    main.appendChild(dayNav);

    // Practice guide
    main.appendChild(el('div', {
      className: 'practice-section-title',
      text: 'Practice Guide'
    }));

    const accordion = el('div', { className: 'practice-accordion' });
    const steps = isA ? A_DAY_STEPS : B_DAY_STEPS;

    steps.forEach((s, i) => {
      const step = el('div', { className: 'practice-step' });
      const header = el('div', { className: 'practice-step-header' });
      header.appendChild(el('div', {
        className: 'practice-step-num ' + (isA ? 'type-a-num' : 'type-b-num'),
        text: String(i + 1)
      }));
      header.appendChild(el('span', { className: 'practice-step-title', text: s.title }));
      header.appendChild(el('span', { className: 'practice-step-chevron', text: '\u25B6' }));

      const body = el('div', { className: 'practice-step-body' });
      body.appendChild(el('div', { className: 'practice-step-content', text: s.detail }));

      step.appendChild(header);
      step.appendChild(body);
      step.addEventListener('click', () => {
        step.classList.toggle('expanded');
      });
      accordion.appendChild(step);
    });

    main.appendChild(accordion);

    // Metrics section
    if (dayMetrics) {
      renderSavedMetrics(main, entry.date, dayMetrics);
    } else {
      renderMetricsForm(main, entry.date, null);
    }
  }

  function renderSavedMetrics(main, date, m) {
    const card = el('div', { className: 'saved-metrics-card' });

    const header = el('div', { className: 'saved-metrics-header' });
    header.appendChild(el('span', { className: 'saved-check', text: '\u2713' }));
    header.appendChild(el('span', { className: 'saved-title', text: 'Metrics Recorded' }));
    card.appendChild(header);

    const row1 = el('div', { className: 'saved-stat-row' });
    row1.appendChild(el('span', {
      className: 'saved-stat',
      html: 'Mood: <strong>' + m.mood + '</strong>/10'
    }));
    row1.appendChild(el('span', {
      className: 'saved-stat',
      html: 'Groundedness: <strong>' + m.ground + '</strong>/10'
    }));
    card.appendChild(row1);

    const row2 = el('div', { className: 'saved-stat-row' });
    const urgeLabels = [
      { key: 'pornUrge', name: 'Porn' },
      { key: 'mastUrge', name: 'Mast' },
      { key: 'cigUrge', name: 'Cig' },
      { key: 'weedUrge', name: 'Weed' }
    ];
    urgeLabels.forEach(u => {
      row2.appendChild(el('span', {
        className: 'saved-stat',
        html: u.name + ': <strong>' + (m[u.key] || 0) + '</strong>'
      }));
    });
    card.appendChild(row2);

    // Show behaviors if any
    const behaviors = [];
    if (m.pornUsed) behaviors.push('Pornography');
    if (m.mastUsed) behaviors.push('Masturbation');
    if (m.cigUsed) behaviors.push('Cigarettes');
    if (m.weedUsed) behaviors.push('Marijuana');
    if (behaviors.length) {
      card.appendChild(el('div', {
        className: 'saved-stat',
        style: 'color: var(--danger); margin-top: 4px; font-size: 0.78rem',
        text: 'Behaviors: ' + behaviors.join(', ')
      }));
    }

    if (m.notes) {
      card.appendChild(el('div', { className: 'saved-notes', text: '"' + m.notes + '"' }));
    }

    card.appendChild(el('button', {
      className: 'btn-edit',
      text: 'Edit Metrics',
      onClick: () => {
        const main = $('#app-main');
        main.innerHTML = '';
        main.style.animation = 'none';
        void main.offsetHeight;
        main.style.animation = 'fadeUp 0.35s ease-out';
        renderMetricsForm(main, date, m, true);
      }
    }));

    main.appendChild(card);
  }

  function renderMetricsForm(main, date, existing, isEdit) {
    const section = el('div', { className: 'metrics-section' });
    section.appendChild(el('div', { className: 'metrics-title', text: 'Evening Metrics' }));

    // Urge tracking
    const urgeCard = el('div', { className: 'metrics-card' });
    urgeCard.appendChild(el('div', { className: 'metrics-card-label', text: 'Urge Tracking' }));

    const urges = [
      { key: 'pornUrge', label: 'Pornography urge' },
      { key: 'mastUrge', label: 'Masturbation urge' },
      { key: 'cigUrge', label: 'Cigarette urge' },
      { key: 'weedUrge', label: 'Marijuana urge' }
    ];

    urges.forEach(u => {
      const g = el('div', { className: 'slider-group' });
      const labelRow = el('div', { className: 'slider-label' });
      labelRow.appendChild(el('span', { className: 'slider-label-text', text: u.label }));
      const valSpan = el('span', {
        className: 'slider-label-value',
        id: 'val-' + u.key,
        text: existing ? String(existing[u.key] || 0) : '0'
      });
      labelRow.appendChild(valSpan);
      g.appendChild(labelRow);

      const slider = el('input', {
        type: 'range',
        min: '0',
        max: '10',
        value: existing ? String(existing[u.key] || 0) : '0',
        id: 'sl-' + u.key
      });
      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
      });
      g.appendChild(slider);

      const hints = el('div', { className: 'slider-hints' });
      hints.appendChild(el('span', { className: 'slider-hint', text: '0 \u2014 none' }));
      hints.appendChild(el('span', { className: 'slider-hint', text: '10 \u2014 extreme' }));
      g.appendChild(hints);

      urgeCard.appendChild(g);
    });
    section.appendChild(urgeCard);

    // Behavior tracking
    const behavCard = el('div', { className: 'metrics-card' });
    behavCard.appendChild(el('div', { className: 'metrics-card-label', text: 'Behavior Tracking' }));

    const toggleGroup = el('div', { className: 'toggle-group' });
    const behaviors = [
      { key: 'pornUsed', label: 'Pornography' },
      { key: 'mastUsed', label: 'Masturbation' },
      { key: 'cigUsed', label: 'Cigarettes' },
      { key: 'weedUsed', label: 'Marijuana' }
    ];

    behaviors.forEach(b => {
      const row = el('div', { className: 'toggle-row' });
      row.appendChild(el('span', { className: 'toggle-label-text', text: b.label }));

      const isYes = existing ? existing[b.key] : false;
      const btn = el('button', {
        className: 'toggle-btn ' + (isYes ? 'state-yes' : 'state-no'),
        text: isYes ? 'Yes' : 'No',
        type: 'button',
        id: 'tog-' + b.key
      });
      btn.addEventListener('click', () => {
        const wasYes = btn.classList.contains('state-yes');
        btn.classList.toggle('state-yes', !wasYes);
        btn.classList.toggle('state-no', wasYes);
        btn.textContent = wasYes ? 'No' : 'Yes';
      });
      row.appendChild(btn);
      toggleGroup.appendChild(row);
    });
    behavCard.appendChild(toggleGroup);
    section.appendChild(behavCard);

    // Wellbeing
    const wellCard = el('div', { className: 'metrics-card' });
    wellCard.appendChild(el('div', { className: 'metrics-card-label', text: 'Wellbeing' }));

    const wellSliders = [
      { key: 'mood', label: 'Mood & Clarity', low: '0 \u2014 very low', high: '10 \u2014 excellent' },
      { key: 'ground', label: 'Spiritual Groundedness', low: '0 \u2014 disconnected', high: '10 \u2014 deeply connected' }
    ];

    wellSliders.forEach(w => {
      const g = el('div', { className: 'slider-group' });
      const labelRow = el('div', { className: 'slider-label' });
      labelRow.appendChild(el('span', { className: 'slider-label-text', text: w.label }));
      const valSpan = el('span', {
        className: 'slider-label-value',
        id: 'val-' + w.key,
        text: existing ? String(existing[w.key] || 5) : '5'
      });
      labelRow.appendChild(valSpan);
      g.appendChild(labelRow);

      const slider = el('input', {
        type: 'range',
        min: '0',
        max: '10',
        value: existing ? String(existing[w.key] || 5) : '5',
        id: 'sl-' + w.key
      });
      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
      });
      g.appendChild(slider);

      const hints = el('div', { className: 'slider-hints' });
      hints.appendChild(el('span', { className: 'slider-hint', text: w.low }));
      hints.appendChild(el('span', { className: 'slider-hint', text: w.high }));
      g.appendChild(hints);

      wellCard.appendChild(g);
    });
    section.appendChild(wellCard);

    // Notes
    const notesCard = el('div', { className: 'metrics-card' });
    notesCard.appendChild(el('div', { className: 'metrics-card-label', text: 'Notes' }));
    const textarea = el('textarea', {
      className: 'metrics-textarea',
      placeholder: 'Observations, experiences, insights...',
      id: 'metrics-notes',
      rows: '3'
    });
    if (existing && existing.notes) textarea.value = existing.notes;
    notesCard.appendChild(textarea);
    section.appendChild(notesCard);

    // Save button
    const saveBtn = el('button', {
      className: 'btn-save',
      text: 'Save Metrics \u2713',
      onClick: () => {
        const metrics = getMetrics();
        const entry = {
          pornUrge: parseInt($('#sl-pornUrge').value) || 0,
          mastUrge: parseInt($('#sl-mastUrge').value) || 0,
          cigUrge: parseInt($('#sl-cigUrge').value) || 0,
          weedUrge: parseInt($('#sl-weedUrge').value) || 0,
          pornUsed: $('#tog-pornUsed').classList.contains('state-yes'),
          mastUsed: $('#tog-mastUsed').classList.contains('state-yes'),
          cigUsed: $('#tog-cigUsed').classList.contains('state-yes'),
          weedUsed: $('#tog-weedUsed').classList.contains('state-yes'),
          mood: parseInt($('#sl-mood').value) || 5,
          ground: parseInt($('#sl-ground').value) || 5,
          notes: $('#metrics-notes').value.trim(),
          timestamp: new Date().toISOString()
        };
        metrics[date] = entry;
        saveMetrics(metrics);
        showToast('Metrics saved \u2713');
        navigate('today');
      }
    });
    section.appendChild(saveBtn);

    // Cancel button if editing
    if (isEdit) {
      section.appendChild(el('button', {
        className: 'btn-edit',
        text: 'Cancel',
        style: 'width: 100%; text-align: center; margin-top: 8px',
        onClick: () => navigate('today')
      }));
    }

    main.appendChild(section);
  }

  /* ─── DATA VIEW ─────────────────────────────────────── */

  function renderData() {
    const main = $('#app-main');
    const schedule = getSchedule();
    const metrics = getMetrics();

    const headerDiv = el('div', { className: 'data-header' });
    headerDiv.appendChild(el('h2', { className: 'data-title', text: 'Practice Data' }));

    const dates = Object.keys(metrics).sort((a, b) => b.localeCompare(a));

    if (!dates.length) {
      headerDiv.appendChild(el('p', { className: 'data-subtitle', text: 'No metrics recorded yet.' }));
      main.appendChild(headerDiv);
      renderEmptyState(main, 'Record your first day\'s metrics to see data here.');
      return;
    }

    headerDiv.appendChild(el('p', {
      className: 'data-subtitle',
      text: dates.length + ' day' + (dates.length !== 1 ? 's' : '') + ' with data'
    }));
    main.appendChild(headerDiv);

    // Summary stats
    let totalMood = 0, totalGround = 0, count = 0, adherence = 0;
    const schedDates = schedule.map(s => s.date);

    dates.forEach(d => {
      const m = metrics[d];
      totalMood += Number(m.mood || 0);
      totalGround += Number(m.ground || 0);
      count++;
    });

    // Adherence = days with metrics / total days so far
    const today = todayISO();
    const daysPassed = schedule.filter(s => s.date <= today).length;
    adherence = daysPassed > 0 ? Math.round((count / daysPassed) * 100) : 0;

    const statsGrid = el('div', { className: 'stats-grid' });

    const stats = [
      { value: String(count), label: 'Days Completed' },
      { value: adherence + '%', label: 'Adherence' },
      { value: count > 0 ? (totalMood / count).toFixed(1) : '\u2014', label: 'Avg Mood' },
      { value: count > 0 ? (totalGround / count).toFixed(1) : '\u2014', label: 'Avg Groundedness' }
    ];

    stats.forEach(s => {
      const card = el('div', { className: 'stat-card' });
      card.appendChild(el('div', { className: 'stat-value', text: s.value }));
      card.appendChild(el('div', { className: 'stat-label', text: s.label }));
      statsGrid.appendChild(card);
    });

    main.appendChild(statsGrid);

    // Day-by-day log
    main.appendChild(el('div', { className: 'day-log-title', text: 'Day-by-Day Log' }));

    const log = el('div', { className: 'day-log' });

    dates.forEach(d => {
      const m = metrics[d];
      const schedEntry = schedule.find(s => s.date === d);
      const dayType = schedEntry ? schedEntry.dayType : '?';

      const item = el('div', { className: 'day-log-item' });

      const dateEl = el('span', { className: 'day-log-date', text: shortDate(d) });
      const badge = el('span', {
        className: 'day-log-badge ' + (dayType === 'A' ? 'log-a' : 'log-b'),
        text: dayType
      });
      const scores = el('span', {
        className: 'day-log-scores',
        text: 'M:' + (m.mood || 0) + ' G:' + (m.ground || 0)
      });

      const flags = el('div', { className: 'day-log-flags' });
      if (m.pornUsed) flags.appendChild(el('div', { className: 'day-log-flag' }));
      if (m.mastUsed) flags.appendChild(el('div', { className: 'day-log-flag' }));
      if (m.cigUsed) flags.appendChild(el('div', { className: 'day-log-flag' }));
      if (m.weedUsed) flags.appendChild(el('div', { className: 'day-log-flag' }));

      // Detail section
      const detail = el('div', { className: 'day-log-detail' });
      let detailText = 'Urges: Porn ' + (m.pornUrge || 0) +
        ', Mast ' + (m.mastUrge || 0) +
        ', Cig ' + (m.cigUrge || 0) +
        ', Weed ' + (m.weedUrge || 0);
      const behavList = [];
      if (m.pornUsed) behavList.push('Porn');
      if (m.mastUsed) behavList.push('Mast');
      if (m.cigUsed) behavList.push('Cig');
      if (m.weedUsed) behavList.push('Weed');
      if (behavList.length) detailText += '\nBehaviors: ' + behavList.join(', ');
      if (m.notes) detailText += '\nNotes: ' + m.notes;
      detail.textContent = detailText;

      item.appendChild(dateEl);
      item.appendChild(badge);
      item.appendChild(scores);
      item.appendChild(flags);
      item.appendChild(detail);

      item.addEventListener('click', () => {
        item.classList.toggle('expanded');
      });

      log.appendChild(item);
    });

    main.appendChild(log);

    // Export CSV
    main.appendChild(el('button', {
      className: 'btn-export',
      text: '\u2193 Export CSV',
      onClick: () => exportCSV()
    }));
  }

  function exportCSV() {
    const schedule = getSchedule();
    const metrics = getMetrics();
    const headers = [
      'date', 'dayNumber', 'dayType',
      'pornUrge', 'mastUrge', 'cigUrge', 'weedUrge',
      'pornUsed', 'mastUsed', 'cigUsed', 'weedUsed',
      'mood', 'ground', 'notes'
    ];
    let csv = headers.join(',') + '\n';

    schedule.forEach(s => {
      const m = metrics[s.date] || {};
      const row = [
        s.date,
        s.dayNumber,
        s.dayType,
        m.pornUrge != null ? m.pornUrge : '',
        m.mastUrge != null ? m.mastUrge : '',
        m.cigUrge != null ? m.cigUrge : '',
        m.weedUrge != null ? m.weedUrge : '',
        m.pornUsed != null ? m.pornUsed : '',
        m.mastUsed != null ? m.mastUsed : '',
        m.cigUsed != null ? m.cigUsed : '',
        m.weedUsed != null ? m.weedUsed : '',
        m.mood != null ? m.mood : '',
        m.ground != null ? m.ground : '',
        '"' + ((m.notes || '').replace(/"/g, '""')) + '"'
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spiritual-practice-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV downloaded');
  }

  /* ─── SETUP VIEW ────────────────────────────────────── */

  function renderSetup() {
    const main = $('#app-main');
    const config = getConfig() || {};
    const schedule = getSchedule();

    main.appendChild(el('h2', { className: 'setup-title', text: 'Setup' }));

    // Current config card
    const card = el('div', { className: 'setup-card' });
    card.appendChild(el('div', { className: 'setup-card-title', text: 'Practice Configuration' }));

    const f1 = el('div', { className: 'setup-field' });
    f1.appendChild(el('label', { text: 'Start Date' }));
    f1.appendChild(el('input', {
      className: 'setup-input',
      type: 'date',
      id: 'setup-start',
      value: config.startDate || todayISO()
    }));
    card.appendChild(f1);

    const f2 = el('div', { className: 'setup-field' });
    f2.appendChild(el('label', { text: 'Program Length (days)' }));
    f2.appendChild(el('input', {
      className: 'setup-input',
      type: 'number',
      id: 'setup-len',
      min: '7',
      max: '366',
      value: String(config.programLength || 180)
    }));
    card.appendChild(f2);

    const f3 = el('div', { className: 'setup-field' });
    f3.appendChild(el('label', { text: 'Session Time' }));
    f3.appendChild(el('input', {
      className: 'setup-input',
      type: 'time',
      id: 'setup-session',
      value: config.sessionTime || '09:00'
    }));
    card.appendChild(f3);

    const f4 = el('div', { className: 'setup-field' });
    f4.appendChild(el('label', { text: 'Data Entry Time' }));
    f4.appendChild(el('input', {
      className: 'setup-input',
      type: 'time',
      id: 'setup-record',
      value: config.recordTime || '21:00'
    }));
    card.appendChild(f4);

    // Schedule preview
    if (schedule.length) {
      card.appendChild(el('label', {
        style: 'display:block; font-size:0.72rem; font-weight:500; color:var(--text-muted); margin-top:12px; margin-bottom:6px',
        text: 'A/B Schedule Preview (first 30 days)'
      }));
      const preview = el('div', { className: 'schedule-preview' });
      const showCount = Math.min(30, schedule.length);
      for (let i = 0; i < showCount; i++) {
        preview.appendChild(el('div', {
          className: 'sched-dot ' + (schedule[i].dayType === 'A' ? 'a' : 'b'),
          title: schedule[i].date + ' (' + schedule[i].dayType + ')'
        }));
      }
      card.appendChild(preview);
    }

    // Update button
    card.appendChild(el('button', {
      className: 'btn-update',
      text: 'Update & Rebuild Schedule',
      style: 'margin-top: 16px',
      onClick: () => {
        const newConfig = {
          startDate: $('#setup-start').value,
          programLength: parseInt($('#setup-len').value) || 180,
          sessionTime: $('#setup-session').value || '09:00',
          recordTime: $('#setup-record').value || '21:00',
          onboardingComplete: true
        };
        saveConfig(newConfig);
        const newSchedule = generateSchedule(newConfig.startDate, newConfig.programLength);
        saveSchedule(newSchedule);

        // Reset viewing index
        const today = todayISO();
        const idx = newSchedule.findIndex(s => s.date === today);
        viewingDayIdx = idx >= 0 ? idx : 0;

        showToast('Schedule rebuilt \u2713');
        navigate('setup');
      }
    }));

    main.appendChild(card);

    // Danger zone
    main.appendChild(el('button', {
      className: 'btn-danger-outline',
      text: 'Reset All Data',
      onClick: () => {
        showConfirm(
          'Reset All Data?',
          'This will erase your entire practice history, schedule, and configuration. This cannot be undone.',
          () => {
            localStorage.removeItem(PREFIX + 'config');
            localStorage.removeItem(PREFIX + 'schedule');
            localStorage.removeItem(PREFIX + 'metrics');
            showToast('All data cleared');
            appRoot.innerHTML = '';
            runOnboarding();
          }
        );
      }
    }));

    // Re-run onboarding
    main.appendChild(el('button', {
      className: 'btn-link',
      text: 'Re-run Onboarding',
      onClick: () => {
        appRoot.innerHTML = '';
        runOnboarding();
      }
    }));

    // Version
    main.appendChild(el('div', { className: 'version-label', text: VERSION }));
  }

  /* ─── Empty State ───────────────────────────────────── */

  function renderEmptyState(container, text) {
    const empty = el('div', { className: 'empty-state' });
    empty.appendChild(el('div', { className: 'empty-icon', text: '\u25C9' }));
    empty.appendChild(el('p', { className: 'empty-text', text: text }));
    container.appendChild(empty);
  }

  /* ═══════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════ */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    appRoot = $('#app');
    const config = getConfig();

    if (config && config.onboardingComplete) {
      initApp();
    } else {
      runOnboarding();
    }
  });

})();
