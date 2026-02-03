(function() {
  // Utility: parse and format dates
  function toISODate(date) {
    return date.toISOString().split('T')[0];
  }
  function parseDate(str) {
    // str expected in yyyy-mm-dd
    const parts = str.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function dayTypeForDate(d) {
    // A-days: Mon (1), Wed (3), Fri (5), Sun (0)
    // B-days: Tue (2), Thu (4), Sat (6)
    const dow = d.getDay();
    return (dow === 1 || dow === 3 || dow === 5 || dow === 0) ? 'A' : 'B';
  }
  function getInstructions(dayType) {
    const baseIntro =
      'Step 1 – Safety & Kedushah:\nSettle yourself. Recite a short protective prayer (e.g., Kriat Shema) asking that only truth and goodness come forward.';
    const tiferet =
      'Step 2 – Tiferet Alignment:\nFocus on your heart center. Breathe slowly (inhale 4, exhale 6–8), repeating a word like “emet” on each inhale until you feel present and humble.';
    const invitation =
      'Step 3 – Invitation (A-day):\n“If there are beings permitted to help me toward purity and wholeness, I am open to receiving help in a way aligned with truth and goodness.” Then rest in silence.';
    const baseline =
      'Step 3 – Baseline (B-day):\nRest quietly and continue focusing on the breath. No invitation is extended on baseline days.';
    const closing =
      'Step 4 – Closing & Integration:\nThank whatever has arisen. Seal the session: “This session is complete. Only what serves truth and goodness remains.” Ground yourself by noticing your body and surroundings.';
    return [baseIntro, tiferet, dayType === 'A' ? invitation : baseline, closing].join('\n\n');
  }
  function computeSchedule(startDateStr, length) {
    const schedule = [];
    const startDate = parseDate(startDateStr);
    for (let i = 0; i < length; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateISO = toISODate(d);
      const dayType = dayTypeForDate(d);
      const instructions = getInstructions(dayType);
      schedule.push({ date: dateISO, dayType, instructions });
    }
    return schedule;
  }
  // Load and save helpers
  function loadConfig() {
    const c = localStorage.getItem('st_config');
    return c ? JSON.parse(c) : null;
  }
  function saveConfig(cfg) {
    localStorage.setItem('st_config', JSON.stringify(cfg));
  }
  function loadSchedule() {
    const s = localStorage.getItem('st_schedule');
    return s ? JSON.parse(s) : null;
  }
  function saveSchedule(schedule) {
    localStorage.setItem('st_schedule', JSON.stringify(schedule));
  }
  function loadMetrics() {
    const m = localStorage.getItem('st_metrics');
    return m ? JSON.parse(m) : {};
  }
  function saveMetrics(metrics) {
    localStorage.setItem('st_metrics', JSON.stringify(metrics));
  }

  // DOM elements
  const configSection = document.getElementById('configSection');
  const configForm = document.getElementById('configForm');
  const dailySection = document.getElementById('dailySection');
  const metricsSection = document.getElementById('metricsSection');
  const reviewSection = document.getElementById('reviewSection');
  const dateHeading = document.getElementById('dateHeading');
  const dayTypeDiv = document.getElementById('dayType');
  const instructionsDiv = document.getElementById('instructions');
  const recordMetricsBtn = document.getElementById('recordMetricsBtn');
  const previousDayBtn = document.getElementById('previousDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const viewExportBtn = document.getElementById('viewExportBtn');
  const metricsForm = document.getElementById('metricsForm');
  const cancelMetricsBtn = document.getElementById('cancelMetricsBtn');
  const dataTableContainer = document.getElementById('dataTableContainer');
  const exportCSVBtn = document.getElementById('exportCSVBtn');
  const closeReviewBtn = document.getElementById('closeReviewBtn');
  const yearSpan = document.getElementById('yearSpan');

  let schedule = [];
  let config = null;
  let metrics = {};
  let currentIndex = 0;

  // Show or hide sections
  function showSection(section) {
    [configSection, dailySection, metricsSection, reviewSection].forEach(sec => {
      if (sec === section) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    });
  }

  function init() {
    // year in footer
    yearSpan.textContent = new Date().getFullYear();
    // Service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function(err) {
        console.error('SW registration failed', err);
      });
    }
    // load config
    config = loadConfig();
    schedule = loadSchedule() || [];
    metrics = loadMetrics();
    if (!config || schedule.length === 0) {
      showSection(configSection);
    } else {
      // Determine currentIndex based on today
      const todayISO = toISODate(new Date());
      currentIndex = schedule.findIndex(item => item.date === todayISO);
      if (currentIndex < 0) currentIndex = 0;
      showSection(dailySection);
      displayDaily();
      scheduleNotifications();
    }
  }

  configForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const programLength = parseInt(document.getElementById('programLength').value, 10);
    const sessionTime = document.getElementById('sessionTime').value;
    const recordTime = document.getElementById('recordTime').value;
    config = { startDate, programLength, sessionTime, recordTime };
    saveConfig(config);
    schedule = computeSchedule(startDate, programLength);
    saveSchedule(schedule);
    metrics = {};
    saveMetrics(metrics);
    currentIndex = 0;
    showSection(dailySection);
    displayDaily();
    scheduleNotifications();
  });

  function displayDaily() {
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= schedule.length) currentIndex = schedule.length - 1;
    const entry = schedule[currentIndex];
    dateHeading.textContent = new Date(entry.date).toDateString();
    dayTypeDiv.textContent = entry.dayType === 'A' ? 'Invitation Day (A)' : 'Baseline Day (B)';
    instructionsDiv.textContent = entry.instructions;
    // disable nav buttons at boundaries
    previousDayBtn.disabled = currentIndex === 0;
    nextDayBtn.disabled = currentIndex === schedule.length - 1;
  }

  previousDayBtn.addEventListener('click', function() {
    currentIndex--;
    displayDaily();
  });
  nextDayBtn.addEventListener('click', function() {
    currentIndex++;
    displayDaily();
  });

  recordMetricsBtn.addEventListener('click', function() {
    showMetricsForm();
  });

  function showMetricsForm() {
    // populate form with existing data if available
    const entry = schedule[currentIndex];
    const metricKey = entry.date;
    const mData = metrics[metricKey] || {};
    metricsForm.pornUrge.value = mData.pornUrge ?? '';
    metricsForm.mastUrge.value = mData.mastUrge ?? '';
    metricsForm.cigUrge.value = mData.cigUrge ?? '';
    metricsForm.weedUrge.value = mData.weedUrge ?? '';
    metricsForm.pornUsed.value = mData.pornUsed ?? 'no';
    metricsForm.mastUsed.value = mData.mastUsed ?? 'no';
    metricsForm.cigUsed.value = mData.cigUsed ?? 'no';
    metricsForm.weedUsed.value = mData.weedUsed ?? 'no';
    metricsForm.mood.value = mData.mood ?? '';
    metricsForm.ground.value = mData.ground ?? '';
    metricsForm.notes.value = mData.notes ?? '';
    showSection(metricsSection);
  }

  metricsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const entry = schedule[currentIndex];
    const metricKey = entry.date;
    const formData = new FormData(metricsForm);
    const mEntry = {};
    for (const [key, value] of formData.entries()) {
      mEntry[key] = value;
    }
    metrics[metricKey] = mEntry;
    saveMetrics(metrics);
    showSection(dailySection);
  });

  cancelMetricsBtn.addEventListener('click', function() {
    showSection(dailySection);
  });

  viewExportBtn.addEventListener('click', function() {
    renderDataTable();
    showSection(reviewSection);
  });

  closeReviewBtn.addEventListener('click', function() {
    showSection(dailySection);
  });

  exportCSVBtn.addEventListener('click', function() {
    const csv = buildCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spiritual-practice-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  function renderDataTable() {
    // Build table from metrics
    const tbl = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['Date','Day type','Porn urge','Mast. urge','Cig. urge','Weed urge','Viewed porn','Masturbated','Smoked','Used weed','Mood','Ground','Notes'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    tbl.appendChild(headerRow);
    schedule.forEach(item => {
      const row = document.createElement('tr');
      const mData = metrics[item.date] || {};
      const fields = [
        item.date,
        item.dayType,
        mData.pornUrge ?? '',
        mData.mastUrge ?? '',
        mData.cigUrge ?? '',
        mData.weedUrge ?? '',
        mData.pornUsed ?? '',
        mData.mastUsed ?? '',
        mData.cigUsed ?? '',
        mData.weedUsed ?? '',
        mData.mood ?? '',
        mData.ground ?? '',
        mData.notes ?? ''
      ];
      fields.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        row.appendChild(td);
      });
      tbl.appendChild(row);
    });
    dataTableContainer.innerHTML = '';
    dataTableContainer.appendChild(tbl);
  }

  function buildCSV() {
    // Build CSV string
    const headers = ['date','dayType','pornUrge','mastUrge','cigUrge','weedUrge','pornUsed','mastUsed','cigUsed','weedUsed','mood','ground','notes'];
    let lines = [headers.join(',')];
    schedule.forEach(item => {
      const mData = metrics[item.date] || {};
      const row = [
        item.date,
        item.dayType,
        mData.pornUrge ?? '',
        mData.mastUrge ?? '',
        mData.cigUrge ?? '',
        mData.weedUrge ?? '',
        mData.pornUsed ?? '',
        mData.mastUsed ?? '',
        mData.cigUsed ?? '',
        mData.weedUsed ?? '',
        mData.mood ?? '',
        mData.ground ?? '',
        (mData.notes ? '"' + mData.notes.replace(/"/g,'""') + '"' : '')
      ];
      lines.push(row.join(','));
    });
    return lines.join('\n');
  }

  function scheduleNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          scheduleNotificationsInternal();
        }
      });
    } else {
      scheduleNotificationsInternal();
    }
  }
  function scheduleNotificationsInternal() {
    // Clear any existing timers
    if (window._stTimers) {
      window._stTimers.forEach(t => clearTimeout(t));
    }
    window._stTimers = [];
    const now = new Date();
    // schedule notifications for next 7 days or program length whichever smaller
    const upcoming = schedule.slice(currentIndex, currentIndex + 7);
    upcoming.forEach(item => {
      // schedule session reminder
      const sessionDateTime = new Date(item.date + 'T' + config.sessionTime);
      if (sessionDateTime > now) {
        const diff = sessionDateTime - now;
        window._stTimers.push(setTimeout(() => {
          new Notification('Time for your spiritual session', {
            body: 'Day ' + (item.dayType === 'A' ? 'Invitation (A)' : 'Baseline (B)') + ' session. Open the tracker to follow your practice.',
            icon: 'icon-192x192.png'
          });
        }, diff));
      }
      // schedule data entry reminder
      const recordDateTime = new Date(item.date + 'T' + config.recordTime);
      if (recordDateTime > now) {
        const diff2 = recordDateTime - now;
        window._stTimers.push(setTimeout(() => {
          new Notification('Time to record your metrics', {
            body: 'Reflect on your day and record your metrics in the tracker.',
            icon: 'icon-192x192.png'
          });
        }, diff2));
      }
    });
  }

  // Kick off
  document.addEventListener('DOMContentLoaded', init);
})();
