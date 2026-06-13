// ▼▼▼  PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE  ▼▼▼
    const firebaseConfig = {
      apiKey:            "TU_API_KEY",
      authDomain:        "TU_PROYECTO.firebaseapp.com",
      databaseURL:       "https://TU_PROYECTO-default-rtdb.firebaseio.com",
      projectId:         "TU_PROYECTO",
      storageBucket:     "TU_PROYECTO.appspot.com",
      messagingSenderId: "TU_SENDER_ID",
      appId:             "TU_APP_ID"
    };
    // ▲▲▲  FIN DE CONFIGURACIÓN  ▲▲▲
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

/* ══════════════════════════════════════════════════════════════
       RULETA QUINIELA MUNDIAL 2026 · app.js inline
       ══════════════════════════════════════════════════════════════ */

    const ALL_TEAMS = [
      { team: 'México',                group: 'Grupo A' },
      { team: 'Sudáfrica',             group: 'Grupo A' },
      { team: 'Corea del Sur',         group: 'Grupo A' },
      { team: 'República Checa',       group: 'Grupo A' },
      { team: 'Canadá',                group: 'Grupo B' },
      { team: 'Bosnia y Herzegovina',  group: 'Grupo B' },
      { team: 'Qatar',                 group: 'Grupo B' },
      { team: 'Suiza',                 group: 'Grupo B' },
      { team: 'Brasil',                group: 'Grupo C' },
      { team: 'Marruecos',             group: 'Grupo C' },
      { team: 'Haití',                 group: 'Grupo C' },
      { team: 'Escocia',               group: 'Grupo C' },
      { team: 'Estados Unidos',        group: 'Grupo D' },
      { team: 'Paraguay',              group: 'Grupo D' },
      { team: 'Australia',             group: 'Grupo D' },
      { team: 'Turquía',               group: 'Grupo D' },
      { team: 'Alemania',              group: 'Grupo E' },
      { team: 'Curazao',               group: 'Grupo E' },
      { team: 'Costa de Marfil',       group: 'Grupo E' },
      { team: 'Ecuador',               group: 'Grupo E' },
      { team: 'Países Bajos',          group: 'Grupo F' },
      { team: 'Japón',                 group: 'Grupo F' },
      { team: 'Suecia',                group: 'Grupo F' },
      { team: 'Túnez',                 group: 'Grupo F' },
      { team: 'Bélgica',               group: 'Grupo G' },
      { team: 'Egipto',                group: 'Grupo G' },
      { team: 'Irán',                  group: 'Grupo G' },
      { team: 'Nueva Zelanda',         group: 'Grupo G' },
      { team: 'España',                group: 'Grupo H' },
      { team: 'Cabo Verde',            group: 'Grupo H' },
      { team: 'Arabia Saudita',        group: 'Grupo H' },
      { team: 'Uruguay',               group: 'Grupo H' },
      { team: 'Francia',               group: 'Grupo I' },
      { team: 'Senegal',               group: 'Grupo I' },
      { team: 'Irak',                  group: 'Grupo I' },
      { team: 'Noruega',               group: 'Grupo I' },
      { team: 'Argentina',             group: 'Grupo J' },
      { team: 'Argelia',               group: 'Grupo J' },
      { team: 'Austria',               group: 'Grupo J' },
      { team: 'Jordania',              group: 'Grupo J' },
      { team: 'Portugal',              group: 'Grupo K' },
      { team: 'RD Congo',              group: 'Grupo K' },
      { team: 'Uzbekistán',            group: 'Grupo K' },
      { team: 'Colombia',              group: 'Grupo K' },
      { team: 'Inglaterra',            group: 'Grupo L' },
      { team: 'Croacia',               group: 'Grupo L' },
      { team: 'Ghana',                 group: 'Grupo L' },
      { team: 'Panamá',                group: 'Grupo L' },
    ];

    const WHEEL_COLORS = [
      '#1a6b2f','#2d8a45','#f5d020','#e8b800',
      '#155527','#3aad5e','#c8a800','#1f7d36',
      '#f0c800','#236130','#4abf6e','#dba800',
    ];

    let activeTeams   = [...ALL_TEAMS];
    let eliminatedArr = [];
    let historyArr    = [];
    let spinning      = false;
    let currentResult = null;
    let wheelAngle    = 0;
    let animFrameId   = null;

    const SESSION_NAME = 'Usuario ' + Math.floor(Math.random() * 900 + 100);

    const canvas = document.getElementById('wheelCanvas');
    const ctx    = canvas.getContext('2d');
    const SIZE   = canvas.width;
    const CX     = SIZE / 2;
    const CY     = SIZE / 2;
    const RADIUS = SIZE / 2 - 4;

    /* ── Firebase refs ── */
    const stateRef    = db.ref('quiniela/state');
    const historyRef  = db.ref('quiniela/history');
    const presenceRef = db.ref('quiniela/presence/' + SESSION_NAME);

    /* ── Presencia ── */
    presenceRef.set(true);
    presenceRef.onDisconnect().remove();
    db.ref('quiniela/presence').on('value', snap => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      document.getElementById('syncUsers').textContent =
        count + (count === 1 ? ' usuario en línea' : ' usuarios en línea');
    });

    /* ── Escucha estado ── */
    stateRef.on('value', snap => {
      if (!snap.exists()) { initFirebaseState(); return; }
      applyState(snap.val());
      setSyncStatus('online');
    }, err => {
      setSyncStatus('offline');
      showToast('⚠️ Sin conexión — trabajando localmente');
    });

    /* ── Escucha historial ── */
    historyRef.on('value', snap => {
      historyArr = [];
      if (snap.exists()) {
        historyArr = Object.values(snap.val()).sort((a,b) => b.ts - a.ts).slice(0, 30);
      }
      renderHistory();
    });

    function initFirebaseState() {
      stateRef.set({ active: ALL_TEAMS.map(t => t.team), eliminated: [], lastResult: null });
    }

    function applyState(data) {
      const activeNames = data.active     || ALL_TEAMS.map(t => t.team);
      const elimNames   = data.eliminated || [];
      activeTeams   = ALL_TEAMS.filter(t => activeNames.includes(t.team));
      eliminatedArr = ALL_TEAMS.filter(t => elimNames.includes(t.team));
      currentResult = data.lastResult || null;
      updateCounts();
      drawWheel();
      renderEliminated();
      if (currentResult && !spinning) renderResult(currentResult);
      else if (!spinning) showIdleCard();
    }

    function saveState(lastResult) {
      setSyncStatus('syncing');
      stateRef.set({
        active:     activeTeams.map(t => t.team),
        eliminated: eliminatedArr.map(t => t.team),
        lastResult: lastResult || null,
      }).then(() => setSyncStatus('online'))
        .catch(() => { setSyncStatus('offline'); showToast('Error al guardar'); });
    }

    function pushHistory(entry) { historyRef.push(entry); }

    /* ── Nombres cortos para la rueda ── */
    const NAME_MAP = {
      'Bosnia y Herzegovina': 'Bosnia',
      'República Checa':      'Rep. Checa',
      'Costa de Marfil':      'C. Marfil',
      'Estados Unidos':       'EE.UU.',
      'Países Bajos':         'P. Bajos',
      'Nueva Zelanda':        'N. Zelanda',
      'Arabia Saudita':       'A. Saudita',
      'RD Congo':             'R.D. Congo',
    };
    function shortName(n) { return NAME_MAP[n] || n; }

    /* ── Dibujar rueda ── */
    function drawWheel() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const n = activeTeams.length;
      if (n === 0) {
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath(); ctx.arc(CX, CY, RADIUS, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#9ca3af'; ctx.font = '16px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Sin equipos', CX, CY+6);
        return;
      }
      const slice = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const s = wheelAngle + i * slice, e = s + slice;
        ctx.beginPath(); ctx.moveTo(CX,CY); ctx.arc(CX,CY,RADIUS,s,e); ctx.closePath();
        ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.save(); ctx.translate(CX,CY); ctx.rotate(s + slice/2); ctx.textAlign = 'right';
        const label = shortName(activeTeams[i].team);
        const fs = n>32?7:n>20?8.5:n>12?10:11;
        ctx.font = `500 ${fs}px Inter,sans-serif`; ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 2;
        ctx.fillText(label, RADIUS-8, fs*0.38); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(CX,CY,26,0,Math.PI*2);
      ctx.fillStyle='#f5d020'; ctx.shadowColor='rgba(0,0,0,0.25)'; ctx.shadowBlur=8; ctx.fill();
      ctx.strokeStyle='#1a6b2f'; ctx.lineWidth=3; ctx.stroke(); ctx.shadowBlur=0;
    }

    /* ── Girar ── */
    function spinWheel() {
      if (spinning || activeTeams.length === 0) return;
      spinning = true; setSyncStatus('syncing');
      document.getElementById('spinBtn').disabled = true;
      showIdleCard(true);
      const totalRot = (9 + Math.random()*7) * Math.PI*2;
      const duration = 3800 + Math.random()*1600;
      const startAngle = wheelAngle, startTime = performance.now();
      function easeOut(t) { return 1 - Math.pow(1-t, 3); }
      function frame(now) {
        const p = Math.min((now-startTime)/duration, 1);
        wheelAngle = startAngle + totalRot * easeOut(p);
        drawWheel();
        if (p < 1) animFrameId = requestAnimationFrame(frame);
        else finishSpin();
      }
      animFrameId = requestAnimationFrame(frame);
    }

    function finishSpin() {
      spinning = false;
      document.getElementById('spinBtn').disabled = false;
      const n = activeTeams.length, slice = (Math.PI*2)/n, top = -Math.PI/2;
      let a = ((top - wheelAngle) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
      const winner = activeTeams[Math.floor(a/slice) % n];
      currentResult = { ...winner, spunBy: SESSION_NAME };
      renderResult(currentResult);
      autoAssign(winner.team, winner.group);
    renderPeople();
      saveState(currentResult);
      pushHistory({ team: winner.team, group: winner.group, spunBy: SESSION_NAME, eliminated: false, ts: Date.now() });
      showToast('⚽ ' + winner.team + ' · ' + winner.group);
    }

    /* ── Eliminar ── */
    function eliminateResult() {
      if (!currentResult) return;
      const idx = activeTeams.findIndex(t => t.team === currentResult.team);
      if (idx === -1) return;
      const entry = activeTeams[idx];
      eliminatedArr.push(entry); activeTeams.splice(idx,1); currentResult = null;
      if (activeTeams.length === 0) {
        document.getElementById('spinBtn').disabled = true;
        document.getElementById('spinBtn').textContent = 'Sin equipos';
      }
      updateCounts(); drawWheel(); renderEliminated(); showIdleCard(); saveState(null);
      pushHistory({ team: entry.team, group: entry.group, spunBy: SESSION_NAME, eliminated: true, ts: Date.now() });
      showToast('🚫 ' + entry.team + ' eliminado');
    }

    /* ── Restaurar ── */
    function restoreTeam(teamName) {
      const idx = eliminatedArr.findIndex(t => t.team === teamName);
      if (idx === -1) return;
      const entry = eliminatedArr[idx];
      activeTeams.push(entry); eliminatedArr.splice(idx,1);
      updateCounts(); drawWheel(); renderEliminated(); saveState(currentResult);
      document.getElementById('spinBtn').disabled = false;
      document.getElementById('spinBtn').innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Girar ruleta';
      showToast('✅ ' + entry.team + ' restaurado');
    }

    function clearHistory() {
      if (!confirm('¿Limpiar todo el historial de giros?')) return;
      historyRef.remove().then(() => showToast('Historial limpiado'));
    }

    /* ── Render: result ── */
    function showIdleCard(isSpinning = false) {
      document.getElementById('resultCard').innerHTML = isSpinning
        ? `<div class="result-idle"><div class="result-idle-icon">🌀</div><p class="result-idle-text">Girando...</p></div>`
        : `<div class="result-idle"><div class="result-idle-icon">🏆</div><p class="result-idle-text">Gira la ruleta para seleccionar un equipo</p></div>`;
    }

    function renderResult(item) {
      const isElim = eliminatedArr.some(t => t.team === item.team);
      const byLine = item.spunBy ? `<p class="result-user">Girado por <strong>${escHtml(item.spunBy)}</strong></p>` : '';
      const btn = !isElim
        ? `<button class="btn-eliminate" onclick="eliminateResult()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Eliminar equipo</button>`
        : `<span style="font-size:12px;color:#9ca3af;font-style:italic">Ya eliminado</span>`;
      document.getElementById('resultCard').innerHTML = `
        <div class="result-content">
          <div class="result-eyebrow">¡Equipo seleccionado!</div>
          <div class="result-team-name">${escHtml(item.team)}</div>
          <div class="result-group-tag">${escHtml(item.group)}</div>
          ${byLine}${btn}
        </div>`;
    }

    /* ── Render: eliminados ── */
    function renderEliminated() {
      document.getElementById('elimBadge').textContent = eliminatedArr.length;
      document.getElementById('elimGrid').innerHTML = eliminatedArr.length === 0
        ? '<div class="elim-empty">Ningún equipo eliminado aún</div>'
        : eliminatedArr.map(t =>
            `<div class="elim-tag" onclick="restoreTeam('${escAttr(t.team)}')" title="Restaurar ${escAttr(t.team)}">${escHtml(t.team)}<span class="restore-icon" aria-hidden="true">↩</span></div>`
          ).join('');
    }

    /* ── Render: historial ── */
    function renderHistory() {
      const list = document.getElementById('historyList');
      if (historyArr.length === 0) { list.innerHTML = '<li class="history-empty">Sin giros todavía</li>'; return; }
      list.innerHTML = historyArr.map((h,i) => {
        const time = new Date(h.ts).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
        const eTag = h.eliminated ? '<span class="history-eliminated">eliminado</span>' : '';
        return `<li class="history-item">
          <span class="history-num">${historyArr.length-i}</span>
          <span><span class="history-team">${escHtml(h.team)}</span><span class="history-group"> · ${escHtml(h.group)}</span>${eTag}</span>
          <span class="history-by">${escHtml(h.spunBy||'—')}</span>
          <span class="history-time">${time}</span>
        </li>`;
      }).join('');
    }

    /* ── Helpers ── */
    function updateCounts() {
      document.getElementById('activeCount').textContent = activeTeams.length;
      document.getElementById('elimCount').textContent   = eliminatedArr.length;
    }
    function setSyncStatus(s) {
      const dot = document.getElementById('syncDot'), lbl = document.getElementById('syncLabel');
      dot.className = 'sync-dot ' + s;
      lbl.textContent = s==='online'?'Sincronizado':s==='offline'?'Sin conexión':'Guardando...';
    }
    let toastTimer;
    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg; el.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }
    function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function escAttr(s) { return String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }


    /* ══ PARTICIPANTES — localStorage (funciona sin Firebase) ══ */
    let peopleArr = JSON.parse(localStorage.getItem('quinielaPeople') || '[]');

    function savePeople() {
      localStorage.setItem('quinielaPeople', JSON.stringify(peopleArr));
    }

    function addPerson() {
      const inp  = document.getElementById('personInput');
      const name = inp.value.trim();
      if (!name) { showToast('Escribe un nombre'); inp.focus(); return; }
      const exists = peopleArr.some(p => p.name.toLowerCase() === name.toLowerCase());
      if (exists) { showToast(name + ' ya está en la lista'); return; }
      peopleArr.push({ key: Date.now().toString(), name, country: null, group: null });
      savePeople();
      inp.value = '';
      inp.focus();
      renderPeople();
      showToast('✅ ' + name + ' agregado');
    }

    function assignToPerson(key, personName) {
      if (!currentResult) { showToast('Primero gira la ruleta'); return; }
      const p = peopleArr.find(p => p.key === key);
      if (!p) return;
      p.country = currentResult.team;
      p.group   = currentResult.group;
      savePeople();
      renderPeople();
      showToast('⚽ A ' + personName + ' le tocó ' + currentResult.team);
    }

    function deletePerson(key) {
      peopleArr = peopleArr.filter(p => p.key !== key);
      savePeople();
      renderPeople();
    }

    function resetPeople() {
      if (!confirm('¿Borrar todas las personas y asignaciones?')) return;
      peopleArr = [];
      savePeople();
      renderPeople();
      showToast('Lista borrada');
    }

    function renderPeople() {
      const el = document.getElementById('peopleList');
      const countEl = document.getElementById('peopleCount');
      if (!el) return;
      if (countEl) countEl.textContent = peopleArr.length;
      if (peopleArr.length === 0) {
        el.innerHTML = '<div class="people-empty">Agrega personas a la quiniela</div>';
        return;
      }
      el.innerHTML = peopleArr.map(p => {
        const right = p.country
          ? '<span class="person-result">⚽ ' + escHtml(p.country) + '</span>'
          : '<button class="btn-assign-country" onclick="assignToPerson(\'' + escAttr(p.key) + '\',\'' + escAttr(p.name) + '\')" ' +
            (currentResult ? '' : 'disabled title="Gira la ruleta primero"') + '>Le tocó este</button>';
        return '<div class="person-row">' +
          '<span class="person-name">' + escHtml(p.name) + '</span>' +
          right +
          '<button class="btn-del-person" onclick="deletePerson(\'' + escAttr(p.key) + '\')" title="Eliminar">×</button>' +
        '</div>';
      }).join('');
    }

    renderPeople();

    drawWheel();