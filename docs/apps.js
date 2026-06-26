// frontend/app.js
// منطق اصلی برنامهٔ اسب سیاه

// ==================== CONFIG ====================
const API_BASE = 'https://dark-horse-career.onrender.com';
const DATA_BASE = 'https://raw.githubusercontent.com/arad2000/dark-horse-career/main/data/';

// ==================== GLOBAL STATE ====================
const state = {
  stage: 'splash',
  selectedRealms: [],
  selectedSubRealms: [],
  selectedNarrowPaths: [],
  microMotives: [],
  likedCodes: [],
  strategyAnswers: [],
  valueAnswers: [],
  currentQuestion: 0,
  swipeCards: [],
  swipeIndex: 0
};

const app = document.getElementById('app');

// ==================== RENDER ====================
function render() {
  switch (state.stage) {
    case 'splash': renderSplash(); break;
    case 'realm': renderRealm(); break;
    case 'subRealm': renderSubRealm(); break;
    case 'narrowPath': renderNarrowPath(); break;
    case 'swipe': renderSwipe(); break;
    case 'strategies': renderStrategy(); break;
    case 'values': renderValue(); break;
    case 'results': renderResults(); break;
  }
}

// ==================== SPLASH ====================
function renderSplash() {
  app.innerHTML = `
    <h1>🐴 اسب سیاه</h1>
    <div class="card">
      <p class="quote">«شهر رؤیاها، جایی که هر کودکی قبل از خواب به آن سفر می‌کرد...»</p>
      <p>در چند دقیقهٔ آینده، <strong>فردیت درونی</strong> خود را کشف کن و رشته‌هایی را ببین که <strong>واقعاً</strong> با تو هم‌راستا هستند.</p>
      <button class="btn btn-primary" onclick="startJourney()">شروع سفر اکتشافی</button>
    </div>
  `;
}

function startJourney() {
  state.stage = 'realm';
  state.selectedRealms = [];
  render();
}

// ==================== REALM SELECTION ====================
function renderRealm() {
  let html = `<h2>🌃 شهر رؤیاها</h2>
    <p>کدام محله‌ها بی‌اختیار تو را به سمت خود می‌کشانند؟<br><small>(۱ تا ۳ محله انتخاب کن)</small></p>
    <div class="grid" id="realmGrid">`;
  REALMS.forEach(r => {
    html += `<div class="option" data-id="${r.id}" onclick="toggleRealm('${r.id}')">
      <span class="option-icon">${r.icon}</span>
      <strong>${r.name}</strong><br>
      <small>«${r.motto}»</small>
    </div>`;
  });
  html += `</div>
    <button class="btn btn-primary" id="btnNextRealm" disabled onclick="goToSubRealm()">ادامه</button>`;
  app.innerHTML = html;
}

function toggleRealm(id) {
  const idx = state.selectedRealms.indexOf(id);
  if (idx > -1) state.selectedRealms.splice(idx, 1);
  else if (state.selectedRealms.length < 3) state.selectedRealms.push(id);
  
  document.querySelectorAll('#realmGrid .option').forEach(el => {
    el.classList.toggle('selected', state.selectedRealms.includes(el.dataset.id));
  });
  document.getElementById('btnNextRealm').disabled = state.selectedRealms.length < 1;
}

function goToSubRealm() {
  state.stage = 'subRealm';
  state.selectedSubRealms = [];
  render();
}

// ==================== SUB-REALM SELECTION ====================
function renderSubRealm() {
  const subs = [];
  state.selectedRealms.forEach(realmId => {
    if (SUB_REALMS[realmId]) subs.push(...SUB_REALMS[realmId]);
  });
  
  let html = `<h2>راهروهای محله</h2>
    <p>از میان این گذرها، کدام یک تو را به عمق می‌کشاند؟<br><small>(۱ تا ۳ گذر انتخاب کن)</small></p>
    <div class="grid" id="subGrid">`;
  subs.forEach(s => {
    html += `<div class="option" data-id="${s.id}" onclick="toggleSub('${s.id}')">
      <span class="option-icon">${s.icon}</span>
      <strong>${s.name}</strong><br>
      <small>«${s.motto}»</small>
    </div>`;
  });
  html += `</div>
    <button class="btn btn-primary" id="btnNextSub" disabled onclick="goToNarrowPath()">ادامه</button>`;
  app.innerHTML = html;
}

function toggleSub(id) {
  const idx = state.selectedSubRealms.indexOf(id);
  if (idx > -1) state.selectedSubRealms.splice(idx, 1);
  else if (state.selectedSubRealms.length < 3) state.selectedSubRealms.push(id);
  
  document.querySelectorAll('#subGrid .option').forEach(el => {
    el.classList.toggle('selected', state.selectedSubRealms.includes(el.dataset.id));
  });
  document.getElementById('btnNextSub').disabled = state.selectedSubRealms.length < 1;
}

function goToNarrowPath() {
  state.stage = 'narrowPath';
  state.selectedNarrowPaths = [];
  render();
}

// ==================== NARROW PATH SELECTION ====================
function renderNarrowPath() {
  const paths = [];
  state.selectedSubRealms.forEach(subId => {
    if (NARROW_PATHS[subId]) paths.push(...NARROW_PATHS[subId]);
  });
  
  let html = `<h2>مسیرهای باریک</h2>
    <p>کدام مسیر تو را صدا می‌زند؟<br><small>(می‌توانی چند گزینه انتخاب کنی)</small></p>
    <div class="grid" id="pathGrid">`;
  paths.forEach(p => {
    html += `<div class="option" data-id="${p.id}" onclick="togglePath('${p.id}')">
      <span class="option-icon">${p.icon}</span>
      <strong>${p.name}</strong><br>
      <small>${p.description.substring(0, 80)}...</small>
    </div>`;
  });
  html += `</div>
    <button class="btn btn-primary" id="btnNextPath" disabled onclick="loadSwipeCards()">مشاهدهٔ جرقه‌های انرژی</button>`;
  app.innerHTML = html;
}

function togglePath(id) {
  const idx = state.selectedNarrowPaths.indexOf(id);
  if (idx > -1) state.selectedNarrowPaths.splice(idx, 1);
  else state.selectedNarrowPaths.push(id);
  
  document.querySelectorAll('#pathGrid .option').forEach(el => {
    el.classList.toggle('selected', state.selectedNarrowPaths.includes(el.dataset.id));
  });
  document.getElementById('btnNextPath').disabled = state.selectedNarrowPaths.length < 1;
}

// ==================== SWIPE CARDS ====================
async function loadSwipeCards() {
  // ۱. جمع‌آوری کدهای رشته‌های مرتبط
  const majorCodes = [];
  state.selectedNarrowPaths.forEach(pathId => {
    const path = findNarrowPath(pathId);
    if (path && path.majorCodes) majorCodes.push(...path.majorCodes);
  });
  
  // ۲. بارگذاری میکروموتیوها از گیت‌هاب
  const url = DATA_BASE + 'micro_motives.json';
  const response = await fetch(url);
  const allMotives = await response.json();
  
  // ۳. فیلتر کردن میکروموتیوهای مرتبط
  state.swipeCards = allMotives.filter(m => 
    majorCodes.some(prefix => m.code.startsWith(prefix))
  );
  
  state.swipeIndex = 0;
  state.likedCodes = [];
  state.stage = 'swipe';
  render();
}

function findNarrowPath(id) {
  for (const subId in NARROW_PATHS) {
    const found = NARROW_PATHS[subId].find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

function renderSwipe() {
  if (state.swipeIndex >= state.swipeCards.length || state.likedCodes.length >= 80) {
    state.stage = 'strategies';
    state.currentQuestion = 0;
    state.strategyAnswers = [];
    render();
    return;
  }
  
  const card = state.swipeCards[state.swipeIndex];
  const progress = ((state.swipeIndex + 1) / state.swipeCards.length) * 100;
  
  app.innerHTML = `
    <h2>🔥 جرقهٔ انرژی</h2>
    <div class="counter">💛 <strong>${state.likedCodes.length}</strong> جرقه</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="swipe-card">
      <p style="font-size:1.2rem;line-height:2.2;">${card.description_fa}</p>
      <div style="display:flex;gap:15px;justify-content:center;margin-top:20px;">
        <button class="btn btn-heart" onclick="likeCard(true)">❤️ جرقه زد</button>
        <button class="btn btn-skip" onclick="likeCard(false)">❌ ادامه</button>
      </div>
      ${state.likedCodes.length >= 20 ? `<button class="btn btn-primary" style="margin-top:15px;" onclick="finishSwipe()">کافیه، برو به مرحلهٔ بعد</button>` : ''}
    </div>
  `;
}

function likeCard(liked) {
  if (liked) state.likedCodes.push(state.swipeCards[state.swipeIndex].code);
  state.swipeIndex++;
  render();
}

function finishSwipe() {
  if (state.likedCodes.length < 20) {
    alert('حداقل ۲۰ جرقه برای ادامه لازمه!');
    return;
  }
  state.stage = 'strategies';
  state.currentQuestion = 0;
  state.strategyAnswers = [];
  render();
}

// ==================== STRATEGY QUESTIONS ====================
function renderStrategy() {
  if (state.currentQuestion >= STRATEGY_QUESTIONS.length) {
    state.stage = 'values';
    state.currentQuestion = 0;
    state.valueAnswers = [];
    render();
    return;
  }
  
  const q = STRATEGY_QUESTIONS[state.currentQuestion];
  const opts = STRATEGY_OPTIONS[state.currentQuestion];
  
  let html = `<h2>🧭 راهبرد ${state.currentQuestion + 1} از ${STRATEGY_QUESTIONS.length}</h2>
    <div class="card">
      <p style="margin-bottom:20px;">${q}</p>`;
  opts.forEach((opt, i) => {
    html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;" onclick="answerStrategy(${i})">${opt}</button>`;
  });
  html += `</div>`;
  app.innerHTML = html;
}

function answerStrategy(idx) {
  state.strategyAnswers.push(idx);
  state.currentQuestion++;
  render();
}

// ==================== VALUE DILEMMAS ====================
function renderValue() {
  if (state.currentQuestion >= VALUE_QUESTIONS.length) {
    submitResults();
    return;
  }
  
  const q = VALUE_QUESTIONS[state.currentQuestion];
  const opts = VALUE_OPTIONS[state.currentQuestion];
  
  app.innerHTML = `
    <h2>⚖️ ارزش ${state.currentQuestion + 1} از ${VALUE_QUESTIONS.length}</h2>
    <div class="card">
      <p style="margin-bottom:20px;">${q}</p>
      <button class="btn btn-primary" style="display:block;width:100%;margin-bottom:10px;" onclick="answerValue('A')">${opts[0]}</button>
      <button class="btn" style="display:block;width:100%;" onclick="answerValue('B')">${opts[1]}</button>
    </div>
  `;
}

function answerValue(choice) {
  const qNum = state.currentQuestion + 1;
  state.valueAnswers.push(`Q${qNum}${choice}`);
  state.currentQuestion++;
  render();
}

// ==================== SUBMIT TO API ====================
async function submitResults() {
  state.stage = 'results';
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;
  
  const payload = {
    micro_motives: state.likedCodes,
    sjt_answers: {},
    conjoint_choices: {},
    strategies: state.strategyAnswers,
    values: state.valueAnswers
  };
  
  try {
    const response = await fetch(API_BASE + '/api/darkhorse/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    displayResults(data);
  } catch (e) {
    app.innerHTML = `<h2>❌ خطا</h2><p>اتصال به سرور برقرار نشد. دوباره تلاش کن.</p>`;
  }
}

function displayResults(data) {
  const recs = data.discovery_result?.recommendations || [];
  let html = `<h2>📊 نتایج</h2>
    <p>بر اساس <strong>${state.likedCodes.length}</strong> جرقهٔ انرژی، این‌ها رشته‌های هم‌راستا با تو هستند:</p>`;
  
  recs.slice(0, 10).forEach(r => {
    html += `
      <div class="card" style="text-align:right;">
        <h3 style="color:#f0c040;">${r.major_name_fa || 'رشتهٔ پیشنهادی'}</h3>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
        <p style="margin-top:8px;">🔹 <strong>${r.fit_score}%</strong> تطابق</p>
        ${r.evidence?.length ? `<p style="color:#b0a080;font-size:0.85rem;">💡 ${r.evidence.slice(0,2).join('؛ ')}</p>` : ''}
      </div>
    `;
  });
  
  html += `<button class="btn btn-primary" onclick="resetJourney()">شروع دوباره</button>`;
  app.innerHTML = html;
}

function resetJourney() {
  state.stage = 'splash';
  state.selectedRealms = [];
  state.selectedSubRealms = [];
  state.selectedNarrowPaths = [];
  state.likedCodes = [];
  state.swipeCards = [];
  state.strategyAnswers = [];
  state.valueAnswers = [];
  render();
}

// ==================== INIT ====================
render();
