// frontend/app.js — نسخهٔ نهایی رفع اشکال (V2.0)
// رفع مشکل نمایش توضیحات کامل، دکمه بازگشت، محدودیت ۲۰-۸۰ و ارسال به API

// ==================== CONFIG ====================
const API_BASE = 'https://dark-horse-career.onrender.com';
const DATA_BASE = 'https://raw.githubusercontent.com/arad2000/dark-horse-career/main/data/';

// ==================== GLOBAL STATE ====================
const state = {
  stage: 'splash',
  history: [],
  selectedRealms: [],
  selectedSubRealms: [],
  selectedNarrowPaths: [],
  likedCodes: [],
  strategyAnswers: [],
  valueAnswers: [],
  currentQuestion: 0,
  swipeCards: [],
  swipeIndex: 0,
  totalSwipes: 0
};

const app = document.getElementById('app');

// ==================== NAVIGATION ====================
function goTo(stage) {
  state.history.push(state.stage);
  state.stage = stage;
  render();
}

function goBack() {
  if (state.history.length > 0) {
    // ریست کردن داده‌های مراحل جلوتر از مقصد
    const targetStage = state.history[state.history.length - 1];
    if (targetStage === 'realm') {
      state.selectedSubRealms = [];
      state.selectedNarrowPaths = [];
      state.swipeCards = [];
      state.likedCodes = [];
    } else if (targetStage === 'subRealm') {
      state.selectedNarrowPaths = [];
      state.swipeCards = [];
      state.likedCodes = [];
    } else if (targetStage === 'narrowPath') {
      state.swipeCards = [];
      state.likedCodes = [];
    }
    state.stage = state.history.pop();
    render();
  }
}

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
      <button class="btn btn-primary" onclick="goTo('realm')">شروع سفر اکتشافی</button>
    </div>
  `;
}

// ==================== REALM SELECTION ====================
function renderRealm() {
  const maxSelect = Math.min(3, REALMS.length);
  let html = `<h2>🌃 شهر رؤیاها</h2>
    <p style="color:#b0a080;">کدام محله‌ها تو را صدا می‌زنند؟</p>
    <p style="font-size:0.85rem;color:#888;">(۱ تا ${maxSelect} محله انتخاب کن)</p>
    <div class="grid" id="realmGrid">`;

  REALMS.forEach(r => {
    html += `<div class="option ${state.selectedRealms.includes(r.id) ? 'selected' : ''}" onclick="toggleRealm('${r.id}')">
      <span class="option-icon">${r.icon}</span>
      <strong>${r.name}</strong>
      <p style="font-size:0.85rem;color:#d4af37;margin:5px 0;">${r.motto}</p>
      <small style="color:#aaa;">${r.description}</small>
    </div>`;
  });

  html += `</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
      <button class="btn btn-primary" onclick="if(state.selectedRealms.length >= 1) goTo('subRealm')" ${state.selectedRealms.length < 1 ? 'disabled' : ''}>ادامه</button>
    </div>`;
  app.innerHTML = html;
}

function toggleRealm(id) {
  const idx = state.selectedRealms.indexOf(id);
  if (idx > -1) state.selectedRealms.splice(idx, 1);
  else if (state.selectedRealms.length < 3) state.selectedRealms.push(id);
  renderRealm();
}

// ==================== SUB-REALM SELECTION ====================
function renderSubRealm() {
  const subs = [];
  state.selectedRealms.forEach(realmId => {
    if (SUB_REALMS[realmId]) subs.push(...SUB_REALMS[realmId]);
  });
  
  const maxSelect = Math.min(3, subs.length);
  
  let html = `<h2>راهروهای محله</h2>
    <p style="color:#b0a080;">از میان این گذرها، کدام یک تو را به عمق می‌کشاند؟</p>
    <p style="font-size:0.85rem;color:#888;">(۱ تا ${maxSelect} گذر انتخاب کن)</p>
    <div class="grid" id="subGrid">`;

  subs.forEach(s => {
    html += `<div class="option ${state.selectedSubRealms.includes(s.id) ? 'selected' : ''}" onclick="toggleSub('${s.id}', ${maxSelect})">
      <span class="option-icon">${s.icon}</span>
      <strong>${s.name}</strong>
      <p style="font-size:0.85rem;color:#d4af37;margin:5px 0;">«${s.motto}»</p>
      <small style="color:#aaa;">${s.description}</small>
    </div>`;
  });

  html += `</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
      <button class="btn btn-primary" onclick="if(state.selectedSubRealms.length >= 1) goTo('narrowPath')" ${state.selectedSubRealms.length < 1 ? 'disabled' : ''}>ادامه</button>
    </div>`;
  app.innerHTML = html;
}

function toggleSub(id, maxSelect) {
  const idx = state.selectedSubRealms.indexOf(id);
  if (idx > -1) state.selectedSubRealms.splice(idx, 1);
  else if (state.selectedSubRealms.length < maxSelect) state.selectedSubRealms.push(id);
  renderSubRealm();
}

// ==================== NARROW PATH SELECTION ====================
function renderNarrowPath() {
  const paths = [];
  state.selectedSubRealms.forEach(subId => {
    if (NARROW_PATHS[subId]) paths.push(...NARROW_PATHS[subId]);
  });

  let html = `<h2>مسیرهای باریک</h2>
    <p style="color:#b0a080;">کدام مسیر تو را صدا می‌زند؟</p>
    <p style="font-size:0.85rem;color:#888;">(می‌توانی چند گزینه انتخاب کنی)</p>
    <div class="grid" id="pathGrid">`;

  paths.forEach(p => {
    html += `<div class="option ${state.selectedNarrowPaths.includes(p.id) ? 'selected' : ''}" onclick="togglePath('${p.id}')">
      <span class="option-icon">${p.icon}</span>
      <strong>${p.name}</strong>
      <p style="font-size:0.85rem;color:#d4af37;margin:5px 0;">${p.description}</p>
    </div>`;
  });

  html += `</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
      <button class="btn btn-primary" onclick="if(state.selectedNarrowPaths.length >= 1) loadSwipeCards()" ${state.selectedNarrowPaths.length < 1 ? 'disabled' : ''}>مشاهدهٔ جرقه‌های انرژی</button>
    </div>`;
  app.innerHTML = html;
}

function togglePath(id) {
  const idx = state.selectedNarrowPaths.indexOf(id);
  if (idx > -1) state.selectedNarrowPaths.splice(idx, 1);
  else state.selectedNarrowPaths.push(id);
  renderNarrowPath();
}

// ==================== SWIPE CARDS ====================
async function loadSwipeCards() {
  const majorCodes = [];
  state.selectedNarrowPaths.forEach(pathId => {
    const path = findNarrowPath(pathId);
    if (path && path.majorCodes) majorCodes.push(...path.majorCodes);
  });
  
  if (majorCodes.length === 0) {
    state.swipeCards = [];
    goTo('strategies');
    return;
  }
  
  try {
    const url = DATA_BASE + 'micro_motives.json';
    const response = await fetch(url);
    const allMotives = await response.json();
    
    state.swipeCards = allMotives.filter(m => 
      majorCodes.some(prefix => m.code.startsWith(prefix))
    );
    
    state.swipeIndex = 0;
    state.totalSwipes = state.swipeCards.length;
    goTo('swipe');
  } catch (e) {
    alert('خطا در بارگذاری جرقه‌ها. لطفاً دوباره تلاش کن.');
  }
}

function findNarrowPath(id) {
  for (const subId in NARROW_PATHS) {
    const found = NARROW_PATHS[subId].find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

function renderSwipe() {
  // بررسی خودکار اتمام یا رسیدن به سقف ۸۰
  if (state.swipeIndex >= state.swipeCards.length || state.likedCodes.length >= 80) {
    if (state.likedCodes.length >= 20) goTo('strategies');
    else {
      alert('حداقل ۲۰ جرقه برای ادامه لازمه! می‌توانی جرقه‌های قبلی را مرور کنی یا مسیرهای بیشتری انتخاب کنی.');
      goBack();
    }
    return;
  }

  const card = state.swipeCards[state.swipeIndex];
  const progress = state.totalSwipes > 0 ? ((state.swipeIndex + 1) / state.totalSwipes) * 100 : 0;
  const canFinish = state.likedCodes.length >= 20;
  const reachedMax = state.likedCodes.length >= 80;

  app.innerHTML = `
    <h2>🔥 جرقهٔ انرژی</h2>
    <div style="color:#f0c040;margin-bottom:10px;">
      💛 <strong>${state.likedCodes.length}</strong> جرقه 
      <span style="font-size:0.8rem;color:#888;">(حداقل ۲۰ - حداکثر ۸۰)</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="swipe-card">
      <p style="font-size:1.2rem;line-height:2.2;">${card.description_fa}</p>
      <div style="display:flex;gap:15px;justify-content:center;margin-top:20px;">
        <button class="btn btn-heart" onclick="likeCard(true)" ${reachedMax ? 'disabled' : ''}>❤️ جرقه زد</button>
        <button class="btn btn-skip" onclick="likeCard(false)">❌ ادامه</button>
      </div>
      ${canFinish ? `<button class="btn btn-primary" style="margin-top:15px;width:100%;" onclick="finishSwipe()">کافیه، برو به مرحلهٔ بعد (${state.likedCodes.length} جرقه)</button>` : ''}
      ${!canFinish ? `<p style="color:#888;margin-top:15px;">برای ادامه حداقل به ۲۰ جرقه نیاز داری (${20 - state.likedCodes.length} جرقهٔ دیگر)</p>` : ''}
    </div>
  `;
}

function likeCard(liked) {
  if (liked) {
    if (state.likedCodes.length < 80) {
      state.likedCodes.push(state.swipeCards[state.swipeIndex].code);
    }
  }
  state.swipeIndex++;
  
  if (state.likedCodes.length >= 80) {
    alert('🎉 به حداکثر ۸۰ جرقه رسیدی! در حال انتقال به بخش راهبردها...');
    setTimeout(() => goTo('strategies'), 500);
  } else {
    renderSwipe();
  }
}

function finishSwipe() {
  if (state.likedCodes.length < 20) {
    alert(`حداقل ۲۰ جرقه نیاز داری! الان ${state.likedCodes.length} جرقه داری.`);
    return;
  }
  goTo('strategies');
}

// ==================== STRATEGY QUESTIONS ====================
function renderStrategy() {
  if (state.currentQuestion >= STRATEGY_QUESTIONS.length) {
    state.currentQuestion = 0;
    goTo('values');
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
  html += `</div>
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
  app.innerHTML = html;
}

function answerStrategy(idx) {
  state.strategyAnswers[state.currentQuestion] = idx;
  state.currentQuestion++;
  renderStrategy();
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
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
  `;
}

function answerValue(choice) {
  const qNum = state.currentQuestion + 1;
  state.valueAnswers[state.currentQuestion] = `Q${qNum}${choice}`;
  state.currentQuestion++;
  renderValue();
}

// ==================== SUBMIT TO API ====================
async function submitResults() {
  goTo('results');
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;
  
  // تطبیق ساختار با API
  const payload = {
    micro_motives: state.likedCodes,
    sjt_answers: state.strategyAnswers.reduce((obj, val, idx) => { obj[`Q${idx+1}`] = val; return obj; }, {}),
    conjoint_choices: state.valueAnswers.reduce((obj, val, idx) => { obj[`Q${idx+1}`] = val; return obj; }, {}),
    reality: null
  };
  
  try {
    const response = await fetch(API_BASE + '/api/darkhorse/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`خطای سرور: ${response.status}`);
    const data = await response.json();
    displayResults(data);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<h2>❌ خطا</h2><p>اتصال به سرور برقرار نشد یا خطایی رخ داد. لطفاً دوباره تلاش کن.</p><button class="btn btn-primary" onclick="goBack()">بازگشت</button>`;
  }
}

function displayResults(data) {
  const recs = data.discovery_result?.recommendations || [];
  const matchedRecs = recs.filter(r => r.fit_score >= 30).sort((a, b) => b.fit_score - a.fit_score);
  
  let html = `<h2>📊 نتایج</h2>
    <p>بر اساس <strong>${state.likedCodes.length}</strong> جرقهٔ انرژی، ${matchedRecs.length} رشته با فردیت تو هم‌راستا هستند:</p>`;
  
  if (matchedRecs.length === 0) {
    html += `<p>متأسفانه هیچ رشته‌ای با آستانهٔ ۳۰٪ پیدا نشد. سعی کن جرقه‌های بیشتری جمع کنی یا انتخاب‌هایت را گسترش دهی.</p>`;
  } else {
    matchedRecs.slice(0, 15).forEach(r => {
      html += `
        <div class="card" style="text-align:right;">
          <h3 style="color:#f0c040;">${r.major_name_fa || 'رشتهٔ پیشنهادی'}</h3>
          <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
          <p style="margin-top:8px;">🔹 <strong>${r.fit_score}%</strong> تطابق</p>
          ${r.evidence && Object.keys(r.evidence).length > 0 ? `<p style="color:#b0a080;font-size:0.85rem;">💡 ${Object.values(r.evidence).flat().slice(0,3).join('؛ ')}</p>` : ''}
        </div>
      `;
    });
  }
  
  html += `<button class="btn btn-primary" onclick="resetJourney()">شروع دوباره</button>`;
  app.innerHTML = html;
}

function resetJourney() {
  state.stage = 'splash';
  state.history = [];
  state.selectedRealms = [];
  state.selectedSubRealms = [];
  state.selectedNarrowPaths = [];
  state.likedCodes = [];
  state.swipeCards = [];
  state.strategyAnswers = [];
  state.valueAnswers = [];
  state.currentQuestion = 0;
  render();
}

// ==================== INIT ====================
render();
