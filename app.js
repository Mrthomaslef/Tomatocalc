// TomatoCalc — Moteur de Calcul Médical, Scores Cliniques & Classifications
// Conserve 100% des formules d'origine (corrigées et fiabilisées) + enrichissements cliniques

const SPECIALTIES = {
  all: {
    id: 'all',
    name: 'Toutes les spécialités',
    shortName: 'Toutes',
    icon: '🍅',
    color: 'var(--tomato-500)',
    bg: 'var(--tomato-50)',
    border: 'var(--tomato-100)',
    description: 'Vue d’ensemble des calculateurs biologiques, scores pronostiques et classifications médicales de TomatoCalc.'
  },
  cardio: {
    id: 'cardio',
    name: 'Cardiologie',
    shortName: 'Cardiologie',
    icon: '❤️',
    color: 'var(--cardio-color)',
    bg: 'var(--cardio-bg)',
    border: 'var(--cardio-border)',
    description: 'Risque thrombo-embolique (CHA₂DS₂-VASc), risque hémorragique (HAS-BLED), QT corrigé (Bazett / Fridericia), Wells EP, PAM & classifications HTA / NYHA.'
  },
  nephro: {
    id: 'nephro',
    name: 'Néphrologie',
    shortName: 'Néphrologie',
    icon: '🫘',
    color: 'var(--nephro-color)',
    bg: 'var(--nephro-bg)',
    border: 'var(--nephro-border)',
    description: 'Clairance de Cockcroft-Gault, DFG (CKD-EPI & MDRD), fractions d’excrétion (FE Na, FE Urée) et classifications KDIGO (IRC G1–G5 / A1–A3 & IRA).'
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrition',
    shortName: 'Nutrition',
    icon: '🍏',
    color: 'var(--nutri-color)',
    bg: 'var(--nutri-bg)',
    border: 'var(--nutri-border)',
    description: 'Indice de Masse Corporelle (IMC & classification OMS), Poids théorique de Lorentz, Nutritional Risk Index (Buzby), critères HAS de dénutrition et besoins caloriques.'
  },
  medint: {
    id: 'medint',
    name: 'Médecine interne',
    shortName: 'Méd. Interne',
    icon: '🧬',
    color: 'var(--medint-color)',
    bg: 'var(--medint-bg)',
    border: 'var(--medint-border)',
    description: 'Calcémie corrigée, Trou anionique plasmatique, Natrémie corrigée (Katz) & Osmolarité, et classification de Child-Pugh.'
  },
  pediatrie: {
    id: 'pediatrie',
    name: 'Pédiatrie',
    shortName: 'Pédiatrie',
    icon: '🧸',
    color: 'var(--ped-color)',
    bg: 'var(--ped-bg)',
    border: 'var(--ped-border)',
    description: 'Formule de Schwartz (DFG pédiatrique & normes par âge), besoins hydriques de Holliday-Segar (4-2-1), score d’Apgar et constantes vitales par âge.'
  },
  reanima: {
    id: 'reanima',
    name: 'Réanimation & Urgences',
    shortName: 'Réanimation',
    icon: '⚡',
    color: 'var(--rea-color)',
    bg: 'var(--rea-bg)',
    border: 'var(--rea-border)',
    description: 'Rapport PaO₂/FiO₂ (Horowitz & classification de Berlin du SDRA), Score de Glasgow (GCS), Score qSOFA et Score CURB-65.'
  }
};

// State
const state = {
  activeSpecialty: 'all',
  activeType: 'all', // 'all' | 'calc' | 'score' | 'classification' | 'fav'
  searchQuery: '',
  favorites: JSON.parse(localStorage.getItem('tomatocalc_favs') || '["nephro-dfg", "cardio-chad", "cardio-qtc", "rea-pf"]'),
  clipboard: [],
  patient: {
    age: '',
    sexe: 'H', // 'H' | 'F'
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
  updateCounts();
  if (state.activeType === 'fav') {
    applyFilters();
  }
}

function updateFavoriteButtons() {
  document.querySelectorAll('.btn-fav').forEach(btn => {
    const id = btn.getAttribute('data-id');
    const isFav = state.favorites.includes(id);
    btn.classList.toggle('active', isFav);
    btn.innerHTML = isFav ? '★' : '☆';
    btn.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
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
  }, 2400);
}

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
    if (state.clipboard.length > 8) state.clipboard.pop();
  }
  renderClipboard();
}

function copySingleResult(title, value, interpretation) {
  const text = `${title} : ${value}${interpretation ? ' (' + interpretation + ')' : ''}`;
  navigator.clipboard.writeText(text).then(() => {
    addToClipboard(title, value, interpretation);
    showToast(`Copié : ${text}`);
  }).catch(() => {
    addToClipboard(title, value, interpretation);
    showToast(`Ajouté au presse-papiers clinique`);
  });
}

function copyAllClipboard() {
  if (state.clipboard.length === 0) {
    showToast('Aucun résultat enregistré pour le moment.');
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
  navigator.clipboard.writeText(text).then(() => {
    showToast('Synthèse complète copiée dans le presse-papiers !');
  });
}

function renderClipboard() {
  const container = document.getElementById('clipboardList');
  if (!container) return;
  if (state.clipboard.length === 0) {
    container.innerHTML = `<div class="clipboard-empty">Cliquez sur « Copier » dans un outil pour épingler vos résultats ici.</div>`;
    return;
  }
  container.innerHTML = state.clipboard.map(item => `
    <div class="clipboard-item">
      <div class="clipboard-item-header">
        <span>${item.title}</span>
        <span class="clipboard-item-val">${item.value}</span>
      </div>
      ${item.interpretation ? `<div style="color:var(--text-muted);font-size:0.72rem;">${item.interpretation}</div>` : ''}
    </div>
  `).join('');
}

// ============================================================================
// PATIENT BAR SYNCHRONIZATION
// ============================================================================
function syncPatientContext() {
  const age = document.getElementById('patAge').value;
  const sexe = document.getElementById('patSexe').value;
  const poids = document.getElementById('patPoids').value;
  const taille = document.getElementById('patTaille').value;
  const creat = document.getElementById('patCreat').value;
  const alb = document.getElementById('patAlb').value;

  state.patient = { age, sexe, poids, taille, creat, alb };

  // Propagate to calculators when patient bar changes
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== '') el.value = val;
  };

  if (age !== '') {
    setVal('dfg_age', age);
    setVal('hb_age', age);
    // Also update CHA2DS2-VASc and HAS-BLED age checkboxes
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
  showToast('Profil patient réinitialisé');
}

// ============================================================================
// 1. CARDIOLOGIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 1A. CHA2DS2-VASc (Original + ESC Guidelines)
function calcChad() {
  // Mutually exclusive age 65-74 vs >=75
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

  // Update visual checked state on criteria labels
  document.querySelectorAll('#card-cardio-chad .criteria-item').forEach(label => {
    const input = label.querySelector('input');
    if (input) label.classList.toggle('checked', input.checked);
  });

  const nonSexPoints = ic + hta + age75 + diab + avc + vasc + age65;
  // Note: In original MedicCa.js, female sex was counted when age>=65 or in standard CHA2DS2-VASc as +1 modifier
  const sexPoint = isFemale ? 1 : 0;
  const totalScore = nonSexPoints + sexPoint;

  // Annual stroke risk (%)
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
    reco = `Aucun traitement antithrombotique (ni anticoagulant, ni antiagrégant plaquettaire). Le sexe féminin isolé sans autre facteur de risque ne justifie pas d'anticoagulation.`;
  } else if (nonSexPoints === 1) {
    status = 'status-warn';
    badge = `Risque intermédiaire (${ isFemale ? 'Femme = 2' : 'Homme = 1' })`;
    reco = `Anticoagulation orale (AOD en 1re intention ou AVK) à discuter (Classe IIa) après évaluation de la balance bénéfice/risque hémorragique (score HAS-BLED) et des préférences du patient.`;
  } else {
    status = 'status-danger';
    badge = 'Risque thrombo-embolique élevé';
    reco = `Indication formelle d'anticoagulation orale au long cours (Classe IA — AOD en 1re intention sauf sténose mitrale modérée/sévère ou valve mécanique) sous réserve d'un risque hémorragique maîtrisé.`;
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
      <span class="subvalue-chip">Risque annuel d'AVC estimé : ${strokeRiskTable[totalScore] || '> 12 % / an'}</span>
      <span class="subvalue-chip">Facteurs hors sexe : ${nonSexPoints} pt${nonSexPoints > 1 ? 's' : ''}</span>
    </div>
    <div class="result-interpretation">${reco}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score CHA₂DS₂-VASc', '${totalScore}/9', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 1B. Score HAS-BLED
function calcHasbled() {
  let score = 0;
  document.querySelectorAll('#card-cardio-hasbled input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += parseInt(cb.value, 10);
  });

  let status = 'status-normal';
  let badge = 'Risque hémorragique faible';
  let reco = `Risque de saignement majeur faible (~1 %/an). Pas de contre-indication à l'anticoagulation si indiquée.`;

  if (score === 2) {
    status = 'status-warn';
    badge = 'Risque hémorragique modéré';
    reco = `Risque de saignement majeur ~1,9 %/an. Surveillance régulière et correction des facteurs de risque modifiables (TA, AINS, alcool).`;
  } else if (score >= 3) {
    status = 'status-danger';
    badge = 'Risque hémorragique élevé (≥ 3)';
    reco = `Haut risque hémorragique (≥ 3,7 %/an). Ne contre-indique pas formellement l'anticoagulation mais impose la correction des facteurs réversibles (HTA, INR labile, co-médications, alcool) et un suivi rapproché.`;
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
      <button class="btn-copy-result" onclick="copySingleResult('Score HAS-BLED', '${score}/9', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 1C. QT Corrigé (Original Bazett & Fridericia + Framingham)
function syncQtRrFromHr(source) {
  const hrEl = document.getElementById('qtc_hr');
  const rrEl = document.getElementById('qtc_rr');
  if (!hrEl || !rrEl) return;

  if (source === 'hr') {
    const hr = parseFloat(hrEl.value);
    if (hr > 0) {
      rrEl.value = Math.round(60000 / hr);
    }
  } else if (source === 'rr') {
    const rr = parseFloat(rrEl.value);
    if (rr > 0) {
      hrEl.value = Math.round(60000 / rr);
    }
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
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Saisissez le QT mesuré (en ms) et la fréquence cardiaque (ou l'intervalle R-R).</div>`;
    return;
  }

  const rrSec = rrMs > 0 ? (rrMs / 1000) : (60 / hr);
  const effectiveHr = hr > 0 ? hr : (60 / rrSec);

  // Original formulas from MedicCa.js:
  // Bazett: QTm / sqrt(60 / FC) = QTm / sqrt(RR_sec)
  // Fridericia: QTm / cbrt(RR_sec) (or QTm * 10 / cbrt(RR_ms))
  const qtcBazett = Math.round(qtm / Math.sqrt(rrSec));
  const qtcFridericia = Math.round(qtm / Math.cbrt(rrSec));
  const qtcFramingham = Math.round(qtm + 154 * (1 - rrSec));

  // Choose primary reference (Fridericia preferred when FC < 60 or > 100 bpm)
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
    interp = `QT court : rechercher une hypercalcémie, une hyperkaliémie, une imprégnation digitalique ou un syndrome du QT court congénital.`;
  } else if (refQtc >= 500) {
    status = 'status-danger';
    badge = 'Allongement Critique (≥ 500 ms)';
    interp = `Risque majeur de Torsades de Pointes ! Arrêter tout traitement allongeant le QT, corriger immédiatement une hypokaliémie / hypomagnésémie / hypocalcémie et monitorer l'ECG.`;
  } else if (refQtc > prolongedThreshold) {
    status = 'status-danger';
    badge = 'QTc Allongé';
    interp = `Allongement franc du QTc (> ${prolongedThreshold} ms). Vérifier l'ionogramme (K⁺, Mg²⁺, Ca²⁺) et les interactions médicamenteuses.`;
  } else if (refQtc > upperNormal) {
    status = 'status-warn';
    badge = 'QTc Limite / Zone grise';
    interp = `QTc limite (${upperNormal + 1}–${prolongedThreshold} ms). Surveillance ECG recommandée en cas d'introduction de traitement bradycardisant ou allongeant le QT.`;
  }

  if (isExtremeHr) {
    interp += ` (Note : FC à ${Math.round(effectiveHr)} bpm — la formule de Fridericia est plus précise que Bazett aux fréquences cardiaques extrêmes).`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Bazett : ${qtcBazett} ms <span style="font-weight:500;font-size:1rem;opacity:0.85">| Fridericia : ${qtcFridericia} ms</span></div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Framingham : ${qtcFramingham} ms</span>
      <span class="subvalue-chip">RR : ${Math.round(rrSec * 1000)} ms (${Math.round(effectiveHr)} bpm)</span>
      <span class="subvalue-chip">Seuil normal (${sexe}) : ≤ ${upperNormal} ms</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('QT corrigé', 'Bazett ${qtcBazett} ms / Fridericia ${qtcFridericia} ms', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 1D. Score de Wells (Embolie Pulmonaire)
function calcWellsEp() {
  let score = 0;
  document.querySelectorAll('#card-cardio-wells input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += parseFloat(cb.value);
  });

  let status = 'status-normal';
  let level3 = 'Probabilité clinique faible (0–1,5)';
  let level2 = score <= 4 ? 'EP peu probable (≤ 4)' : 'EP probable (> 4)';
  let conduite = '';

  if (score <= 1.5) {
    status = 'status-normal';
    level3 = 'Probabilité faible';
    conduite = `Dosage des D-dimères (seuil ajusté à l'âge après 50 ans : Âge × 10 µg/L). Si négatifs, l'embolie pulmonaire est exclue sans imagerie.`;
  } else if (score <= 6) {
    status = 'status-warn';
    level3 = 'Probabilité intermédiaire (2–6)';
    conduite = score <= 4
      ? `Score ≤ 4 (EP peu probable) : Dosage des D-dimères en 1re intention ; angioscanner thoracique si D-dimères positifs.`
      : `Score > 4 (EP probable) : Angioscanner thoracique spiralé d'emblée (et anticoagulation probabiliste en l'absence de risque hémorragique élevé si attente).`;
  } else {
    status = 'status-danger';
    level3 = 'Probabilité clinique élevée (≥ 6,5)';
    conduite = `Angioscanner thoracique d'emblée sans dosage préalable des D-dimères. Anticoagulation curative immédiate recommandée en attendant l'imagerie.`;
  }

  const panel = document.getElementById('res_wells');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Score de Wells EP = ${score} pt${score > 1 ? 's' : ''}</div>
      <span class="result-Classification-badge">${level3}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Classification binaire : ${level2}</span>
    </div>
    <div class="result-interpretation">${conduite}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score de Wells EP', '${score} pts', '${level3} (${level2})')">📋 Copier le résultat</button>
    </div>
  `;
}

// 1E. PAM & Classification HTA (ESC / ESH)
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

  // ESC Classification
  let grade = '';
  let status = 'status-normal';

  if (pas < 90 || pam < 65) {
    grade = 'Hypotension / Hypoperfusion (PAM < 65 mmHg)';
    status = 'status-danger';
  } else if (pas >= 140 && pad < 90) {
    // Check grade of isolated systolic
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
    grade = 'PA Optimale (< 120/80 mmHg)';
    status = 'status-normal';
  }

  const perfText = pam >= 65
    ? `PAM ≥ 65 mmHg : pression de perfusion tissulaire conservée.`
    : `⚠️ PAM < 65 mmHg : seuil critique d'hypoperfusion d'organe (objectif réanimatoire ≥ 65 mmHg).`;

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">PAM = ${pam} mmHg</div>
      <span class="result-Classification-badge">${grade}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">PA : ${pas}/${pad} mmHg</span>
      <span class="subvalue-chip">Pression pulsée (PP) : ${pp} mmHg</span>
    </div>
    <div class="result-interpretation">${perfText}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('PAM & PA', 'PAM ${pam} mmHg (PA ${pas}/${pad})', '${grade}')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// 2. NEPHROLOGIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 2A. Clairance Cockcroft, MDRD & CKD-EPI (Original 3 calculators unified + KDIGO staging)
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
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Renseignez l'âge, la créatininémie et le poids (pour Cockcroft-Gault).</div>`;
    return;
  }

  // Convert creatinine to both µmol/L and mg/dL
  const creatUmol = creatUnit === 'mgdl' ? creatRaw * 88.4 : creatRaw;
  const creatMgdl = creatUnit === 'mgdl' ? creatRaw : creatRaw * 0.011312;

  // 1. Cockcroft & Gault (Original formula: ((140 - age) * poids * k) / creat_umol)
  const kCockcroft = sexe === 'F' ? 1.04 : 1.23;
  const cg = (poids && poids > 0) ? ((140 - age) * poids * kCockcroft) / creatUmol : null;

  // 2. MDRD 175 (Original formula: 175 * (creat * 0.0113)^-1.154 * age^-0.203 * (0.742 if F) * (1.212 if black))
  const mdrdSex = sexe === 'F' ? 0.742 : 1.0;
  const mdrdEth = ethnie === 'black' ? 1.212 : 1.0;
  const mdrd = 175 * Math.pow(creatMgdl, -1.154) * Math.pow(age, -0.203) * mdrdSex * mdrdEth;

  // 3. CKD-EPI 2009 (Fixed from original MedicNE.js!)
  // K = 62 µmol/L (0.7 mg/dL) for F, 80 µmol/L (0.9 mg/dL) for M
  // alpha = -0.329 for F, -0.411 for M
  const kEpi09 = sexe === 'F' ? 0.7 : 0.9;
  const alpha09 = sexe === 'F' ? -0.329 : -0.411;
  const sexFactor09 = sexe === 'F' ? 1.018 : 1.0;
  const ethFactor09 = ethnie === 'black' ? 1.159 : 1.0;
  const ratio09 = creatMgdl / kEpi09;
  const ckdepi2009 = 141 * Math.pow(Math.min(ratio09, 1), alpha09) * Math.pow(Math.max(ratio09, 1), -1.209) * Math.pow(0.993, age) * sexFactor09 * ethFactor09;

  // 4. CKD-EPI 2021 (Race-free international reference)
  const kEpi21 = sexe === 'F' ? 0.7 : 0.9;
  const alpha21 = sexe === 'F' ? -0.241 : -0.302;
  const sexFactor21 = sexe === 'F' ? 1.012 : 1.0;
  const ratio21 = creatMgdl / kEpi21;
  const ckdepi2021 = 142 * Math.pow(Math.min(ratio21, 1), alpha21) * Math.pow(Math.max(ratio21, 1), -1.200) * Math.pow(0.9938, age) * sexFactor21;

  // KDIGO Staging based on CKD-EPI
  const refDfg = ckdepi2009;
  let kdigoStage = '';
  let kdigoDesc = '';
  let status = 'status-normal';

  if (refDfg >= 90) {
    kdigoStage = 'Stade KDIGO G1';
    kdigoDesc = 'DFG normal ou élevé (≥ 90 mL/min/1,73m²)';
    status = 'status-normal';
  } else if (refDfg >= 60) {
    kdigoStage = 'Stade KDIGO G2';
    kdigoDesc = 'DFG légèrement diminué (60–89 mL/min/1,73m²)';
    status = 'status-normal';
  } else if (refDfg >= 45) {
    kdigoStage = 'Stade KDIGO G3a';
    kdigoDesc = 'IRC légère à modérée (45–59 mL/min/1,73m²)';
    status = 'status-warn';
  } else if (refDfg >= 30) {
    kdigoStage = 'Stade KDIGO G3b';
    kdigoDesc = 'IRC modérée à sévère (30–44 mL/min/1,73m²)';
    status = 'status-warn';
  } else if (refDfg >= 15) {
    kdigoStage = 'Stade KDIGO G4';
    kdigoDesc = 'IRC sévère (15–29 mL/min/1,73m²) — Préparation suppléance';
    status = 'status-danger';
  } else {
    kdigoStage = 'Stade KDIGO G5';
    kdigoDesc = 'Insuffisance rénale terminale (< 15 mL/min/1,73m²)';
    status = 'status-danger';
  }

  // Also sync with KDIGO matrix if present
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
      <span class="subvalue-chip"><strong>Cockcroft-Gault :</strong> ${cgStr}</span>
      <span class="subvalue-chip"><strong>MDRD :</strong> ${mdrd.toFixed(1)} mL/min/1,73m²</span>
      <span class="subvalue-chip"><strong>CKD-EPI 2021 :</strong> ${ckdepi2021.toFixed(1)} mL/min/1,73m²</span>
    </div>
    <div class="result-interpretation">
      <strong>${kdigoDesc}.</strong> Utilisez le DFG indexé (CKD-EPI) pour le diagnostic et le suivi de l'IRC (recommandation HAS), et la clairance de Cockcroft-Gault pour l'adaptation posologique des médicaments à marge thérapeutique étroite selon le RCP.
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Fonction Rénale', 'CKD-EPI ${ckdepi2009.toFixed(1)} mL/min/1.73m² | Cockcroft ${cgStr} | MDRD ${mdrd.toFixed(1)}', '${kdigoStage}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 2B. Fraction d'Excrétion du Sodium (FENa) & Fraction d'Excrétion de l'Urée (FEUrée) (Originals 4 & 5)
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
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez Na urinaire, Na plasmatique, Créat urinaire et Créat plasmatique.</div>`;
    return;
  }

  // If creatP is in µmol/L and creatU is in mmol/L, convert creatP to mmol/L (/1000)
  // If both are in mmol/L (as in original MedicNE.html), ratio is direct, then * 100 for percentage
  const creatPMmol = unitMode === 'umol_mmol' ? (creatP / 1000) : creatP;
  const fenaRatio = (naU * creatPMmol) / (naP * creatU);
  const fenaPct = fenaRatio * 100;

  let status = 'status-info';
  let badge = '';
  let interp = '';

  if (fenaPct < 1) {
    status = 'status-warn';
    badge = 'FE(Na) < 1 % — IRA Fonctionnelle';
    interp = `En faveur d'une Insuffisance Rénale Aiguë fonctionnelle (pré-rénale : hypovolémie, bas débit, réabsorption tubulaire de sodium préservée). Attention : interprétation faussée si prise de diurétiques (utiliser alors la FE de l'urée).`;
  } else if (fenaPct <= 2) {
    status = 'status-info';
    badge = 'FE(Na) 1–2 % — Zone intermédiaire';
    interp = `Zone grise (1 à 2 %). Confrontez au contexte hémodynamique, au rapport Na/K urinaire et à la FE de l'urée.`;
  } else {
    status = 'status-danger';
    badge = 'FE(Na) > 2 % — IRA Organique (NTA)';
    interp = `En faveur d'une Insuffisance Rénale Aiguë organique (Nécrose Tubulaire Aiguë) ou d'une natriurèse induite par les diurétiques.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">FE(Na) = ${fenaPct.toFixed(2)} %</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Rapport brut (code d'origine) : ${fenaRatio.toFixed(4)}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('FE du Sodium', '${fenaPct.toFixed(2)} %', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

function calcFeUree() {
  const ureeU = parseFloat(document.getElementById('feuree_uu')?.value);
  const ureeP = parseFloat(document.getElementById('feuree_up')?.value);
  const creatU = parseFloat(document.getElementById('feuree_cu')?.value);
  const creatP = parseFloat(document.getElementById('feuree_cp')?.value);
  const unitMode = document.getElementById('feuree_unit_mode')?.value || 'same';

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
    interp = `Origine fonctionnelle (pré-rénale) très probable (< 35 %). Ce paramètre reste interprétable même chez un patient traité par diurétiques de l'anse ou thiazidiques !`;
  } else if (pct <= 50) {
    status = 'status-info';
    badge = 'FE(Urée) 35–50 % — Zone intermédiaire';
    interp = `Valeur intermédiaire entre 35 % et 50 %.`;
  } else {
    status = 'status-danger';
    badge = 'FE(Urée) > 50 % — IRA Organique (NTA)';
    interp = `En faveur d'une atteinte tubulaire organique (Nécrose Tubulaire Aiguë).`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">FE(Urée) = ${pct.toFixed(1)} %</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Rapport brut (code d'origine) : ${ratio.toFixed(3)}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('FE Urée', '${pct.toFixed(1)} %', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 2C. Classification KDIGO Interactive Matrix (G1-G5 x A1-A3)
function updateKdigoMatrix() {
  const g = document.getElementById('kdigo_g')?.value || 'G2';
  const a = document.getElementById('kdigo_a')?.value || 'A1';

  document.querySelectorAll('#kdigoMatrixTable .kdigo-cell').forEach(cell => {
    cell.classList.toggle('kdigo-selected', cell.dataset.ga === `${g}-${a}`);
  });

  const riskMap = {
    'G1-A1': { risk: 'Risque faible (en l’absence d’autre marqueur d’atteinte rénale)', status: 'status-normal', freq: 'Suivi annuel si facteur de risque (HTA, diabète)' },
    'G2-A1': { risk: 'Risque faible (en l’absence d’autre marqueur d’atteinte rénale)', status: 'status-normal', freq: 'Suivi annuel si facteur de risque' },
    'G1-A2': { risk: 'Risque modérément augmenté', status: 'status-warn', freq: 'Suivi 1 fois / an — Blocage SRAA (IEC/ARA2) + iSGLT2 selon indication' },
    'G2-A2': { risk: 'Risque modérément augmenté', status: 'status-warn', freq: 'Suivi 1 fois / an — Néphroprotection (IEC/ARA2 ± iSGLT2)' },
    'G3a-A1': { risk: 'Risque modérément augmenté', status: 'status-warn', freq: 'Suivi 1 fois / an — Éviction des néphrotoxiques' },
    'G1-A3': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois / an — Avis néphrologique recommandé (albuminurie sévère)' },
    'G2-A3': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois / an — Avis néphrologique & néphroprotection maximale' },
    'G3a-A2': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois / an — Contrôle TA < 130/80 mmHg, IEC/ARA2 + iSGLT2' },
    'G3b-A1': { risk: 'Risque élevé', status: 'status-danger', freq: 'Suivi 2 fois / an — Bilan des complications phosphocalciques et anémie' },
    'G3a-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois / an — Prise en charge néphrologique spécialisée' },
    'G3b-A2': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois / an — Prise en charge néphrologique spécialisée' },
    'G3b-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois / an — Prise en charge néphrologique spécialisée' },
    'G4-A1': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois / an — Préservation du capital veineux, vaccination VHB' },
    'G4-A2': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 3 fois / an — Information suppléance / transplantation' },
    'G4-A3': { risk: 'Risque très élevé', status: 'status-danger', freq: 'Suivi ≥ 4 fois / an — Suivi néphrologique rapproché' },
    'G5-A1': { risk: 'Risque très élevé (Stade terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois / an — Préparation dialyse / greffe' },
    'G5-A2': { risk: 'Risque très élevé (Stade terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois / an — Préparation dialyse / greffe' },
    'G5-A3': { risk: 'Risque très élevé (Stade terminal)', status: 'status-danger', freq: 'Suivi ≥ 4 fois / an — Préparation dialyse / greffe' }
  };

  const info = riskMap[`${g}-${a}`];
  const panel = document.getElementById('res_kdigo_matrix');
  if (!panel || !info) return;
  panel.className = `result-panel ${info.status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Classification KDIGO : ${g}${a}</div>
      <span class="result-Classification-badge">${info.risk}</span>
    </div>
    <div class="result-interpretation">${info.freq}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Classification KDIGO IRC', '${g}${a}', '${info.risk}')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// 3. NUTRITION CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 3A. IMC & Surface Corporelle (Original + OMS Classification)
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

  // Handle if user entered height in meters (e.g. 1.75) vs cm (175)
  const tailleCm = taille <= 3 ? taille * 100 : taille;
  const tailleM = tailleCm / 100;

  // Original formula: Math.round(poids / Math.pow(taille, 2) * 1000000) / 100
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
    details = `Critère phénotypique de dénutrition sévère chez l'adulte. Prise en charge nutritionnelle urgente.`;
  } else if (imc < 18.5) {
    status = 'status-warn';
    classeOms = 'Maigreur / Dénutrition (16,5–18,4)';
    details = `IMC < 18,5 kg/m² : critère phénotypique de dénutrition chez l'adulte (< 70 ans). Chez le sujet ≥ 70 ans, le seuil de dénutrition est un IMC < 22 kg/m² (sévère si < 20).`;
  } else if (imc < 25) {
    status = 'status-normal';
    classeOms = 'Corpulence normale (18,5–24,9)';
    details = `Poids normal selon l'OMS (intervalle de poids normal pour ${tailleCm} cm : ${poidsMinNormal} à ${poidsMaxNormal} kg).`;
  } else if (imc < 30) {
    status = 'status-warn';
    classeOms = 'Surpoids / Pré-obésité (25,0–29,9)';
    details = `Surpoids selon la classification OMS. Évaluer le tour de taille et les facteurs de risque cardiovasculaire.`;
  } else if (imc < 35) {
    status = 'status-warn';
    classeOms = 'Obésité Grade I — Modérée (30,0–34,9)';
    details = `Obésité commune (Classe I OMS). Dépistage des comorbidités métaboliques, cardiovasculaires et mécaniques.`;
  } else if (imc < 40) {
    status = 'status-danger';
    classeOms = 'Obésité Grade II — Sévère (35,0–39,9)';
    details = `Obésité sévère (Classe II OMS). Risque élevé de complications cardio-métaboliques et respiratoires (SAOS).`;
  } else {
    status = 'status-danger';
    classeOms = 'Obésité Grade III — Massive / Morbide (≥ 40)';
    details = `Obésité morbide (Classe III OMS). Prise en charge spécialisée multidisciplinaire.`;
  }

  // Highlight active row in OMS table if visible
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
      <span class="subvalue-chip">Surface corporelle (Mosteller) : ${bsaMosteller.toFixed(2)} m²</span>
      <span class="subvalue-chip">Cible IMC 18,5–25 : ${poidsMinNormal}–${poidsMaxNormal} kg</span>
    </div>
    <div class="result-interpretation">${details}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('IMC & SC', 'IMC ${imc.toFixed(2)} kg/m² (SC ${bsaMosteller.toFixed(2)} m²)', '${classeOms}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 3B. Poids théorique de Lorentz & Devine (Original 2)
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

  // Original formula from MedicNU.js:
  // result = taille - 100 - ((taille - 150) / k) with k=4 (Homme) and k=2.5 (Femme)
  const k = sexe === 'F' ? 2.5 : 4;
  const poidsLorentz = taille - 100 - ((taille - 150) / k);

  // Devine formula (used for tidal volume 6 mL/kg PBW in ICU)
  const baseDevine = sexe === 'F' ? 45.5 : 50.0;
  const poidsDevine = baseDevine + 0.91 * (taille - 152.4);
  const vt6 = Math.round(poidsDevine * 6);
  const vt8 = Math.round(poidsDevine * 8);

  // Propagate theoretical weight to NRI if empty
  const nriPoidsTheoEl = document.getElementById('nri_poids_theo');
  if (nriPoidsTheoEl && !nriPoidsTheoEl.value) {
    nriPoidsTheoEl.value = poidsLorentz.toFixed(1);
  }

  panel.className = `result-panel status-info`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Poids idéal (Lorentz) = ${poidsLorentz.toFixed(1)} kg</div>
      <span class="result-Classification-badge">${sexe === 'F' ? 'Femme (k = 2,5)' : 'Homme (k = 4)'}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Poids prédit (Devine) : ${poidsDevine.toFixed(1)} kg</span>
      <span class="subvalue-chip">Vt protecteur (6–8 mL/kg) : ${vt6}–${vt8} mL</span>
    </div>
    <div class="result-interpretation">
      Formule de Lorentz d'origine : <code>Taille - 100 - ((Taille - 150) / ${k})</code>.
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Poids idéal (Lorentz)', '${poidsLorentz.toFixed(1)} kg', 'Devine ${poidsDevine.toFixed(1)} kg')">📋 Copier le résultat</button>
    </div>
  `;
}

// 3C. Nutritional Risk Index (NRI / Indice de Buzby) (Original 3)
function calcNri() {
  const poidsAct = parseFloat(document.getElementById('nri_poids_act')?.value);
  const poidsTheo = parseFloat(document.getElementById('nri_poids_theo')?.value);
  const alb = parseFloat(document.getElementById('nri_alb')?.value);

  const panel = document.getElementById('res_nri');
  if (!panel) return;

  if (!poidsAct || !poidsTheo || !alb) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez le poids actuel, le poids habituel/théorique et l'albuminémie (g/L).</div>`;
    return;
  }

  // Original MedicNU.js caps (poids2 / poids3) at 1 when > 1:
  const rawRatio = poidsAct / poidsTheo;
  const cappedRatio = rawRatio > 1 ? 1 : rawRatio;
  const nriCapped = (1.489 * alb) + (41.7 * cappedRatio);
  const nriUncapped = (1.489 * alb) + (41.7 * rawRatio);
  const pertePct = ((poidsTheo - poidsAct) / poidsTheo) * 100;

  let status = 'status-normal';
  let badge = 'Pas de risque nutritionnel (> 98)';
  let interp = `NRI > 98 : État nutritionnel satisfaisant, pas de surrisque lié à la dénutrition.`;

  if (nriCapped < 82) {
    status = 'status-danger';
    badge = 'Risque nutritionnel majeur (< 82)';
    interp = `Dénutrition sévère (NRI < 82) : haut risque de complications post-opératoires ou hospitalières. Support nutritionnel actif recommandé.`;
  } else if (nriCapped <= 92) {
    status = 'status-warn';
    badge = 'Risque nutritionnel modéré (82–92)';
    interp = `Risque nutritionnel modéré (82 à 92) : surveillance des ingesta et enrichissement / compléments nutritionnels oraux (CNO).`;
  } else if (nriCapped <= 98) {
    status = 'status-info';
    badge = 'Risque nutritionnel bas (92–98)';
    interp = `Risque nutritionnel léger (92 à 98). Réévaluation hebdomadaire du poids.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">NRI = ${nriCapped.toFixed(1)}</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">NRI non plafonné : ${nriUncapped.toFixed(1)}</span>
      <span class="subvalue-chip">Variation pondérale : ${pertePct > 0 ? '-' + pertePct.toFixed(1) : '+' + Math.abs(pertePct).toFixed(1)} %</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score NRI (Buzby)', '${nriCapped.toFixed(1)}', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 3D. Besoins Énergétiques (Harris & Benedict)
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

  // Roza & Shizgal revised Harris-Benedict
  const mb = sexe === 'F'
    ? 447.593 + (9.247 * poids) + (3.098 * taille) - (4.330 * age)
    : 88.362 + (13.397 * poids) + (4.799 * taille) - (5.677 * age);

  const det = mb * facteur;
  const protMin = Math.round(poids * 1.2);
  const protMax = Math.round(poids * 1.5);

  panel.className = 'result-panel status-info';
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">DET = ${Math.round(det)} kcal / jour</div>
      <span class="result-Classification-badge">MB = ${Math.round(mb)} kcal/j</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Ratio : ${Math.round(det / poids)} kcal/kg/j</span>
      <span class="subvalue-chip">Cible protéique (1,2–1,5 g/kg) : ${protMin}–${protMax} g/j</span>
    </div>
    <div class="result-interpretation">
      Dépense énergétique de repos (Harris & Benedict révisée) pondérée par le facteur d'activité/agression (×${facteur}).
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Besoins Énergétiques', 'DET ${Math.round(det)} kcal/j (MB ${Math.round(mb)} kcal/j)', 'Protéines ${protMin}-${protMax} g/j')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// 4. MEDECINE INTERNE CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 4A. Calcémie Corrigée (Original medint.js + mg/L support + Classification)
function calcCalcemie() {
  const caRaw = parseFloat(document.getElementById('cac_cam')?.value);
  const caUnit = document.getElementById('cac_unit')?.value || 'mmol';
  const alb = parseFloat(document.getElementById('cac_alb')?.value);

  const panel = document.getElementById('res_cac');
  if (!panel) return;

  if (!caRaw || !alb) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la calcémie mesurée et l'albuminémie (en g/L).</div>`;
    return;
  }

  // Convert to mmol/L if input in mg/L (1 mmol/L = 40 mg/L)
  const camMmol = caUnit === 'mgl' ? (caRaw / 40) : caRaw;

  // Original formula from medint.js:
  // result = cam - 0.025 * (alb - 40)
  const cacMmol = camMmol - 0.025 * (alb - 40);
  const cacMgl = cacMmol * 40;

  let status = 'status-normal';
  let badge = 'Normocalcémie (2,20–2,60 mmol/L)';
  let interp = `Calcémie corrigée dans les valeurs usuelles (2,20 à 2,60 mmol/L soit 88 à 104 mg/L).`;

  if (cacMmol < 1.90) {
    status = 'status-danger';
    badge = 'Hypocalcémie sévère (< 1,90 mmol/L)';
    interp = `Risque neuromusculaire (tétanie, laryngospasme, convulsions) et cardiaque (allongement du QTc). Vérifier magnésémie, PTH et vitamine D.`;
  } else if (cacMmol < 2.20) {
    status = 'status-warn';
    badge = 'Hypocalcémie (1,90–2,19 mmol/L)';
    interp = `Hypocalcémie confirmée après correction par l'albumine. Rechercher hypoparathyroïdie, carence en vitamine D, insuffisance rénale chronique ou hypomagnésémie.`;
  } else if (cacMmol > 3.50) {
    status = 'status-danger';
    badge = 'Hypercalcémie maligne / sévère (≥ 3,50 mmol/L)';
    interp = `Urgence vitale (risque de coma, raccourcissement du QT, troubles du rythme, IRA). Réhydratation abondante par NaCl 0,9%, biphosphonates IV ± calcitonine et ECG immédiat.`;
  } else if (cacMmol > 3.00) {
    status = 'status-danger';
    badge = 'Hypercalcémie modérée à sévère (3,01–3,49 mmol/L)';
    interp = `Hypercalcémie symptomatique fréquente. Réhydratation IV et bilan étiologique (PTH, PTHrp, 1,25-(OH)₂D, EPS/immunofixation).`;
  } else if (cacMmol > 2.60) {
    status = 'status-warn';
    badge = 'Hypercalcémie légère (2,61–3,00 mmol/L)';
    interp = `Hypercalcémie modérée : rechercher en 1re intention une hyperparathyroïdie primaire (PTH normale ou élevée inappropriée) ou une cause néoplasique (PTH basse).`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Ca corrigée = ${cacMmol.toFixed(2)} mmol/L</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">En mg/L : ${cacMgl.toFixed(1)} mg/L</span>
      <span class="subvalue-chip">Ca mesurée : ${camMmol.toFixed(2)} mmol/L (${(camMmol * 40).toFixed(1)} mg/L)</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Calcémie corrigée', '${cacMmol.toFixed(2)} mmol/L (${cacMgl.toFixed(1)} mg/L)', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 4B. Trou Anionique Plasmatique & Corrigé (Figge)
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
  // Figge correction for hypoalbuminemia: TA_corr = TA + 0.25 * (40 - Alb_g/L)
  const taCorr = !isNaN(alb) && alb > 0 ? taSimple + 0.25 * (40 - alb) : taSimple;

  let status = 'status-normal';
  let badge = 'Trou anionique normal (8–16 mmol/L)';
  let interp = `Si acidose métabolique présente : acidose hyperchlorémique à trou anionique normal (pertes digestives de bicarbonates / diarrhées, acidose tubulaire rénale, remplissage par NaCl 0,9%).`;

  if (taCorr > 16) {
    status = 'status-danger';
    badge = 'Trou anionique élevé (> 16 mmol/L)';
    interp = `Acidose par gain d'acide (anions indosés) : Acidocétose (diabétique, alcoolique, jeûne), Acidose lactique (choc, hypoxie, metformine), Insuffisance rénale sévère, ou Intoxication (salicylés, méthanol, éthylène glycol).`;
  } else if (taCorr < 8) {
    status = 'status-info';
    badge = 'Trou anionique bas (< 8 mmol/L)';
    interp = `Rechercher une hypoalbuminémie non corrigée, une gammapathie monoclonale à IgG (cationique) ou une hypercalcémie/hypermagnésémie sévère.`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">TA = ${taSimple.toFixed(1)} mmol/L ${!isNaN(alb) && alb > 0 ? `<span style="font-size:0.95rem;font-weight:600">(Corrigé Alb : ${taCorr.toFixed(1)})</span>` : ''}</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      ${taAvecK !== null ? `<span class="subvalue-chip">TA (avec K⁺) : ${taAvecK.toFixed(1)} mmol/L (N : 12–20)</span>` : ''}
      <span class="subvalue-chip">HCO₃⁻ : ${hco3} mmol/L</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Trou Anionique', '${taSimple.toFixed(1)} mmol/L (Corrigé: ${taCorr.toFixed(1)})', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 4C. Natrémie Corrigée (Katz) & Osmolarité Plasmatique
function calcNatremieOsm() {
  const na = parseFloat(document.getElementById('osm_na')?.value);
  const glyRaw = parseFloat(document.getElementById('osm_gly')?.value);
  const glyUnit = document.getElementById('osm_gly_unit')?.value || 'mmol';
  const uree = parseFloat(document.getElementById('osm_uree')?.value) || 0;

  const panel = document.getElementById('res_osm');
  if (!panel) return;

  if (!na || !glyRaw) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la natrémie (mmol/L) et la glycémie.</div>`;
    return;
  }

  const glyMmol = glyUnit === 'gl' ? (glyRaw * 5.55) : glyRaw;
  // Katz formula: Na_corr = Na + 0.3 * (Gly_mmol - 5.5) (or + 1.6 per g/L above 1 g/L)
  const naCorr = glyMmol > 5.5 ? na + 0.3 * (glyMmol - 5.5) : na;
  const tonicite = 2 * na + glyMmol;
  const osmTotale = 2 * na + glyMmol + uree;

  let status = 'status-normal';
  let badge = 'Normonatrémie corrigée (135–145 mmol/L)';
  if (naCorr < 135) {
    status = naCorr < 125 ? 'status-danger' : 'status-warn';
    badge = `Hyponatrémie vraie (${naCorr.toFixed(1)} mmol/L)`;
  } else if (naCorr > 145) {
    status = naCorr > 155 ? 'status-danger' : 'status-warn';
    badge = `Hypernatrémie / Déshydratation intracellulaire (${naCorr.toFixed(1)} mmol/L)`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Na⁺ corrigée = ${naCorr.toFixed(1)} mmol/L</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Osmolarité efficace (tonicité) : ${tonicite.toFixed(1)} mOsm/L (N : 275–290)</span>
      <span class="subvalue-chip">Osmolarité totale : ${osmTotale.toFixed(1)} mOsm/L</span>
    </div>
    <div class="result-interpretation">
      Formule de Katz : corrige la fausse hyponatrémie de transfert induite par l'hyperglycémie (+1,6 mmol/L de Na⁺ par g/L de glycémie au-dessus de 1 g/L).
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Natrémie corrigée & Osmolarité', 'Na corr ${naCorr.toFixed(1)} mmol/L | Tonicité ${tonicite.toFixed(1)} mOsm/L', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 4D. Score de Child-Pugh (Classification de la Cirrhose)
function calcChildPugh() {
  const bili = parseInt(document.getElementById('cp_bili')?.value || '1', 10);
  const alb = parseInt(document.getElementById('cp_alb')?.value || '1', 10);
  const inr = parseInt(document.getElementById('cp_inr')?.value || '1', 10);
  const ascite = parseInt(document.getElementById('cp_ascite')?.value || '1', 10);
  const enceph = parseInt(document.getElementById('cp_enceph')?.value || '1', 10);

  const score = bili + alb + inr + ascite + enceph;
  let classe = 'Classe A (5–6 points)';
  let status = 'status-normal';
  let pronostic = 'Cirrhose compensée. Survie à 1 an : ~100 % | Survie à 2 ans : ~85 %.';

  if (score >= 10) {
    classe = 'Classe C (10–15 points)';
    status = 'status-danger';
    pronostic = 'Cirrhose sévèrement décompensée. Survie à 1 an : ~45 % | Survie à 2 ans : ~35 %. Évaluation pour transplantation hépatique.';
  } else if (score >= 7) {
    classe = 'Classe B (7–9 points)';
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
      <button class="btn-copy-result" onclick="copySingleResult('Score de Child-Pugh', '${score}/15', '${classe}')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// 5. PEDIATRIE CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 5A. Formule de Schwartz 2009 & Normes par âge (Original MedicPED.js)
function calcSchwartz() {
  const taille = parseFloat(document.getElementById('schwartz_taille')?.value);
  const crea = parseFloat(document.getElementById('schwartz_creat')?.value);
  const ageGroup = document.getElementById('schwartz_age_group')?.value || '2_12y';

  const panel = document.getElementById('res_schwartz');
  if (!panel) return;

  if (!taille || taille <= 0 || !crea || crea <= 0) {
    panel.className = 'result-panel';
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la taille de l'enfant (cm) et la créatininémie (µmol/L).</div>`;
    return;
  }

  // Original formula from MedicPED.js:
  // result = (36.5 * tail) / crea
  const dfg = (36.5 * taille) / crea;

  // Reference norms from original MedicPED.html
  const norms = {
    'prema_1w': { label: 'Prématuré (1re semaine)', dfgNorm: '15 ± 6 mL/min/1,73m²', min: 9, max: 21 },
    'prema_2_8w': { label: 'Prématuré (2–8 semaines)', dfgNorm: '29 ± 14 mL/min/1,73m²', min: 15, max: 43 },
    'prema_2m_2y': { label: 'Prématuré (2 mois–2 ans)', dfgNorm: '51 ± 20 mL/min/1,73m²', min: 31, max: 71 },
    'term_1w': { label: 'Nouveau-né à terme (1re semaine)', dfgNorm: '41 ± 15 mL/min/1,73m²', min: 26, max: 56 },
    'term_2_8w': { label: 'Nouveau-né à terme (2–8 semaines)', dfgNorm: '66 ± 25 mL/min/1,73m²', min: 41, max: 91 },
    'term_2m_2y': { label: 'Nourrisson (2 mois–2 ans)', dfgNorm: '96 ± 22 mL/min/1,73m²', min: 74, max: 118 },
    '2_12y': { label: 'Enfant (2–12 ans)', dfgNorm: '133 ± 27 mL/min/1,73m²', min: 90, max: 160 },
    '13_21_m': { label: 'Adolescent garçon (13–21 ans)', dfgNorm: '140 ± 30 mL/min/1,73m²', min: 90, max: 170 },
    '13_21_f': { label: 'Adolescente fille (13–21 ans)', dfgNorm: '126 ± 22 mL/min/1,73m²', min: 90, max: 150 }
  };

  const norm = norms[ageGroup];
  let status = 'status-normal';
  let badge = 'DFG normal pour l’âge';

  if (dfg < norm.min) {
    status = dfg < 30 ? 'status-danger' : 'status-warn';
    badge = `DFG abaissé pour la tranche d'âge (< ${norm.min})`;
  }

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">DFG (Schwartz) = ${dfg.toFixed(1)} <span style="font-size:0.9rem;font-weight:600">mL/min/1,73m²</span></div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">${norm.label} : attendu ${norm.dfgNorm}</span>
    </div>
    <div class="result-interpretation">
      Formule de Schwartz révisée (2009) : <code>DFG = 36,5 × Taille (cm) / Créatininémie (µmol/L)</code>.
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('DFG Pédiatrique (Schwartz)', '${dfg.toFixed(1)} mL/min/1.73m²', '${norm.label} (${badge})')">📋 Copier le résultat</button>
    </div>
  `;
}

// 5B. Besoins Hydriques Pédiatriques (Holliday-Segar 4-2-1)
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
      <div class="result-main-value">${Math.round(mlJour)} mL / 24h <span style="font-size:1rem;font-weight:600">(${mlHeure.toFixed(1)} mL/h)</span></div>
      <span class="result-Classification-badge">Maintenance (4-2-1)</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">Remplissage vasculaire 20 mL/kg : ${bolus20} mL</span>
      <span class="subvalue-chip">Bolus 10 mL/kg : ${bolus10} mL</span>
    </div>
    <div class="result-interpretation">
      Règle de Holliday-Segar : 100 mL/kg/j pour les 10 premiers kg, +50 mL/kg/j de 10 à 20 kg, +20 mL/kg/j au-delà de 20 kg (soluté isotonique type NaCl 0,9% + G5%).
    </div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Besoins Hydriques (Holliday-Segar)', '${Math.round(mlJour)} mL/24h (${mlHeure.toFixed(1)} mL/h)', 'Poids ${poids} kg')">📋 Copier le résultat</button>
    </div>
  `;
}

// 5C. Score d'Apgar
function calcApgar() {
  const fc = parseInt(document.getElementById('apgar_fc')?.value || '2', 10);
  const resp = parseInt(document.getElementById('apgar_resp')?.value || '2', 10);
  const tonus = parseInt(document.getElementById('apgar_tonus')?.value || '2', 10);
  const react = parseInt(document.getElementById('apgar_react')?.value || '2', 10);
  const color = parseInt(document.getElementById('apgar_color')?.value || '2', 10);

  const score = fc + resp + tonus + react + color;
  let status = 'status-normal';
  let badge = 'Adaptation néonatale normale (7–10)';
  let interp = `Bonne adaptation à la vie extra-utérine. Soins de routine en salle de naissance (séchage, peau à peau, maintien thermique).`;

  if (score <= 3) {
    status = 'status-danger';
    badge = 'État de mort apparente / Détresse sévère (0–3)';
    interp = `Urgence néonatale absolue : désobstruction, ventilation au masque en pression positive puis intubation / massage cardiaque externe selon l'algorithme ILCOR.`;
  } else if (score <= 6) {
    status = 'status-warn';
    badge = 'Détresse néonatale modérée (4–6)';
    interp = `Adaptation imparfaite : stimulation tactile, réchauffement, libération des voies aériennes supérieures et ventilation en pression positive (VPP) si FC < 100/min ou apnée.`;
  }

  const panel = document.getElementById('res_apgar');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Score d’Apgar = ${score} / 10</div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score d’Apgar', '${score}/10', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// 6. REANIMATION & URGENCES CALCULATORS & CLASSIFICATIONS
// ============================================================================

// 6A. Rapport PaO2 / FiO2 (Horowitz) & Classification de Berlin du SDRA (Original MedicRA.js)
function syncFio2FromO2Flow() {
  const flow = parseFloat(document.getElementById('pf_o2flow')?.value);
  const fio2El = document.getElementById('pf_fio2');
  if (!isNaN(flow) && flow >= 0 && fio2El) {
    const estFio2 = Math.min(100, Math.round(21 + 4 * flow));
    fio2El.value = estFio2;
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
    panel.innerHTML = `<div class="result-interpretation" style="color:var(--text-muted)">Entrez la PaO₂ (en mmHg) et la FiO₂ (entre 21 % et 100 %).</div>`;
    return;
  }

  // Original formula from MedicRA.js:
  // result = (PA / FI) * 100
  const pf = Math.round((pao2 / fio2) * 100);

  let status = 'status-normal';
  let berlin = 'Oxygénation normale (> 400 mmHg)';
  let details = `Rapport PaO₂/FiO₂ normal (> 400 mmHg). Pas d'effet shunt significatif.`;

  if (pf <= 100) {
    status = 'status-danger';
    berlin = 'SDRA Sévère (≤ 100 mmHg)';
    details = `Classification de Berlin (si PEP ≥ 5 cmH₂O, infiltrats bilatéraux aigus non cardiogéniques) : SDRA sévère (mortalité ~45%). Ventilation protectrice (Vt 6 mL/kg PBW, Pplat ≤ 30 cmH₂O), séances de Décubitus Ventral ≥ 16h/j, discuter curarisation initiale et VV-ECMO si réfractaire.`;
  } else if (pf <= 200) {
    status = 'status-danger';
    berlin = 'SDRA Modéré (101–200 mmHg)';
    details = `Classification de Berlin : SDRA modéré (mortalité ~32%). Ventilation protectrice ; si PaO₂/FiO₂ < 150 mmHg avec PEP ≥ 5, indication au Décubitus Ventral (étude PROSEVA).`;
  } else if (pf <= 300) {
    status = 'status-warn';
    berlin = 'SDRA Léger (201–300 mmHg)';
    details = `Classification de Berlin : SDRA léger (mortalité ~27%). Ventilation protectrice ou oxygénothérapie à haut débit (Optiflow) selon la mécanique ventilatoire.`;
  } else if (pf <= 400) {
    status = 'status-info';
    berlin = 'Hypoxémie modérée (301–400 mmHg)';
    details = `Altération modérée des échanges gazeux sans critères gazométriques de SDRA (> 300 mmHg).`;
  }

  // Highlight Berlin table row
  document.querySelectorAll('#berlinTable tr[data-pf]').forEach(row => {
    const [min, max] = row.dataset.pf.split('-').map(Number);
    row.classList.toggle('active-row', pf >= min && pf <= max);
  });

  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">PaO₂ / FiO₂ = ${pf} mmHg</div>
      <span class="result-Classification-badge">${berlin}</span>
    </div>
    <div class="result-subvalues">
      <span class="subvalue-chip">PaO₂ : ${pao2} mmHg</span>
      <span class="subvalue-chip">FiO₂ : ${fio2} % (${(fio2 / 100).toFixed(2)})</span>
    </div>
    <div class="result-interpretation">${details}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Rapport PaO₂/FiO₂', '${pf} mmHg (PaO₂ ${pao2} / FiO₂ ${fio2}%)', '${berlin}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 6B. Score de Glasgow (GCS)
function calcGlasgow() {
  const e = parseInt(document.getElementById('gcs_e')?.value || '4', 10);
  const v = parseInt(document.getElementById('gcs_v')?.value || '5', 10);
  const m = parseInt(document.getElementById('gcs_m')?.value || '6', 10);

  const gcs = e + v + m;
  let status = 'status-normal';
  let badge = 'Conscience normale ou TC léger (13–15)';
  let interp = `Vigilance conservée ou traumatisme crânien léger (GCS 13–15).`;

  if (gcs <= 8) {
    status = 'status-danger';
    badge = 'Coma / TC Grave (GCS ≤ 8)';
    interp = `Altération profonde de la conscience (GCS ≤ 8) : abolition des réflexes de protection des voies aériennes supérieures. Indication d'intubation orotrachéale (IOT en séquence rapide) et d'imagerie cérébrale urgente.`;
  } else if (gcs <= 12) {
    status = 'status-warn';
    badge = 'Altération modérée / TC Modéré (9–12)';
    interp = `Obnubilation / confusion marquée (GCS 9–12). Surveillance neurologique armée rapprochée et scanner cérébral.`;
  }

  const panel = document.getElementById('res_glasgow');
  if (!panel) return;
  panel.className = `result-panel ${status}`;
  panel.innerHTML = `
    <div class="result-top">
      <div class="result-main-value">Glasgow = ${gcs} / 15 <span style="font-size:0.95rem;font-weight:600">(E${e} V${v} M${m})</span></div>
      <span class="result-Classification-badge">${badge}</span>
    </div>
    <div class="result-interpretation">${interp}</div>
    <div class="result-actions">
      <button class="btn-copy-result" onclick="copySingleResult('Score de Glasgow', '${gcs}/15 (E${e}V${v}M${m})', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// 6C. Score qSOFA & Score CURB-65
function calcQsofa() {
  let score = 0;
  document.querySelectorAll('#card-rea-qsofa input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('.criteria-item');
    if (label) label.classList.toggle('checked', cb.checked);
    if (cb.checked) score += 1;
  });

  const status = score >= 2 ? 'status-danger' : (score === 1 ? 'status-warn' : 'status-normal');
  const badge = score >= 2 ? 'qSOFA positif (≥ 2) — Haut risque de Sepsis' : 'qSOFA < 2 — Risque faible';
  const interp = score >= 2
    ? `Score qSOFA ≥ 2 : risque élevé de séjour prolongé en réanimation ou de décès. Prélever immédiatement lactates artériels, hémocultures, bilan biologique complet (calculer le score SOFA complet), débuter l'antibiothérapie probabiliste dans l'heure et le remplissage par cristalloïdes si hypotension/hyperlactatémie.`
    : `Score qSOFA < 2 : ne permet pas d'exclure un sepsis à lui seul ; poursuivre la surveillance clinique et biologique selon le point d'appel infectieux.`;

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
      <button class="btn-copy-result" onclick="copySingleResult('Score qSOFA', '${score}/3', '${badge}')">📋 Copier le résultat</button>
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
  let badge = 'Risque faible (0–1) — Traitement ambulatoire';
  let interp = `Mortalité à 30 jours faible (< 2%). Traitement antibiotique ambulatoire possible en l'absence d'hypoxémie, d'épanchement pleural ou d'isolement social.`;

  if (score === 2) {
    status = 'status-warn';
    badge = 'Risque modéré (2) — Hospitalisation recommandée';
    interp = `Mortalité à 30 jours ~9%. Hospitalisation conventionnelle (ou ambulatoire très encadré avec réévaluation à 48h).`;
  } else if (score >= 3) {
    status = 'status-danger';
    badge = `Pneumopathie sévère (${score}/5) — Hospitalisation urgente / USI`;
    interp = `Mortalité élevée (15 à 40%). Hospitalisation urgente ; discuter l'admission en soins intensifs / réanimation surtout si score ≥ 4.`;
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
      <button class="btn-copy-result" onclick="copySingleResult('Score CURB-65', '${score}/5', '${badge}')">📋 Copier le résultat</button>
    </div>
  `;
}

// ============================================================================
// NAVIGATION, SEARCH, FILTERING & INITIALIZATION
// ============================================================================

function selectSpecialty(specId) {
  state.activeSpecialty = specId;
  document.querySelectorAll('.specialty-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.specialty === specId);
  });
  updateBanner();
  applyFilters();
}

function selectType(typeId) {
  state.activeType = typeId;
  document.querySelectorAll('.type-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === typeId);
  });
  applyFilters();
}

function updateBanner() {
  const spec = SPECIALTIES[state.activeSpecialty] || SPECIALTIES.all;
  const banner = document.getElementById('specialtyBanner');
  const titleEl = document.getElementById('bannerTitle');
  const descEl = document.getElementById('bannerDesc');
  const quickGrid = document.getElementById('specialtyQuickGrid');

  if (banner) {
    banner.style.setProperty('--banner-accent', spec.color);
  }
  if (titleEl) {
    titleEl.innerHTML = `<span>${spec.icon}</span> <span>${spec.name}</span>`;
  }
  if (descEl) {
    descEl.textContent = spec.description;
  }
  if (quickGrid) {
    quickGrid.style.display = (state.activeSpecialty === 'all' && !state.searchQuery && state.activeType === 'all') ? 'grid' : 'none';
  }
}

function applyFilters() {
  const q = state.searchQuery.trim().toLowerCase();
  const cards = document.querySelectorAll('.calc-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardSpec = card.dataset.specialty;
    const cardType = card.dataset.type; // 'calc' | 'score' | 'classification'
    const cardId = card.id.replace('card-', '');
    const searchText = (card.dataset.keywords + ' ' + card.textContent).toLowerCase();

    const matchesSpec = state.activeSpecialty === 'all' || cardSpec === state.activeSpecialty;
    const matchesType = state.activeType === 'all'
      || (state.activeType === 'fav' && state.favorites.includes(cardId))
      || cardType.includes(state.activeType);
    const matchesSearch = !q || searchText.includes(q);

    const isVisible = matchesSpec && matchesType && matchesSearch;
    card.style.display = isVisible ? 'flex' : 'none';
    if (isVisible) visibleCount++;
  });

  const emptyState = document.getElementById('emptySearchState');
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  const visibleCounter = document.getElementById('visibleToolsCount');
  if (visibleCounter) {
    visibleCounter.textContent = visibleCount;
  }

  const quickGrid = document.getElementById('specialtyQuickGrid');
  if (quickGrid) {
    quickGrid.style.display = (state.activeSpecialty === 'all' && !q && state.activeType === 'all') ? 'grid' : 'none';
  }
}

function updateCounts() {
  const counts = { all: 0, cardio: 0, nephro: 0, nutrition: 0, medint: 0, pediatrie: 0, reanima: 0 };
  document.querySelectorAll('.calc-card').forEach(card => {
    const s = card.dataset.specialty;
    counts.all++;
    if (counts[s] !== undefined) counts[s]++;
  });

  Object.keys(counts).forEach(k => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = counts[k];
  });

  const favCountEl = document.getElementById('count-fav');
  if (favCountEl) favCountEl.textContent = state.favorites.length;
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('tomatocalc_theme', next);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.innerHTML = next === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre';
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
  // Restore theme
  const savedTheme = localStorage.getItem('tomatocalc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('btnThemeToggle');
  if (themeBtn) {
    themeBtn.innerHTML = savedTheme === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre';
  }

  // Search input listener + Cmd+K shortcut
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Update favorites UI & counts
  updateFavoriteButtons();
  updateCounts();
  renderClipboard();
  updateBanner();
  runAllCalculations();
});
