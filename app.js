// TomatoCalc — Moteur de Calcul Médical, Scores Cliniques & Classifications
// Navigation "Zéro Défilement" : 1 outil actif à l'écran + barre d'onglets fixe permanente

const SPECIALTIES = {
  all: {
    id: 'all',
    name: 'Tous les outils',
    shortName: 'Tous',
    icon: '🍅',
    color: 'var(--tomato-500)'
  },
  cardio: {
    id: 'cardio',
    name: 'Cardiologie',
    shortName: 'Cardio',
    icon: '❤️',
    color: 'var(--cardio-color)'
  },
  nephro: {
    id: 'nephro',
    name: 'Néphrologie',
    shortName: 'Néphro',
    icon: '🫘',
    color: 'var(--nephro-color)'
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrition',
    shortName: 'Nutrition',
    icon: '🍏',
    color: 'var(--nutri-color)'
  },
  medint: {
    id: 'medint',
    name: 'Médecine interne',
    shortName: 'Méd. Interne',
    icon: '🧬',
    color: 'var(--medint-color)'
  },
  pediatrie: {
    id: 'pediatrie',
    name: 'Pédiatrie',
    shortName: 'Pédiatrie',
    icon: '🧸',
    color: 'var(--ped-color)'
  },
  reanima: {
    id: 'reanima',
    name: 'Réanimation & Urgences',
    shortName: 'Réa / Urg',
    icon: '⚡',
    color: 'var(--rea-color)'
  },
  fav: {
    id: 'fav',
    name: 'Outils Favoris',
    shortName: 'Favoris',
    icon: '★',
    color: '#d97706'
  }
};

const state = {
  activeSpecialty: 'cardio', // Start directly on Cardio or user's last specialty
  activeCardId: 'card-cardio-chad',
  viewMode: 'single', // 'single' (zero-scroll, 1 tool at a time) | 'grid' (all tools)
  searchQuery: '',
  favorites: JSON.parse(localStorage.getItem('tomatocalc_favs') || '["nephro-dfg", "cardio-chad", "cardio-qtc", "rea-pf"]'),
  clipboard: [],
  patient: {
    age: '',
    sexe: 'H',
    poids: '',
    taille: '',
    creat: '',
    alb: ''
  }
};

function saveFavorites() {
  localStorage.setItem('tomatocalc_favs', JSON.stringify(state.favorites));
}

function toggleFavorite(id) {
  const idx = state.favorites.indexOf(id);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(id);
  }
  saveFavorites();
  updateFavoriteButtons();
  renderNavigationAndCards();
}

function updateFavoriteButtons() {
  document.querySelectorAll('.btn-fav').forEach(btn => {
    const id = btn.getAttribute('data-id');
    const isFav = state.favorites.includes(id);
    btn.classList.toggle('active', isFav);
    btn.innerHTML = isFav ? '★' : '☆';
    btn.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
  });
  document.querySelectorAll('.fav-counter').forEach(el => {
    el.textContent = state.favorites.length;
  });
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// ============================================================================
// CLIPBOARD & BOTTOM SHEETS
// ============================================================================
function addToClipboard(title, value, interpretation) {
  const existingIdx = state.clipboard.findIndex(item => item.title === title);
  const entry = {
    title,
    value,
    interpretation,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  };
  if (existingIdx >= 0) {
    state.clipboard[existingIdx] = entry;
  } else {
    state.clipboard.unshift(entry);
    if (state.clipboard.length > 10) state.clipboard.pop();
  }
  renderClipboard();
}

function copySingleResult(title, value, interpretation) {
  const text = `${title} : ${value}${interpretation ? ' (' + interpretation + ')' : ''}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      addToClipboard(title, value, interpretation);
      showToast(`✓ Copié : ${title}`);
    }).catch(() => {
      addToClipboard(title, value, interpretation);
      showToast(`✓ Ajouté à la synthèse`);
    });
  } else {
    addToClipboard(title, value, interpretation);
    showToast(`✓ Ajouté à la synthèse`);
  }
}

function copyAllClipboard() {
  if (state.clipboard.length === 0) {
    showToast('Aucun résultat épinglé pour le moment.');
    return;
  }
  const lines = ['--- Synthèse TomatoCalc ---'];
  const p = state.patient;
  const pParts = [];
  if (p.sexe) pParts.push(`Sexe: ${p.sexe}`);
  if (p.age) pParts.push(`${p.age} ans`);
  if (p.poids) pParts.push(`${p.poids} kg`);
  if (p.taille) pParts.push(`${p.taille} cm`);
  if (pParts.length > 0) lines.push(`Patient : ${pParts.join(' | ')}`);
  state.clipboard.forEach(item => {
    lines.push(`• ${item.title} : ${item.value}${item.interpretation ? ' — ' + item.interpretation : ''}`);
  });
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✓ Synthèse complète copiée !');
    });
  }
}

function renderClipboard() {
  const emptyHtml = `<div class="clipboard-empty">Appuyez sur « 📋 Copier » sous un résultat pour l'épingler ici.</div>`;
  const itemsHtml = state.clipboard.map(item => `
    <div class="clipboard-item">
      <div class="clipboard-item-header">
        <span>${item.title}</span>
        <span class="clipboard-item-val">${item.value}</span>
      </div>
      ${item.interpretation ? `<div style="color:var(--text-muted);font-size:0.75rem;">${item.interpretation}</div>` : ''}
    </div>
  `).join('');

  const desktopList = document.getElementById('clipboardList');
  if (desktopList) desktopList.innerHTML = state.clipboard.length ? itemsHtml : emptyHtml;

  const mobileList = document.getElementById('mobileClipboardList');
  if (mobileList) mobileList.innerHTML = state.clipboard.length ? itemsHtml : emptyHtml;

  const badgeCount = document.getElementById('mobileClipboardCount');
  if (badgeCount) badgeCount.textContent = state.clipboard.length;
}

function toggleMobileClipboard(open) {
  const sheet = document.getElementById('mobileClipboardSheet');
  if (!sheet) return;
  const shouldOpen = open !== undefined ? open : !sheet.classList.contains('open');
  sheet.classList.toggle('open', shouldOpen);
}

function toggleAllToolsDrawer(open) {
  const sheet = document.getElementById('allToolsSheet');
  if (!sheet) return;
  const shouldOpen = open !== undefined ? open : !sheet.classList.contains('open');
  if (shouldOpen) renderAllToolsDrawer();
  sheet.classList.toggle('open', shouldOpen);
}

// ============================================================================
// PATIENT BAR SYNCHRONIZATION
// ============================================================================
function togglePatientBar() {
  const bar = document.getElementById('patientBarSection');
  if (!bar) return;
  bar.classList.toggle('collapsed');
}

function updatePatientSummaryBadge() {
  const p = state.patient;
  const parts = [];
  if (p.age) parts.push(`${p.age}a`);
  if (p.poids) parts.push(`${p.poids}kg`);
  if (p.taille) parts.push(`${p.taille}cm`);
  if (p.creat) parts.push(`Créat ${p.creat}`);
  const summaryEl = document.getElementById('patientCompactSummary');
  if (summaryEl) {
    summaryEl.textContent = parts.length > 0 ? `(${p.sexe} • ${parts.join(' • ')})` : '(Appuyer pour pré-remplir âge, poids, créat...)';
  }
}

function syncPatientContext() {
  const age = document.getElementById('patAge').value;
  const sexe = document.getElementById('patSexe').value;
  const poids = document.getElementById('patPoids').value;
  const taille = document.getElementById('patTaille').value;
  const creat = document.getElementById('patCreat').value;
  const alb = document.getElementById('patAlb').value;

  state.patient = { age, sexe, poids, taille, creat, alb };
  updatePatientSummaryBadge();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== '') el.value = val;
  };

  if (age !== '') {
    setVal('dfg_age', age);
    setVal('hb_age', age);
    const ageNum = parseFloat(age);
    if (!isNaN(ageNum)) {
      const c75 = document.getElementById('chad_age75');
      const c65 = document.getElementById('chad_age65');
      if (c75 && c65) {
        c75.checked = ageNum >= 75;
        c65.checked = ageNum >= 65 && ageNum < 75;
      }
      const hb65 = document.getElementById('hasbled_age');
      if (hb65) hb65.checked = ageNum > 65;
      const curb65 = document.getElementById('curb_age');
      if (curb65) curb65.checked = ageNum >= 65;
    }
  }

  if (sexe) {
    setVal('dfg_sexe', sexe);
    setVal('qtc_sexe', sexe);
    setVal('lorentz_sexe', sexe);
    setVal('hb_sexe', sexe);
    const chadFemme = document.getElementById('chad_sexe');
    if (chadFemme) chadFemme.checked = (sexe === 'F');
  }

  if (poids !== '') {
    setVal('dfg_poids', poids);
    setVal('imc_poids', poids);
    setVal('nri_poids_act', poids);
    setVal('hb_poids', poids);
    setVal('ped_hs_poids', poids);
  }

  if (taille !== '') {
    setVal('imc_taille', taille);
    setVal('lorentz_taille', taille);
    setVal('hb_taille', taille);
    setVal('schwartz_taille', taille);
  }

  if (creat !== '') {
    setVal('dfg_creat', creat);
    setVal('schwartz_creat', creat);
  }

  if (alb !== '') {
    setVal('cac_alb', alb);
    setVal('nri_alb', alb);
    setVal('ta_alb', alb);
  }

  runAllCalculations();
}

function clearPatientContext() {
  ['patAge', 'patPoids', 'patTaille', 'patCreat', 'patAlb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('patSexe').value = 'H';
  state.patient = { age: '', sexe: 'H', poids: '', taille: '', creat: '', alb: '' };
  updatePatientSummaryBadge();
  showToast('Profil patient réinitialisé');
}

// ============================================================================
// ZERO-SCROLL NAVIGATION ENGINE (Specialty Tabs + Persistent Tool Tabs)
// ============================================================================
function getMatchingCards() {
  const q = state.searchQuery.trim().toLowerCase();
  const allCards = Array.from(document.querySelectorAll('.calc-card'));

  return allCards.filter(card => {
    const spec = card.dataset.specialty;
    const favId = card.id.replace('card-', '');
    const searchText = (card.dataset.keywords + ' ' + card.getAttribute('data-short-title') + ' ' + card.textContent).toLowerCase();

    if (q) {
      return searchText.includes(q);
    }
    if (state.activeSpecialty === 'all') return true;
    if (state.activeSpecialty === 'fav') return state.favorites.includes(favId);
    return spec === state.activeSpecialty;
  });
}

function selectSpecialty(specId) {
  state.activeSpecialty = specId;
  state.searchQuery = '';
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) searchInput.value = '';

  const matching = getMatchingCards();
  if (matching.length > 0) {
    // Keep current card if it belongs to this specialty, otherwise pick the first one
    const stillInList = matching.some(c => c.id === state.activeCardId);
    if (!stillInList) {
      state.activeCardId = matching[0].id;
    }
  }
  renderNavigationAndCards();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function selectTool(cardId, switchSpecIfNeeded = false) {
  const card = document.getElementById(cardId);
  if (!card) return;
  state.activeCardId = cardId;

  if (switchSpecIfNeeded) {
    state.activeSpecialty = card.dataset.specialty;
    state.searchQuery = '';
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.value = '';
  }

  renderNavigationAndCards();
  toggleAllToolsDrawer(false);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function stepTool(direction) {
  const matching = getMatchingCards();
  if (matching.length <= 1) return;
  const idx = matching.findIndex(c => c.id === state.activeCardId);
  const nextIdx = (idx + direction + matching.length) % matching.length;
  selectTool(matching[nextIdx].id);
}

function toggleViewMode() {
  state.viewMode = state.viewMode === 'single' ? 'grid' : 'single';
  const btn = document.getElementById('btnViewModeToggle');
  if (btn) {
    btn.classList.toggle('active-mode', state.viewMode === 'grid');
    btn.innerHTML = state.viewMode === 'single'
      ? '🗂️ <span class="hide-mobile">Vue Grille</span>'
      : '🎯 <span class="hide-mobile">Mode 1 Outil</span>';
  }
  renderNavigationAndCards();
  showToast(state.viewMode === 'single' ? '🎯 Mode 1 outil à la fois (sans défilement)' : '🗂️ Vue Grille complète activée');
}

function renderNavigationAndCards() {
  // 1. Update Specialty Tabs
  document.querySelectorAll('.spec-tab').forEach(tab => {
    const spec = tab.dataset.specialty;
    const isActive = !state.searchQuery && spec === state.activeSpecialty;
    tab.classList.toggle('active', isActive);
    if (isActive) {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // 2. Get matching cards
  const matching = getMatchingCards();
  if (matching.length > 0 && !matching.some(c => c.id === state.activeCardId)) {
    state.activeCardId = matching[0].id;
  }

  // 3. Render Sticky Top Tool Tabs (#toolTabsBar)
  const toolTabsBar = document.getElementById('toolTabsBar');
  if (toolTabsBar) {
    if (matching.length === 0) {
      toolTabsBar.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);padding:0.2rem 0;">Aucun outil ne correspond à votre recherche.</span>`;
    } else {
      toolTabsBar.innerHTML = matching.map(card => {
        const shortTitle = card.getAttribute('data-short-title') || card.querySelector('.calc-title')?.textContent;
        const specInfo = SPECIALTIES[card.dataset.specialty] || SPECIALTIES.all;
        const isActive = state.viewMode === 'single' && card.id === state.activeCardId;
        return `
          <button type="button" class="tool-tab-btn ${isActive ? 'active' : ''}" id="tab-${card.id}" onclick="selectTool('${card.id}')">
            <span class="tool-tab-dot" style="background:${specInfo.color}"></span>
            <span>${shortTitle}</span>
          </button>
        `;
      }).join('');

      // Ensure active tool tab is scrolled into horizontal view
      const activeTabEl = document.getElementById(`tab-${state.activeCardId}`);
      if (activeTabEl) {
        activeTabEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  // 4. Render Desktop Left Sidebar Tool List (#sidebarToolsList)
  const sidebarList = document.getElementById('sidebarToolsList');
  const sidebarTitle = document.getElementById('sidebarSpecTitle');
  if (sidebarTitle) {
    const specObj = SPECIALTIES[state.activeSpecialty] || SPECIALTIES.all;
    sidebarTitle.innerHTML = state.searchQuery
      ? `<span>🔎 Résultats (${matching.length})</span>`
      : `<span>${specObj.icon} ${specObj.name} (${matching.length})</span>`;
  }
  if (sidebarList) {
    sidebarList.innerHTML = matching.map(card => {
      const shortTitle = card.getAttribute('data-short-title') || card.querySelector('.calc-title')?.textContent;
      const specInfo = SPECIALTIES[card.dataset.specialty] || SPECIALTIES.all;
      const isActive = state.viewMode === 'single' && card.id === state.activeCardId;
      return `
        <button type="button" class="sidebar-tool-item ${isActive ? 'active' : ''}" onclick="selectTool('${card.id}')">
          <span class="sidebar-tool-left">
            <span class="tool-tab-dot" style="background:${specInfo.color}"></span>
            <span class="name">${shortTitle}</span>
          </span>
          <span>›</span>
        </button>
      `;
    }).join('');
  }

  // 5. Show ONLY the active card in 'single' mode (or all matching in 'grid' mode)
  const gridContainer = document.getElementById('calculatorsGrid');
  if (gridContainer) {
    gridContainer.classList.toggle('mode-grid', state.viewMode === 'grid');
  }

  const allCards = Array.from(document.querySelectorAll('.calc-card'));
  allCards.forEach(card => {
    const isMatched = matching.includes(card);
    if (!isMatched) {
      card.style.display = 'none';
    } else if (state.viewMode === 'single') {
      card.style.display = card.id === state.activeCardId ? 'flex' : 'none';
    } else {
      card.style.display = 'flex';
    }
  });

  // 6. Update Active Tool Counter / Drawer Button text
  const activeIdx = matching.findIndex(c => c.id === state.activeCardId);
  const currentCard = document.getElementById(state.activeCardId);
  const currentShortTitle = currentCard ? currentCard.getAttribute('data-short-title') : 'Choisir un calcul';

  const drawerBtnText = document.getElementById('drawerBtnText');
  if (drawerBtnText) {
    drawerBtnText.textContent = matching.length > 0
      ? `🧭 ${currentShortTitle} (${activeIdx + 1}/${matching.length})`
      : `🧭 Tous les calculs`;
  }

  const mobileDrawerBtnText = document.getElementById('mobileDrawerBtnText');
  if (mobileDrawerBtnText) {
    mobileDrawerBtnText.textContent = matching.length > 0
      ? `🧭 Calculs (${activeIdx + 1}/${matching.length})`
      : `🧭 Calculs`;
  }

  const emptyState = document.getElementById('emptySearchState');
  if (emptyState) {
    emptyState.style.display = matching.length === 0 ? 'block' : 'none';
  }
}

function renderAllToolsDrawer() {
  const container = document.getElementById('allToolsDrawerContent');
  if (!container) return;

  const specOrder = ['cardio', 'nephro', 'nutrition', 'medint', 'pediatrie', 'reanima'];
  const allCards = Array.from(document.querySelectorAll('.calc-card'));

  container.innerHTML = specOrder.map(specKey => {
    const spec = SPECIALTIES[specKey];
    const cards = allCards.filter(c => c.dataset.specialty === specKey);
    const buttons = cards.map(c => {
      const title = c.getAttribute('data-short-title') || c.querySelector('.calc-title')?.textContent;
      const isActive = c.id === state.activeCardId;
      return `
        <button type="button" class="drawer-tool-btn ${isActive ? 'active' : ''}" onclick="selectTool('${c.id}', true)">
          <span>${title}</span>
          <span>›</span>
        </button>
      `;
    }).join('');
    return `
      <div class="drawer-spec-group">
        <h4>${spec.icon} ${spec.name}</h4>
        <div class="drawer-spec-buttons">${buttons}</div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// 1. CARDIOLOGIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

function calcChad() {
  const age75El = document.getElementById('chad_age75');
  const age65El = document.getElementById('chad_age65');

  const ic = document.getElementById('chad_ic')?.checked ? 1 : 0;
  const hta = document.getElementById('chad_hta')?.checked ? 1 : 0;
  const age75 = age75El?.checked ? 2 : 0;
  const diab = document.getElementById('chad_diab')?.checked ? 1 : 0;
  const avc = document.getElementById('chad_avc')?.checked ? 2 : 0;
  const vasc = document.getElementById('chad_vasc')?.checked ? 1 : 0;
  const age65 = (!age75 && age65El?.checked) ? 1 : 0;
  const isFemale = document.getElementById('chad_sexe')?.checked;

  document.querySelectorAll('#card-cardio-chad .criteria-item').forEach(label => {
    const input = label.querySelector('input');
    if (input) label.classList.toggle('checked', input.checked);
  });

  const nonSexPoints = ic + hta + age75 + diab + avc + vasc + age65;
  const sexPoint = isFemale ? 1 : 0;
  const totalScore = nonSexPoints + sexPoint;

  const strokeRiskTable = {
    0: '0,2 % / an',
    1: '0,6 % / an',
    2: '2,2 % / an',
    3: '3,2 % / an',
    4: '4,8 % / an',
    5: '7,2 % / an',
    6: '9,7 % / an',
    7: '11,2 % / an',
    8: '10,8 % / an',
    9: '12,2 % / an'
  };

  let status = 'status-normal';
  let badge = 'Risque faible';
  let reco = '';

  if (nonSexPoints === 0) {
    status = 'status-normal';
    badge = isFemale ? 'Score 1 (Femme isolé) — Bas risque' : 'Score 0 — Bas risque';
    reco = `Aucun traitement antithrombotique (ni anticoagulant, ni antiagrégant). Le sexe féminin isolé sans autre facteur ne justifie pas d'anticoagulation.`;
  } else if (nonSexPoints === 1) {
    status = 'status-warn';
    badge = `Risque intermédiaire (${isFemale ? 'Femme = 2' : 'Homme = 1'})`;
    reco = `Anticoagulation orale (AOD en 1re intention ou AVK) à discuter (Classe IIa) après évaluation du risque hémorragique (score HAS-BLED).`;
  } else {
    status = 'status-danger';
    badge = 'Risque thrombo-embolique élevé';
    reco = `Indication formelle d'anticoagulation orale au long cours (Classe IA — AOD en 1re intention sauf sténose mitrale modérée/sévère ou valve mécanique).`;
  }

  const panel = document.getElementById('res_chad');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">CHA₂DS₂-VASc = ${totalScore} pt${totalScore > 1 ? 's' : ''}</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Risque AVC : ${strokeRiskTable[totalScore] || '> 12 % / an'}</span>
      <span class="subvalue-chip">Hors sexe : ${nonSexPoints} pt${nonSexPoints > 1 ? 's' : ''}</span>
    </div>
    <div class="result-interpretation">${reco}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score CHA₂DS₂-VASc', '${totalScore}/9', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcHasbled() {
  let score = 0;
  document.querySelectorAll('#card-cardio-hasbled input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += parseInt(cb.value, 10);
  });

  let status = 'status-normal';
  let badge = 'Risque faible (< 2)';
  let reco = `Risque de saignement majeur faible (~1 %/an). Pas de contre-indication à l'anticoagulation.`;

  if (score === 2) {
    status = 'status-warn';
    badge = 'Risque modéré (2)';
    reco = `Risque de saignement majeur ~1,9 %/an. Surveillance régulière et correction des facteurs modifiables.`;
  } else if (score >= 3) {
    status = 'status-danger';
    badge = 'Risque élevé (≥ 3)';
    reco = `Haut risque hémorragique (≥ 3,7 %/an). Corriger les facteurs réversibles (TA, INR labile, AINS, alcool) et assurer un suivi rapproché.`;
  }

  const panel = document.getElementById('res_hasbled');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">HAS-BLED = ${score} pt${score > 1 ? 's' : ''}</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${reco}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score HAS-BLED', '${score}/9', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function syncQtRrFromHr(source) {
  const hrEl = document.getElementById('qtc_hr');
  const rrEl = document.getElementById('qtc_rr');
  if (!hrEl || !rrEl) return;

  if (source === 'hr') {
    const hr = parseFloat(hrEl.value);
    if (hr > 0) rrEl.value = Math.round(60000 / hr);
  } else if (source === 'rr') {
    const rr = parseFloat(rrEl.value);
    if (rr > 0) hrEl.value = Math.round(60000 / rr);
  }
  calcQtc();
}

function calcQtc() {
  const qtm = parseFloat(document.getElementById('qtc_qtm')?.value);
  const hr = parseFloat(document.getElementById('qtc_hr')?.value);
  const rrMs = parseFloat(document.getElementById('qtc_rr')?.value);
  const sexe = document.getElementById('qtc_sexe')?.value || 'H';

  const panel = document.getElementById('res_qtc');
  if (!panel) return;

  if (!qtm || qtm <= 0 || (!hr && !rrMs)) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Saisissez le QT mesuré (en ms) et la FC (ou l'intervalle R-R).</div>`;
    return;
  }

  const rrSec = rrMs > 0 ? (rrMs / 1000) : (60 / hr);
  const effectiveHr = hr > 0 ? hr : (60 / rrSec);

  const qtcBazett = Math.round(qtm / Math.sqrt(rrSec));
  const qtcFridericia = Math.round(qtm / Math.cbrt(rrSec));
  const qtcFramingham = Math.round(qtm + 154 * (1 - rrSec));

  const isExtremeHr = effectiveHr < 60 || effectiveHr > 100;
  const refQtc = isExtremeHr ? qtcFridericia : qtcBazett;
  const upperNormal = sexe === 'F' ? 450 : 440;
  const prolongedThreshold = sexe === 'F' ? 470 : 450;

  let status = 'status-normal';
  let badge = 'QTc Normal';
  let interp = `Valeurs usuelles respectées (≤ ${upperNormal} ms chez ${sexe === 'F' ? 'la femme' : 'l’homme'}).`;

  if (refQtc < 350) {
    status = 'status-warn';
    badge = 'QTc Court (< 350 ms)';
    interp = `QT court : rechercher une hypercalcémie, une hyperkaliémie ou une imprégnation digitalique.`;
  } else if (refQtc >= 500) {
    status = 'status-danger';
    badge = 'Allongement Critique (≥ 500 ms)';
    interp = `⚠️ Risque majeur de Torsades de Pointes ! Arrêter tout traitement allongeant le QT, corriger K⁺ / Mg²⁺ / Ca²⁺ et monitorer l'ECG.`;
  } else if (refQtc > prolongedThreshold) {
    status = 'status-danger';
    badge = 'QTc Allongé';
    interp = `Allongement franc du QTc (> ${prolongedThreshold} ms). Vérifier l'ionogramme (K⁺, Mg²⁺, Ca²⁺) et les traitements en cours.`;
  } else if (refQtc > upperNormal) {
    status = 'status-warn';
    badge = 'QTc Limite';
    interp = `QTc limite (${upperNormal + 1}–${prolongedThreshold} ms). Surveillance ECG recommandée.`;
  }

  if (isExtremeHr) {
    interp += ` (FC à ${Math.round(effectiveHr)} bpm : privilégier Fridericia).`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Bazett : ${qtcBazett} ms</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip"><strong>Fridericia :</strong> ${qtcFridericia} ms</span>
      <span class="subvalue-chip">Framingham : ${qtcFramingham} ms</span>
      <span class="subvalue-chip">RR : ${Math.round(rrSec * 1000)} ms (${Math.round(effectiveHr)} bpm)</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('QT corrigé', 'Bazett ${qtcBazett} ms / Fridericia ${qtcFridericia} ms', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcWellsEp() {
  let score = 0;
  document.querySelectorAll('#card-cardio-wells input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += parseFloat(cb.value);
  });

  let status = 'status-normal';
  let level3 = 'Probabilité faible (0–1,5)';
  let level2 = score <= 4 ? 'EP peu probable (≤ 4)' : 'EP probable (> 4)';
  let conduite = '';

  if (score <= 1.5) {
    status = 'status-normal';
    level3 = 'Probabilité faible';
    conduite = `Dosage des D-dimères (seuil ajusté à l'âge après 50 ans : Âge × 10 µg/L). Si négatifs, l'EP est exclue sans imagerie.`;
  } else if (score <= 6) {
    status = 'status-warn';
    level3 = 'Probabilité intermédiaire (2–6)';
    conduite = score <= 4
      ? `Score ≤ 4 (EP peu probable) : D-dimères en 1re intention ; angioscanner thoracique si D-dimères positifs.`
      : `Score > 4 (EP probable) : Angioscanner thoracique d'emblée.`;
  } else {
    status = 'status-danger';
    level3 = 'Probabilité élevée (≥ 6,5)';
    conduite = `Angioscanner thoracique d'emblée sans D-dimères. Anticoagulation curative immédiate recommandée en attendant l'imagerie.`;
  }

  const panel = document.getElementById('res_wells');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Wells EP = ${score} pt${score > 1 ? 's' : ''}</div>
      <span class="result-Classification-badge">${level3}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">${level2}</span>
    </div>
    <div class="result-interpretation">${conduite}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score de Wells EP', '${score} pts', '${level3}')">📋 Copier</button>
    </div>
  `;
}

function calcPamHta() {
  const pas = parseFloat(document.getElementById('pam_pas')?.value);
  const pad = parseFloat(document.getElementById('pam_pad')?.value);
  const panel = document.getElementById('res_pam');
  if (!panel) return;

  if (!pas || !pad || pas <= 0 || pad <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la PAS et la PAD en mmHg.</div>`;
    return;
  }

  const pam = Math.round((pas + 2 * pad) / 3);
  const pp = Math.round(pas - pad);

  let grade = '';
  let status = 'status-normal';

  if (pas < 90 || pam < 65) {
    grade = 'Hypotension (PAM < 65 mmHg)';
    status = 'status-danger';
  } else if (pas >= 140 && pad < 90) {
    const sysGrade = pas >= 180 ? 'Grade 3' : (pas >= 160 ? 'Grade 2' : 'Grade 1');
    grade = `HTA systolique isolée (${sysGrade})`;
    status = pas >= 160 ? 'status-danger' : 'status-warn';
  } else if (pas >= 180 || pad >= 110) {
    grade = 'HTA Grade 3 (Sévère)';
    status = 'status-danger';
  } else if (pas >= 160 || pad >= 100) {
    grade = 'HTA Grade 2 (Modérée)';
    status = 'status-danger';
  } else if (pas >= 140 || pad >= 90) {
    grade = 'HTA Grade 1 (Légère)';
    status = 'status-warn';
  } else if (pas >= 130 || pad >= 85) {
    grade = 'PA Normale Haute';
    status = 'status-info';
  } else if (pas >= 120 || pad >= 80) {
    grade = 'PA Normale';
    status = 'status-normal';
  } else {
    grade = 'PA Optimale (< 120/80)';
    status = 'status-normal';
  }

  const perfText = pam >= 65
    ? `PAM ≥ 65 mmHg : pression de perfusion d'organe conservée.`
    : `⚠️ PAM < 65 mmHg : seuil critique d'hypoperfusion tissulaire (objectif ≥ 65 mmHg).`;

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">PAM = ${pam} mmHg</div>
      <span class="result-Classification-badge">${grade}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">PA : ${pas}/${pad} mmHg</span>
      <span class="subvalue-chip">Pulsée (PP) : ${pp} mmHg</span>
    </div>
    <div class="result-interpretation">${perfText}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('PAM & PA', 'PAM ${pam} mmHg (PA ${pas}/${pad})', '${grade}')">📋 Copier</button>
    </div>
  `;
}

// ============================================================================
// 2. NEPHROLOGIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

function calcNephroDfg() {
  const age = parseFloat(document.getElementById('dfg_age')?.value);
  const poids = parseFloat(document.getElementById('dfg_poids')?.value);
  const creatRaw = parseFloat(document.getElementById('dfg_creat')?.value);
  const creatUnit = document.getElementById('dfg_unit')?.value || 'umol';
  const sexe = document.getElementById('dfg_sexe')?.value || 'H';
  const ethnie = document.getElementById('dfg_ethnie')?.value || 'other';

  const panel = document.getElementById('res_dfg');
  if (!panel) return;

  if (!age || age <= 0 || !creatRaw || creatRaw <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Renseignez l'âge, la créatininémie et le poids.</div>`;
    return;
  }

  const creatUmol = creatUnit === 'mgdl' ? creatRaw * 88.4 : creatRaw;
  const creatMgdl = creatUnit === 'mgdl' ? creatRaw : creatRaw * 0.011312;

  const kCockcroft = sexe === 'F' ? 1.04 : 1.23;
  const cg = (poids && poids > 0) ? ((140 - age) * poids * kCockcroft) / creatUmol : null;

  const mdrdSex = sexe === 'F' ? 0.742 : 1.0;
  const mdrdEth = ethnie === 'black' ? 1.212 : 1.0;
  const mdrd = 175 * Math.pow(creatMgdl, -1.154) * Math.pow(age, -0.203) * mdrdSex * mdrdEth;

  const kEpi09 = sexe === 'F' ? 0.7 : 0.9;
  const alpha09 = sexe === 'F' ? -0.329 : -0.411;
  const sexFactor09 = sexe === 'F' ? 1.018 : 1.0;
  const ethFactor09 = ethnie === 'black' ? 1.159 : 1.0;
  const ratio09 = creatMgdl / kEpi09;
  const ckdepi2009 = 141 * Math.pow(Math.min(ratio09, 1), alpha09) * Math.pow(Math.max(ratio09, 1), -1.209) * Math.pow(0.993, age) * sexFactor09 * ethFactor09;

  const kEpi21 = sexe === 'F' ? 0.7 : 0.9;
  const alpha21 = sexe === 'F' ? -0.241 : -0.302;
  const sexFactor21 = sexe === 'F' ? 1.012 : 1.0;
  const ratio21 = creatMgdl / kEpi21;
  const ckdepi2021 = 142 * Math.pow(Math.min(ratio21, 1), alpha21) * Math.pow(Math.max(ratio21, 1), -1.200) * Math.pow(0.9938, age) * sexFactor21;

  const refDfg = ckdepi2009;
  let kdigoStage = '';
  let kdigoDesc = '';
  let status = 'status-normal';

  if (refDfg >= 90) {
    kdigoStage = 'KDIGO G1';
    kdigoDesc = 'DFG normal ou élevé (≥ 90 mL/min/1,73m²)';
    status = 'status-normal';
  } else if (refDfg >= 60) {
    kdigoStage = 'KDIGO G2';
    kdigoDesc = 'DFG légèrement diminué (60–89 mL/min/1,73m²)';
    status = 'status-normal';
  } else if (refDfg >= 45) {
    kdigoStage = 'KDIGO G3a';
    kdigoDesc = 'IRC légère à modérée (45–59 mL/min/1,73m²)';
    status = 'status-warn';
  } else if (refDfg >= 30) {
    kdigoStage = 'KDIGO G3b';
    kdigoDesc = 'IRC modérée à sévère (30–44 mL/min/1,73m²)';
    status = 'status-warn';
  } else if (refDfg >= 15) {
    kdigoStage = 'KDIGO G4';
    kdigoDesc = 'IRC sévère (15–29 mL/min/1,73m²)';
    status = 'status-danger';
  } else {
    kdigoStage = 'KDIGO G5';
    kdigoDesc = 'Insuffisance rénale terminale (< 15 mL/min/1,73m²)';
    status = 'status-danger';
  }

  const kdigoGSelect = document.getElementById('kdigo_g');
  if (kdigoGSelect) {
    if (refDfg >= 90) kdigoGSelect.value = 'G1';
    else if (refDfg >= 60) kdigoGSelect.value = 'G2';
    else if (refDfg >= 45) kdigoGSelect.value = 'G3a';
    else if (refDfg >= 30) kdigoGSelect.value = 'G3b';
    else if (refDfg >= 15) kdigoGSelect.value = 'G4';
    else kdigoGSelect.value = 'G5';
    updateKdigoMatrix();
  }

  const cgStr = cg !== null ? `${cg.toFixed(1)} mL/min` : 'Poids requis';

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">CKD-EPI : ${ckdepi2009.toFixed(1)} <span style="font-size:0.9rem;font-weight:600">mL/min/1,73m²</span></div>
      <span class="result-Classification-badge">${kdigoStage}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip"><strong>Cockcroft :</strong> ${cgStr}</span>
      <span class="subvalue-chip"><strong>MDRD :</strong> ${mdrd.toFixed(1)}</span>
      <span class="subvalue-chip"><strong>CKD-EPI 2021 :</strong> ${ckdepi2021.toFixed(1)}</span>
    </div>
    <div class="result-interpretation">
      <strong>${kdigoDesc}.</strong> CKD-EPI pour le suivi de l'IRC (HAS) ; Cockcroft-Gault pour l'adaptation posologique selon le RCP.
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Fonction Rénale', 'CKD-EPI ${ckdepi2009.toFixed(1)} | Cockcroft ${cgStr} | MDRD ${mdrd.toFixed(1)}', '${kdigoStage}')">📋 Copier</button>
    </div>
  `;
}

function calcFeNa() {
  const naU = parseFloat(document.getElementById('fena_nau')?.value);
  const naP = parseFloat(document.getElementById('fena_nap')?.value);
  const creatU = parseFloat(document.getElementById('fena_cu')?.value);
  const creatP = parseFloat(document.getElementById('fena_cp')?.value);
  const unitMode = document.getElementById('fena_unit_mode')?.value || 'umol_mmol';

  const panel = document.getElementById('res_fena');
  if (!panel) return;

  if (!naU || !naP || !creatU || !creatP) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez Na U/P et Créatinine U/P.</div>`;
    return;
  }

  const creatPMmol = unitMode === 'umol_mmol' ? (creatP / 1000) : creatP;
  const fenaRatio = (naU * creatPMmol) / (naP * creatU);
  const fenaPct = fenaRatio * 100;

  let status = 'status-info';
  let badge = '';
  let interp = '';

  if (fenaPct < 1) {
    status = 'status-warn';
    badge = 'FE(Na) < 1 % — IRA Fonctionnelle';
    interp = `En faveur d'une IRA fonctionnelle (pré-rénale : réabsorption tubulaire de Na⁺ préservée). Si prise de diurétiques, utiliser la FE de l'urée.`;
  } else if (fenaPct <= 2) {
    status = 'status-info';
    badge = 'FE(Na) 1–2 % — Zone grise';
    interp = `Zone intermédiaire (1 à 2 %). Confrontez au contexte clinique et à la FE de l'urée.`;
  } else {
    status = 'status-danger';
    badge = 'FE(Na) > 2 % — IRA Organique (NTA)';
    interp = `En faveur d'une IRA organique (Nécrose Tubulaire Aiguë) ou d'une natriurèse sous diurétiques.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">FE(Na) = ${fenaPct.toFixed(2)} %</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('FE du Sodium', '${fenaPct.toFixed(2)} %', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcFeUree() {
  const ureeU = parseFloat(document.getElementById('feuree_uu')?.value);
  const ureeP = parseFloat(document.getElementById('feuree_up')?.value);
  const creatU = parseFloat(document.getElementById('feuree_cu')?.value);
  const creatP = parseFloat(document.getElementById('feuree_cp')?.value);
  const unitMode = document.getElementById('feuree_unit_mode')?.value || 'umol_mmol';

  const panel = document.getElementById('res_feuree');
  if (!panel) return;

  if (!ureeU || !ureeP || !creatU || !creatP) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez l'urée U/P et la créatinine U/P.</div>`;
    return;
  }

  const creatPMmol = unitMode === 'umol_mmol' ? (creatP / 1000) : creatP;
  const ratio = (ureeU * creatPMmol) / (ureeP * creatU);
  const pct = ratio * 100;

  let status = 'status-info';
  let badge = '';
  let interp = '';

  if (pct < 35) {
    status = 'status-warn';
    badge = 'FE(Urée) < 35 % — IRA Fonctionnelle';
    interp = `Origine fonctionnelle (pré-rénale) très probable (< 35 %), interprétable même sous traitement diurétique.`;
  } else if (pct <= 50) {
    status = 'status-info';
    badge = 'FE(Urée) 35–50 % — Intermédiaire';
    interp = `Valeur intermédiaire entre 35 % et 50 %.`;
  } else {
    status = 'status-danger';
    badge = 'FE(Urée) > 50 % — IRA Organique';
    interp = `En faveur d'une atteinte tubulaire organique (Nécrose Tubulaire Aiguë).`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">FE(Urée) = ${pct.toFixed(1)} %</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('FE Urée', '${pct.toFixed(1)} %', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function updateKdigoMatrix() {
  const g = document.getElementById('kdigo_g')?.value || 'G2';
  const a = document.getElementById('kdigo_a')?.value || 'A1';

  document.querySelectorAll('#kdigoMatrixTable .kdigo-cell').forEach(cell => {
    cell.classList.toggle('kdigo-selected', cell.dataset.ga === `${g}-${a}`);
  });

  const riskMap = {
    'G1-A1': { risk: 'Risque faible', status: 'status-normal', freq: 'Suivi annuel si facteur de risque (HTA, diabète).' },
    'G2-A1': { risk: 'Risque faible', status: 'status-normal', freq: 'Suivi annuel si facteur de risque.' },
    'G1-A2': { risk: 'Risque modéré', status: 'status-warn', freq: 'Suivi 1 fois/an — Blocage SRAA (IEC/ARA2) ± iSGLT2.' },
    'G2-A2': { risk: 'Risque modéré', status: 'status-warn', freq: 'Suivi 1 fois/an — Néphroprotection (IEC/ARA2 ± iSGLT2).' },
    'G3a-A1': { risk: 'Risque modéré', status: 'status-warn', freq: 'Suivi 1 fois/an — Éviction des néphrotoxiques, adaptation posologique.' },
    'G1-A3': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois/an — Avis néphrologique (albuminurie sévère).' },
    'G2-A3': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois/an — Avis néphrologique & néphroprotection maximale.' },
    'G3a-A2': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois/an — Contrôle TA < 130/80, IEC/ARA2 + iSGLT2.' },
    'G3b-A1': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois/an — Bilan phosphocalcique, anémie, bicarbonates.' },
    'G3a-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois/an — Prise en charge néphrologique spécialisée.' },
    'G3b-A2': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois/an — Prise en charge néphrologique spécialisée.' },
    'G3b-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois/an — Prise en charge néphrologique spécialisée.' },
    'G4-A1': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois/an — Préservation veineuse, vaccination VHB.' },
    'G4-A2': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois/an — Préparation suppléance / greffe.' },
    'G4-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 4 fois/an — Suivi néphrologique rapproché.' },
    'G5-A1': { risk: 'Risque très élevé (Terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois/an — Suppléance rénale / transplantation.' },
    'G5-A2': { risk: 'Risque très élevé (Terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois/an — Suppléance rénale / transplantation.' },
    'G5-A3': { risk: 'Risque très élevé (Terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois/an — Suppléance rénale / transplantation.' }
  };

  const info = riskMap[`${g}-${a}`];
  const panel = document.getElementById('res_kdigo_matrix');
  if (!panel || !info) return;
  panel.className = `result-panel ${info.status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Stade KDIGO : ${g}${a}</div>
      <span class="result-Classification-badge">${info.risk}</span>
    </div>
    <div class="result-interpretation">${info.freq}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Classification KDIGO IRC', '${g}${a}', '${info.risk}')">📋 Copier</button>
    </div>
  `;
}

// ============================================================================
// 3. NUTRITION CALCULATORS & CLASSIFICATIONS
// ============================================================================

function calcImc() {
  const poids = parseFloat(document.getElementById('imc_poids')?.value);
  let taille = parseFloat(document.getElementById('imc_taille')?.value);

  const panel = document.getElementById('res_imc');
  if (!panel) return;

  if (!poids || poids <= 0 || !taille || taille <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez le poids (kg) et la taille (cm).</div>`;
    return;
  }

  const tailleCm = taille <= 3 ? taille * 100 : taille;
  const tailleM = tailleCm / 100;

  const imc = Math.round((poids / Math.pow(tailleCm, 2)) * 1000000) / 100;
  const bsaMosteller = Math.sqrt((tailleCm * poids) / 3600);
  const poidsMinNormal = (18.5 * tailleM * tailleM).toFixed(1);
  const poidsMaxNormal = (24.9 * tailleM * tailleM).toFixed(1);

  let status = 'status-normal';
  let classeOms = '';
  let details = '';

  if (imc < 16.5) {
    status = 'status-danger';
    classeOms = 'Dénutrition sévère (< 16,5)';
    details = `Critère phénotypique de dénutrition sévère chez l'adulte.`;
  } else if (imc < 18.5) {
    status = 'status-warn';
    classeOms = 'Maigreur / Dénutrition (16,5–18,4)';
    details = `Critère de dénutrition chez l'adulte (< 70 ans). Chez le sujet ≥ 70 ans, le seuil HAS est < 22 kg/m² (sévère si < 20).`;
  } else if (imc < 25) {
    status = 'status-normal';
    classeOms = 'Corpulence normale (18,5–24,9)';
    details = `Poids normal selon l'OMS (cible pour ${tailleCm} cm : ${poidsMinNormal} à ${poidsMaxNormal} kg).`;
  } else if (imc < 30) {
    status = 'status-warn';
    classeOms = 'Surpoids (25,0–29,9)';
    details = `Surpoids (Pré-obésité OMS). Évaluer le tour de taille et les facteurs cardio-métaboliques.`;
  } else if (imc < 35) {
    status = 'status-warn';
    classeOms = 'Obésité Grade I (30,0–34,9)';
    details = `Obésité modérée (Classe I OMS).`;
  } else if (imc < 40) {
    status = 'status-danger';
    classeOms = 'Obésité Grade II (35,0–39,9)';
    details = `Obésité sévère (Classe II OMS).`;
  } else {
    status = 'status-danger';
    classeOms = 'Obésité Grade III (≥ 40)';
    details = `Obésité morbide / massive (Classe III OMS).`;
  }

  document.querySelectorAll('#omsImcTable tr[data-range]').forEach(row => {
    const [min, max] = row.dataset.range.split('-').map(Number);
    row.classList.toggle('active-row', imc >= min && imc < max);
  });

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">IMC = ${imc.toFixed(2)} kg/m²</div>
      <span class="result-Classification-badge">${classeOms}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">SC (Mosteller) : ${bsaMosteller.toFixed(2)} m²</span>
      <span class="subvalue-chip">Poids normal : ${poidsMinNormal}–${poidsMaxNormal} kg</span>
    </div>
    <div class="result-interpretation">${details}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('IMC & SC', 'IMC ${imc.toFixed(2)} kg/m² (SC ${bsaMosteller.toFixed(2)} m²)', '${classeOms}')">📋 Copier</button>
    </div>
  `;
}

function calcLorentz() {
  const taille = parseFloat(document.getElementById('lorentz_taille')?.value);
  const sexe = document.getElementById('lorentz_sexe')?.value || 'H';

  const panel = document.getElementById('res_lorentz');
  if (!panel) return;

  if (!taille || taille < 100) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la taille en cm (≥ 100 cm).</div>`;
    return;
  }

  const k = sexe === 'F' ? 2.5 : 4;
  const poidsLorentz = taille - 100 - ((taille - 150) / k);

  const baseDevine = sexe === 'F' ? 45.5 : 50.0;
  const poidsDevine = baseDevine + 0.91 * (taille - 152.4);
  const vt6 = Math.round(poidsDevine * 6);
  const vt8 = Math.round(poidsDevine * 8);

  const nriPoidsTheoEl = document.getElementById('nri_poids_theo');
  if (nriPoidsTheoEl && !nriPoidsTheoEl.value) {
    nriPoidsTheoEl.value = poidsLorentz.toFixed(1);
  }

  panel.className = `result-panel status-info`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Lorentz = ${poidsLorentz.toFixed(1)} kg</div>
      <span class="result-Classification-badge">${sexe === 'F' ? 'Femme (k = 2,5)' : 'Homme (k = 4)'}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Devine (PBW) : ${poidsDevine.toFixed(1)} kg</span>
      <span class="subvalue-chip">Vt 6–8 mL/kg : ${vt6}–${vt8} mL</span>
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Poids idéal (Lorentz)', '${poidsLorentz.toFixed(1)} kg', 'Devine ${poidsDevine.toFixed(1)} kg')">📋 Copier</button>
    </div>
  `;
}

function calcNri() {
  const poidsAct = parseFloat(document.getElementById('nri_poids_act')?.value);
  const poidsTheo = parseFloat(document.getElementById('nri_poids_theo')?.value);
  const alb = parseFloat(document.getElementById('nri_alb')?.value);

  const panel = document.getElementById('res_nri');
  if (!panel) return;

  if (!poidsAct || !poidsTheo || !alb) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez le poids actuel, le poids habituel et l'albuminémie.</div>`;
    return;
  }

  const rawRatio = poidsAct / poidsTheo;
  const cappedRatio = rawRatio > 1 ? 1 : rawRatio;
  const nriCapped = (1.489 * alb) + (41.7 * cappedRatio);
  const pertePct = ((poidsTheo - poidsAct) / poidsTheo) * 100;

  let status = 'status-normal';
  let badge = 'Pas de risque (> 98)';
  let interp = `NRI > 98 : État nutritionnel satisfaisant.`;

  if (nriCapped < 82) {
    status = 'status-danger';
    badge = 'Risque majeur (< 82)';
    interp = `Dénutrition sévère (NRI < 82) : haut risque de complications. Support nutritionnel actif recommandé.`;
  } else if (nriCapped <= 92) {
    status = 'status-warn';
    badge = 'Risque modéré (82–92)';
    interp = `Risque nutritionnel modéré : surveillance des ingesta et compléments nutritionnels oraux (CNO).`;
  } else if (nriCapped <= 98) {
    status = 'status-info';
    badge = 'Risque bas (92–98)';
    interp = `Risque nutritionnel léger. Réévaluation hebdomadaire du poids.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">NRI = ${nriCapped.toFixed(1)}</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Variation poids : ${pertePct > 0 ? '-' + pertePct.toFixed(1) : '+' + Math.abs(pertePct).toFixed(1)} %</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score NRI (Buzby)', '${nriCapped.toFixed(1)}', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcHarrisBenedict() {
  const poids = parseFloat(document.getElementById('hb_poids')?.value);
  const taille = parseFloat(document.getElementById('hb_taille')?.value);
  const age = parseFloat(document.getElementById('hb_age')?.value);
  const sexe = document.getElementById('hb_sexe')?.value || 'H';
  const facteur = parseFloat(document.getElementById('hb_facteur')?.value || '1.3');

  const panel = document.getElementById('res_hb');
  if (!panel) return;

  if (!poids || !taille || !age) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez le poids, la taille et l'âge.</div>`;
    return;
  }

  const mb = sexe === 'F'
    ? 447.593 + (9.247 * poids) + (3.098 * taille) - (4.330 * age)
    : 88.362 + (13.397 * poids) + (4.799 * taille) - (5.677 * age);

  const det = mb * facteur;
  const protMin = Math.round(poids * 1.2);
  const protMax = Math.round(poids * 1.5);

  panel.className = 'result-panel status-info';
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">DET = ${Math.round(det)} kcal/j</div>
      <span class="result-Classification-badge">Repos : ${Math.round(mb)} kcal/j</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">${Math.round(det / poids)} kcal/kg/j</span>
      <span class="subvalue-chip">Protéines : ${protMin}–${protMax} g/j</span>
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Besoins Énergétiques', 'DET ${Math.round(det)} kcal/j (MB ${Math.round(mb)} kcal/j)', 'Protéines ${protMin}-${protMax} g/j')">📋 Copier</button>
    </div>
  `;
}

// ============================================================================
// 4. MEDECINE INTERNE CALCULATORS & CLASSIFICATIONS
// ============================================================================

function calcCalcemie() {
  const caRaw = parseFloat(document.getElementById('cac_cam')?.value);
  const caUnit = document.getElementById('cac_unit')?.value || 'mmol';
  const alb = parseFloat(document.getElementById('cac_alb')?.value);

  const panel = document.getElementById('res_cac');
  if (!panel) return;

  if (!caRaw || !alb) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la calcémie mesurée et l'albuminémie (g/L).</div>`;
    return;
  }

  const camMmol = caUnit === 'mgl' ? (caRaw / 40) : caRaw;
  const cacMmol = camMmol - 0.025 * (alb - 40);
  const cacMgl = cacMmol * 40;

  let status = 'status-normal';
  let badge = 'Normocalcémie (2,20–2,60)';
  let interp = `Calcémie corrigée normale (2,20 à 2,60 mmol/L soit 88 à 104 mg/L).`;

  if (cacMmol < 1.90) {
    status = 'status-danger';
    badge = 'Hypocalcémie sévère (< 1,90)';
    interp = `Risque de tétanie, convulsions et allongement du QTc. Vérifier Mg²⁺, PTH et vitamine D.`;
  } else if (cacMmol < 2.20) {
    status = 'status-warn';
    badge = 'Hypocalcémie (1,90–2,19)';
    interp = `Hypocalcémie confirmée après correction par l'albumine.`;
  } else if (cacMmol > 3.50) {
    status = 'status-danger';
    badge = 'Hypercalcémie maligne (≥ 3,50)';
    interp = `⚠️ Urgence vitale (coma, raccourcissement du QT, troubles du rythme, IRA). Réhydratation NaCl 0,9%, biphosphonates IV et ECG immédiat.`;
  } else if (cacMmol > 3.00) {
    status = 'status-danger';
    badge = 'Hypercalcémie modérée/sévère';
    interp = `Réhydratation IV et bilan étiologique (PTH, PTHrp, 1,25-(OH)₂D, EPS).`;
  } else if (cacMmol > 2.60) {
    status = 'status-warn';
    badge = 'Hypercalcémie légère (2,61–3,00)';
    interp = `Rechercher en 1re intention une hyperparathyroïdie primaire ou une cause néoplasique.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Ca corr = ${cacMmol.toFixed(2)} mmol/L</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">En mg/L : ${cacMgl.toFixed(1)} mg/L</span>
      <span class="subvalue-chip">Mesurée : ${camMmol.toFixed(2)} mmol/L</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Calcémie corrigée', '${cacMmol.toFixed(2)} mmol/L (${cacMgl.toFixed(1)} mg/L)', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcTrouAnionique() {
  const na = parseFloat(document.getElementById('ta_na')?.value);
  const cl = parseFloat(document.getElementById('ta_cl')?.value);
  const hco3 = parseFloat(document.getElementById('ta_hco3')?.value);
  const k = parseFloat(document.getElementById('ta_k')?.value);
  const alb = parseFloat(document.getElementById('ta_alb')?.value);

  const panel = document.getElementById('res_ta');
  if (!panel) return;

  if (!na || !cl || !hco3) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez Na⁺, Cl⁻ et HCO₃⁻ (en mmol/L).</div>`;
    return;
  }

  const taSimple = na - (cl + hco3);
  const taAvecK = !isNaN(k) ? (na + k) - (cl + hco3) : null;
  const taCorr = !isNaN(alb) && alb > 0 ? taSimple + 0.25 * (40 - alb) : taSimple;

  let status = 'status-normal';
  let badge = 'TA Normal (8–16 mmol/L)';
  let interp = `Si acidose métabolique : acidose hyperchlorémique à TA normal (pertes digestives de bicarbonates / diarrhées, acidose tubulaire rénale).`;

  if (taCorr > 16) {
    status = 'status-danger';
    badge = 'TA Élevé (> 16 mmol/L)';
    interp = `Acidose par gain d'acide : Acidocétose, Acidose lactique (choc, hypoxie, metformine), Insuffisance rénale sévère, ou Intoxication (salicylés, méthanol, éthylène glycol).`;
  } else if (taCorr < 8) {
    status = 'status-info';
    badge = 'TA Bas (< 8 mmol/L)';
    interp = `Rechercher une hypoalbuminémie, une gammapathie monoclonale à IgG ou une hypercalcémie.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">TA = ${taSimple.toFixed(1)} mmol/L</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      ${!isNaN(alb) && alb > 0 ? `<span class="subvalue-chip"><strong>Corrigé Alb (Figge) :</strong> ${taCorr.toFixed(1)} mmol/L</span>` : ''}
      ${taAvecK !== null ? `<span class="subvalue-chip">Avec K⁺ : ${taAvecK.toFixed(1)} mmol/L</span>` : ''}
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Trou Anionique', '${taSimple.toFixed(1)} mmol/L (Corrigé: ${taCorr.toFixed(1)})', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcNatremieOsm() {
  const na = parseFloat(document.getElementById('osm_na')?.value);
  const glyRaw = parseFloat(document.getElementById('osm_gly')?.value);
  const glyUnit = document.getElementById('osm_gly_unit')?.value || 'mmol';
  const uree = parseFloat(document.getElementById('osm_uree')?.value) || 0;

  const panel = document.getElementById('res_osm');
  if (!panel) return;

  if (!na || !glyRaw) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la natrémie et la glycémie.</div>`;
    return;
  }

  const glyMmol = glyUnit === 'gl' ? (glyRaw * 5.55) : glyRaw;
  const naCorr = glyMmol > 5.5 ? na + 0.3 * (glyMmol - 5.5) : na;
  const tonicite = 2 * na + glyMmol;
  const osmTotale = 2 * na + glyMmol + uree;

  let status = 'status-normal';
  let badge = 'Normonatrémie (135–145)';
  if (naCorr < 135) {
    status = naCorr < 125 ? 'status-danger' : 'status-warn';
    badge = `Hyponatrémie vraie (${naCorr.toFixed(1)})`;
  } else if (naCorr > 145) {
    status = naCorr > 155 ? 'status-danger' : 'status-warn';
    badge = `Hypernatrémie (${naCorr.toFixed(1)})`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Na⁺ corr = ${naCorr.toFixed(1)} mmol/L</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Tonicité : ${tonicite.toFixed(1)} mOsm/L</span>
      <span class="subvalue-chip">Osm totale : ${osmTotale.toFixed(1)} mOsm/L</span>
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Natrémie corrigée & Osmolarité', 'Na corr ${naCorr.toFixed(1)} mmol/L | Tonicité ${tonicite.toFixed(1)} mOsm/L', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcChildPugh() {
  const bili = parseInt(document.getElementById('cp_bili')?.value || '1', 10);
  const alb = parseInt(document.getElementById('cp_alb')?.value || '1', 10);
  const inr = parseInt(document.getElementById('cp_inr')?.value || '1', 10);
  const ascite = parseInt(document.getElementById('cp_ascite')?.value || '1', 10);
  const enceph = parseInt(document.getElementById('cp_enceph')?.value || '1', 10);

  const score = bili + alb + inr + ascite + enceph;
  let classe = 'Classe A (5–6 pts)';
  let status = 'status-normal';
  let pronostic = 'Cirrhose compensée. Survie à 1 an : ~100 % | Survie à 2 ans : ~85 %.';

  if (score >= 10) {
    classe = 'Classe C (10–15 pts)';
    status = 'status-danger';
    pronostic = 'Cirrhose décompensée. Survie à 1 an : ~45 % | Survie à 2 ans : ~35 %.';
  } else if (score >= 7) {
    classe = 'Classe B (7–9 pts)';
    status = 'status-warn';
    pronostic = 'Altération fonctionnelle significative. Survie à 1 an : ~80 % | Survie à 2 ans : ~60 %.';
  }

  const panel = document.getElementById('res_childpugh');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Child-Pugh = ${score} / 15</div>
      <span class="result-Classification-badge">${classe}</span>
    </div>
    <div class="result-interpretation">${pronostic}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score de Child-Pugh', '${score}/15', '${classe}')">📋 Copier</button>
    </div>
  `;
}

// ============================================================================
// 5. PEDIATRIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

function calcSchwartz() {
  const taille = parseFloat(document.getElementById('schwartz_taille')?.value);
  const crea = parseFloat(document.getElementById('schwartz_creat')?.value);
  const ageGroup = document.getElementById('schwartz_age_group')?.value || '2_12y';

  const panel = document.getElementById('res_schwartz');
  if (!panel) return;

  if (!taille || taille <= 0 || !crea || crea <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la taille (cm) et la créatininémie (µmol/L).</div>`;
    return;
  }

  const dfg = (36.5 * taille) / crea;

  const norms = {
    'prema_1w': { label: 'Prématuré (1re sem)', dfgNorm: '15 ± 6', min: 9 },
    'prema_2_8w': { label: 'Prématuré (2–8 sem)', dfgNorm: '29 ± 14', min: 15 },
    'prema_2m_2y': { label: 'Prématuré (2m–2 ans)', dfgNorm: '51 ± 20', min: 31 },
    'term_1w': { label: 'NN à terme (1re sem)', dfgNorm: '41 ± 15', min: 26 },
    'term_2_8w': { label: 'NN à terme (2–8 sem)', dfgNorm: '66 ± 25', min: 41 },
    'term_2m_2y': { label: 'Nourrisson (2m–2 ans)', dfgNorm: '96 ± 22', min: 74 },
    '2_12y': { label: 'Enfant (2–12 ans)', dfgNorm: '133 ± 27', min: 90 },
    '13_21_m': { label: 'Adolescent garçon', dfgNorm: '140 ± 30', min: 90 },
    '13_21_f': { label: 'Adolescente fille', dfgNorm: '126 ± 22', min: 90 }
  };

  const norm = norms[ageGroup];
  let status = 'status-normal';
  let badge = 'Normal pour l’âge';

  if (dfg < norm.min) {
    status = dfg < 30 ? 'status-danger' : 'status-warn';
    badge = `Abaissé (< ${norm.min})`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">DFG = ${dfg.toFixed(1)} <span style="font-size:0.9rem;font-weight:600">mL/min/1,73m²</span></div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">${norm.label} : attendu ${norm.dfgNorm}</span>
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('DFG Pédiatrique (Schwartz)', '${dfg.toFixed(1)} mL/min/1.73m²', '${norm.label} (${badge})')">📋 Copier</button>
    </div>
  `;
}

function calcHollidaySegar() {
  const poids = parseFloat(document.getElementById('ped_hs_poids')?.value);
  const panel = document.getElementById('res_holliday');
  if (!panel) return;

  if (!poids || poids <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez le poids de l'enfant en kg.</div>`;
    return;
  }

  let mlJour = 0;
  let mlHeure = 0;

  if (poids <= 10) {
    mlJour = poids * 100;
    mlHeure = poids * 4;
  } else if (poids <= 20) {
    mlJour = 1000 + (poids - 10) * 50;
    mlHeure = 40 + (poids - 10) * 2;
  } else {
    mlJour = 1500 + (poids - 20) * 20;
    mlHeure = 60 + (poids - 20) * 1;
  }

  const bolus20 = Math.round(poids * 20);
  const bolus10 = Math.round(poids * 10);

  panel.className = 'result-panel status-info';
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">${Math.round(mlJour)} mL/24h <span style="font-size:1rem;font-weight:600">(${mlHeure.toFixed(1)} mL/h)</span></div>
      <span class="result-Classification-badge">Règle 4-2-1</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Bolus 20 mL/kg : ${bolus20} mL</span>
      <span class="subvalue-chip">Bolus 10 mL/kg : ${bolus10} mL</span>
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Besoins Hydriques (Holliday-Segar)', '${Math.round(mlJour)} mL/24h (${mlHeure.toFixed(1)} mL/h)', 'Poids ${poids} kg')">📋 Copier</button>
    </div>
  `;
}

function calcApgar() {
  const fc = parseInt(document.getElementById('apgar_fc')?.value || '2', 10);
  const resp = parseInt(document.getElementById('apgar_resp')?.value || '2', 10);
  const tonus = parseInt(document.getElementById('apgar_tonus')?.value || '2', 10);
  const react = parseInt(document.getElementById('apgar_react')?.value || '2', 10);
  const color = parseInt(document.getElementById('apgar_color')?.value || '2', 10);

  const score = fc + resp + tonus + react + color;
  let status = 'status-normal';
  let badge = 'Adaptation normale (7–10)';
  let interp = `Bonne adaptation néonatale. Soins de routine (séchage, peau à peau, maintien thermique).`;

  if (score <= 3) {
    status = 'status-danger';
    badge = 'Détresse sévère (0–3)';
    interp = `Urgence néonatale : libération des VAS, ventilation en pression positive (VPP) puis intubation / MCE selon l'algorithme ILCOR.`;
  } else if (score <= 6) {
    status = 'status-warn';
    badge = 'Détresse modérée (4–6)';
    interp = `Stimulation, réchauffement, libération des VAS et VPP au masque si FC < 100/min ou apnée.`;
  }

  const panel = document.getElementById('res_apgar');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Apgar = ${score} / 10</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score d’Apgar', '${score}/10', '${badge}')">📋 Copier</button>
    </div>
  `;
}

// ============================================================================
// 6. REANIMATION & URGENCES CALCULATORS & CLASSIFICATIONS
// ============================================================================

function syncFio2FromO2Flow() {
  const flow = parseFloat(document.getElementById('pf_o2flow')?.value);
  const fio2El = document.getElementById('pf_fio2');
  if (!isNaN(flow) && flow >= 0 && fio2El) {
    fio2El.value = Math.min(100, Math.round(21 + 4 * flow));
    calcPf();
  }
}

function calcPf() {
  const pao2 = parseFloat(document.getElementById('pf_pao2')?.value);
  const fio2 = parseFloat(document.getElementById('pf_fio2')?.value);

  const panel = document.getElementById('res_pf');
  if (!panel) return;

  if (!pao2 || pao2 <= 0 || !fio2 || fio2 < 21 || fio2 > 100) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la PaO₂ (mmHg) et la FiO₂ (21 à 100 %).</div>`;
    return;
  }

  const pf = Math.round((pao2 / fio2) * 100);

  let status = 'status-normal';
  let berlin = 'Normal (> 400 mmHg)';
  let details = `Rapport PaO₂/FiO₂ normal (> 400 mmHg).`;

  if (pf <= 100) {
    status = 'status-danger';
    berlin = 'SDRA Sévère (≤ 100 mmHg)';
    details = `Berlin (si PEP ≥ 5 cmH₂O) : SDRA sévère. Ventilation protectrice (Vt 6 mL/kg PBW, Pplat ≤ 30), Décubitus Ventral ≥ 16h/j, discuter curarisation et VV-ECMO.`;
  } else if (pf <= 200) {
    status = 'status-danger';
    berlin = 'SDRA Modéré (101–200 mmHg)';
    details = `Berlin : SDRA modéré. Ventilation protectrice ; Décubitus Ventral indiqué si PaO₂/FiO₂ < 150 mmHg.`;
  } else if (pf <= 300) {
    status = 'status-warn';
    berlin = 'SDRA Léger (201–300 mmHg)';
    details = `Berlin : SDRA léger. Ventilation protectrice ou OHD selon la mécanique respiratoire.`;
  } else if (pf <= 400) {
    status = 'status-info';
    berlin = 'Hypoxémie modérée (301–400)';
    details = `Altération modérée de l'hématose sans critère de SDRA (> 300 mmHg).`;
  }

  document.querySelectorAll('#berlinTable tr[data-pf]').forEach(row => {
    const [min, max] = row.dataset.pf.split('-').map(Number);
    row.classList.toggle('active-row', pf >= min && pf <= max);
  });

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">PaO₂/FiO₂ = ${pf} mmHg</div>
      <span class="result-Classification-badge">${berlin}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">PaO₂ : ${pao2} mmHg</span>
      <span class="subvalue-chip">FiO₂ : ${fio2} %</span>
    </div>
    <div class="result-interpretation">${details}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Rapport PaO₂/FiO₂', '${pf} mmHg (PaO₂ ${pao2} / FiO₂ ${fio2}%)', '${berlin}')">📋 Copier</button>
    </div>
  `;
}

function calcGlasgow() {
  const e = parseInt(document.getElementById('gcs_e')?.value || '4', 10);
  const v = parseInt(document.getElementById('gcs_v')?.value || '5', 10);
  const m = parseInt(document.getElementById('gcs_m')?.value || '6', 10);

  const gcs = e + v + m;
  let status = 'status-normal';
  let badge = 'TC léger / Normal (13–15)';
  let interp = `Vigilance conservée ou traumatisme crânien léger (GCS 13–15).`;

  if (gcs <= 8) {
    status = 'status-danger';
    badge = 'Coma / TC Grave (GCS ≤ 8)';
    interp = `⚠️ Coma (GCS ≤ 8) : perte de protection des voies aériennes supérieures. Indication d'intubation orotrachéale (IOT) et scanner cérébral urgent.`;
  } else if (gcs <= 12) {
    status = 'status-warn';
    badge = 'TC Modéré (9–12)';
    interp = `Altération modérée de la vigilance (GCS 9–12). Surveillance neurologique rapprochée et imagerie cérébrale.`;
  }

  const panel = document.getElementById('res_glasgow');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Glasgow = ${gcs} / 15 <span style="font-size:0.95rem;font-weight:600">(E${e}V${v}M${m})</span></div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score de Glasgow', '${gcs}/15 (E${e}V${v}M${m})', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcQsofa() {
  let score = 0;
  document.querySelectorAll('#card-rea-qsofa input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += 1;
  });

  const status = score >= 2 ? 'status-danger' : (score === 1 ? 'status-warn' : 'status-normal');
  const badge = score >= 2 ? 'qSOFA ≥ 2 — Risque élevé de Sepsis' : 'qSOFA < 2 — Risque faible';
  const interp = score >= 2
    ? `⚠️ qSOFA ≥ 2 : prélever lactates, hémocultures, bilan SOFA complet, débuter l'antibiothérapie probabiliste dans l'heure et remplissage vasculaire si hypotension.`
    : `Score qSOFA < 2 : ne permet pas d'exclure un sepsis à lui seul ; poursuivre la surveillance clinique.`;

  const panel = document.getElementById('res_qsofa');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">qSOFA = ${score} / 3</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score qSOFA', '${score}/3', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function calcCurb65() {
  let score = 0;
  document.querySelectorAll('#card-rea-curb65 input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += 1;
  });

  let status = 'status-normal';
  let badge = 'Risque faible (0–1) — Ambulatoire';
  let interp = `Mortalité faible (< 2%). Traitement ambulatoire possible en l'absence d'hypoxémie ou d'isolement social.`;

  if (score === 2) {
    status = 'status-warn';
    badge = 'Risque modéré (2) — Hospitalisation';
    interp = `Mortalité ~9%. Hospitalisation conventionnelle recommandée.`;
  } else if (score >= 3) {
    status = 'status-danger';
    badge = `PAC sévère (${score}/5) — Urgence / USI`;
    interp = `Mortalité élevée (15–40%). Hospitalisation urgente ; discuter l'admission en soins intensifs si score ≥ 4.`;
  }

  const panel = document.getElementById('res_curb65');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">CURB-65 = ${score} / 5</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score CURB-65', '${score}/5', '${badge}')">📋 Copier</button>
    </div>
  `;
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('tomatocalc_theme', next);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.innerHTML = next === 'dark' ? '☀️ <span class="hide-mobile">Clair</span>' : '🌙 <span class="hide-mobile">Sombre</span>';
  }
}

function runAllCalculations() {
  calcChad();
  calcHasbled();
  calcQtc();
  calcWellsEp();
  calcPamHta();
  calcNephroDfg();
  calcFeNa();
  calcFeUree();
  updateKdigoMatrix();
  calcImc();
  calcLorentz();
  calcNri();
  calcHarrisBenedict();
  calcCalcemie();
  calcTrouAnionique();
  calcNatremieOsm();
  calcChildPugh();
  calcSchwartz();
  calcHollidaySegar();
  calcApgar();
  calcPf();
  calcGlasgow();
  calcQsofa();
  calcCurb65();
}

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('tomatocalc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('btnThemeToggle');
  if (themeBtn) {
    themeBtn.innerHTML = savedTheme === 'dark' ? '☀️ <span class="hide-mobile">Clair</span>' : '🌙 <span class="hide-mobile">Sombre</span>';
  }

  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderNavigationAndCards();
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  updateFavoriteButtons();
  renderClipboard();
  runAllCalculations();
  renderNavigationAndCards();
});
