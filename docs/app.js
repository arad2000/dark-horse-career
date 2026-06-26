// frontend/app.js — نسخهٔ نهایی (V14.0)

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
  totalSwipes: 0,
  likedCodesSet: new Set(),
  completedPaths: new Set(),
  completedSubRealms: new Set(),
  strategyQuestions: [],
  valueQuestions: []
};

const app = document.getElementById('app');

// ==================== NAVIGATION ====================
function goTo(stage) {
  state.history.push(state.stage);
  state.stage = stage;
  render();
}

function goBack() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  state.stage = prev;
  if (prev === 'realm') {
    state.selectedSubRealms = [];
    state.selectedNarrowPaths = [];
  } else if (prev === 'subRealm') {
    state.selectedNarrowPaths = [];
  }
  state.currentQuestion = 0;
  render();
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

// ==================== SPLASH (جملهٔ کامل) ====================
function renderSplash() {
  app.innerHTML = `
    <h1>🐴 اسب سیاه</h1>
    <div class="card">
      <p class="quote">«شهر رؤیاها، جایی که هر کودکی قبل از خواب به آن سفر می‌کرد...»</p>
      <p>یادت می‌آید بچه که بودی، چشمانت را می‌بستی و خودت را جای یک نفر دیگر تصور می‌کردی؟ یک روز دکتر بودی، یک روز خلبان، یک روز نقاش، یک روز هم کاشف سیارات دور. آن تصویرها، آن حس‌ها، هنوز هم جایی در عمق وجودت زنده‌اند.</p>
      <p>حالا وقت آن رسیده که دوباره به آن شهر برگردی. اما این بار، نه با خیال کودکانه، که با نگاه دقیق یک بزرگسال. در «شهر رؤیاها»، شش محله وجود دارد. هر محله، بوی خاصی می‌دهد، نوری متفاوت دارد، و آدم‌هایش کاری می‌کنند که انگار برای آن به دنیا آمده‌اند.</p>
      <p><strong>کدام یک از این محله‌ها، هنوز هم قلبت را به تپش می‌اندازد؟</strong></p>
      <button class="btn btn-primary" onclick="goTo('realm')">شروع سفر اکتشافی</button>
    </div>`;
}

// ==================== REALM SELECTION ====================
function renderRealm() {
  const maxSelect = Math.min(3, REALMS.length);
  let html = `<h2>🌃 شهر رؤیاها</h2>
    <p style="color:#b0a080;">کدام محله‌ها تو را صدا می‌زنند؟ (۱ تا ${maxSelect})</p>
    <p style="color:#f0c040;">💛 جرقه‌های تو: <strong>${state.likedCodes.length}</strong></p>
    <div class="grid" id="realmGrid">`;
  REALMS.forEach(r => {
    html += `<div class="option ${state.selectedRealms.includes(r.id) ? 'selected' : ''}" onclick="toggleRealm('${r.id}')">
      <span class="option-icon">${r.icon}</span><strong>${r.name}</strong>
      <p style="color:#d4af37;">${r.motto}</p><small>${r.description}</small></div>`;
  });
  html += `</div>
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    <button class="btn btn-primary" onclick="if(state.selectedRealms.length>=1) goTo('subRealm')">ادامه</button>`;
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
  const maxSelect = Math.min(3 * state.selectedRealms.length, subs.length);
  
  let html = `<h2>راهروهای محله</h2>
    <p style="color:#b0a080;">از میان این گذرها، کدام یک تو را به عمق می‌کشاند؟</p>
    <p style="font-size:0.85rem;color:#888;">(۱ تا ${maxSelect} گذر انتخاب کن)</p>
    <div class="grid" id="subGrid">`;
  subs.forEach(s => {
    const isComplete = state.completedSubRealms.has(s.id);
    html += `<div class="option ${state.selectedSubRealms.includes(s.id) ? 'selected' : ''} ${isComplete ? 'disabled' : ''}" 
      onclick="${isComplete ? '' : `toggleSub('${s.id}', ${maxSelect})`}" 
      style="${isComplete ? 'opacity:0.5;pointer-events:none;' : ''}">
      <span class="option-icon">${s.icon}</span>
      <strong>${s.name} ${isComplete ? '✅' : ''}</strong>
      <p style="color:#d4af37;">«${s.motto}»</p><small>${s.description}</small></div>`;
  });
  html += `</div>
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    <button class="btn btn-primary" onclick="if(state.selectedSubRealms.length>=1) goTo('narrowPath')">ادامه</button>`;
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
    <p style="color:#b0a080;">کدام مسیر تو را صدا می‌زند؟ (می‌توانی چند گزینه انتخاب کنی)</p>
    <div class="grid" id="pathGrid">`;
  paths.forEach(p => {
    const isComplete = state.completedPaths.has(p.id);
    html += `<div class="option ${state.selectedNarrowPaths.includes(p.id) ? 'selected' : ''} ${isComplete ? 'disabled' : ''}" 
      onclick="${isComplete ? '' : `togglePath('${p.id}')`}" 
      style="${isComplete ? 'opacity:0.5;pointer-events:none;' : ''}">
      <span class="option-icon">${p.icon}</span>
      <strong>${p.name} ${isComplete ? '✅' : ''}</strong>
      <p style="color:#d4af37;">${p.description}</p></div>`;
  });
  html += `</div>
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    <button class="btn btn-primary" onclick="if(state.selectedNarrowPaths.length>=1) loadSwipeCards()">مشاهدهٔ جرقه‌های انرژی</button>`;
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
    if (path?.majorCodes) majorCodes.push(...path.majorCodes);
  });
  if (majorCodes.length === 0) {
    alert('هیچ جرقه‌ای نیست.');
    goBack();
    return;
  }
  try {
    const res = await fetch(DATA_BASE + 'micro_motives.json');
    const all = await res.json();
    state.swipeCards = all.filter(m => 
      majorCodes.some(prefix => m.code.startsWith(prefix)) && 
      !state.likedCodesSet.has(m.code)
    );
    state.swipeIndex = 0;
    state.totalSwipes = state.swipeCards.length;
    goTo('swipe');
  } catch (e) {
    alert('خطا در بارگذاری جرقه‌ها.');
  }
}

function findNarrowPath(id) {
  for (const subId in NARROW_PATHS) {
    const found = NARROW_PATHS[subId].find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

function updateCompletionStatus() {
  state.selectedNarrowPaths.forEach(pathId => {
    if (state.swipeCards.length === 0 || state.swipeIndex >= state.swipeCards.length) {
      state.completedPaths.add(pathId);
    }
  });
  state.selectedSubRealms.forEach(subId => {
    const allPaths = NARROW_PATHS[subId] || [];
    const allCompleted = allPaths.length > 0 && allPaths.every(p => state.completedPaths.has(p.id));
    if (allCompleted) state.completedSubRealms.add(subId);
  });
}

function renderSwipe() {
  if (state.swipeIndex >= state.swipeCards.length) {
    updateCompletionStatus();
    if (state.likedCodes.length >= 20) {
      state.currentQuestion = 0; state.strategyAnswers = [];
      goTo('strategies'); return;
    } else {
      const remaining = 20 - state.likedCodes.length;
      app.innerHTML = `<h2>🔥 جرقه‌های انرژی</h2>
        <div style="color:#f0c040;margin:20px 0;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div>
        <div class="card"><p style="color:#f0c040;">⚠️ هنوز ${remaining} جرقهٔ دیگر نیاز داری.</p>
        <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="goBack()">🔙 بازگشت به قلمروها</button></div>`; return;
    }
  }
  if (state.likedCodes.length >= 80) {
    updateCompletionStatus();
    setTimeout(() => goTo('strategies'), 500);
    app.innerHTML = `<h2>🎉 تبریک!</h2><div class="card"><p>حداکثر جرقه! در حال انتقال...</p></div>`; return;
  }
  const card = state.swipeCards[state.swipeIndex];
  const progress = state.totalSwipes > 0 ? ((state.swipeIndex + 1) / state.totalSwipes) * 100 : 0;
  const canFinish = state.likedCodes.length >= 20;
  const remainingSlots = 80 - state.likedCodes.length;
  app.innerHTML = `
    <h2>🔥 جرقهٔ انرژی</h2>
    <div style="color:#f0c040;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="swipe-card"><p style="font-size:1.2rem;line-height:2.2;">${card.description_fa}</p>
      <button class="btn btn-heart" onclick="likeCard(true)">❤️ جرقه زد</button>
      <button class="btn btn-skip" onclick="likeCard(false)">❌ ادامه</button>
      ${canFinish ? `<div style="margin-top:20px;border-top:1px solid #333;padding-top:15px;">
        <p style="color:#f0c040;">✅ جرقه‌هایت کافی است!</p>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="finishSwipe()">🚀 ورود به لایهٔ دوم</button>
        <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 جرقه‌های بیشتر</button></div>` : 
        `<p style="color:#f0c040;margin-top:15px;">⚠️ <strong>${20 - state.likedCodes.length}</strong> جرقهٔ دیگر لازم داری</p>
        <button class="btn" style="width:100%;margin-top:10px;" onclick="goBack()">🔙 بازگشت به قلمروها</button>`}
    </div>`;
}

function likeCard(liked) {
  if (liked && state.likedCodes.length < 80) {
    state.likedCodes.push(state.swipeCards[state.swipeIndex].code);
    state.likedCodesSet.add(state.swipeCards[state.swipeIndex].code);
  }
  state.swipeIndex++;
  renderSwipe();
}

function finishSwipe() {
  updateCompletionStatus();
  state.currentQuestion = 0; state.strategyAnswers = [];
  goTo('strategies');
}

// ==================== LOAD QUESTIONS ====================
async function loadQuestions() {
  try {
    const res = await fetch(DATA_BASE + 'questions.json');
    const data = await res.json();
    state.strategyQuestions = data.layers.strategies.questions;
    state.valueQuestions = data.layers.values.questions;
  } catch (e) { console.error('خطا در بارگذاری سوالات:', e); }
}

// ==================== STRATEGY QUESTIONS ====================
function renderStrategy() {
  if (!state.strategyQuestions || state.strategyQuestions.length === 0) {
    app.innerHTML = `<h2>⚠️ در حال بارگذاری سوالات...</h2>`;
    loadQuestions().then(() => render()); return;
  }
  if (state.currentQuestion >= state.strategyQuestions.length) {
    state.currentQuestion = 0; goTo('values'); return;
  }
  const q = state.strategyQuestions[state.currentQuestion];
  let html = `<h2>🧭 راهبرد ${q.number} از ${state.strategyQuestions.length}</h2>
    <div class="card"><p style="margin-bottom:20px;">${q.question}</p>`;
  q.options.forEach(o => html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;" onclick="answerStrategy(${o.index})">${o.text}</button>`);
  html += `</div><button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
  app.innerHTML = html;
}

function answerStrategy(idx) { state.strategyAnswers.push(idx); state.currentQuestion++; render(); }

// ==================== VALUE DILEMMAS ====================
function renderValue() {
  if (!state.valueQuestions || state.valueQuestions.length === 0) {
    app.innerHTML = `<h2>⚠️ در حال بارگذاری سوالات ارزشی...</h2>`;
    loadQuestions().then(() => render()); return;
  }
  if (state.currentQuestion >= state.valueQuestions.length) {
    app.innerHTML = `
      <h2>✅ پایان سفر اکتشافی</h2>
      <div class="card"><p>تبریک! شما ${state.likedCodes.length} جرقه و به ${state.strategyAnswers.length} موقعیت و ${state.valueAnswers.length} ارزش پاسخ داده‌اید.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="submitResults()">🚀 پایان و تحلیل نتایج</button></div>`; return;
  }
  const q = state.valueQuestions[state.currentQuestion];
  const opts = q.options;
  app.innerHTML = `
    <h2>⚖️ ارزش ${q.number} از ${state.valueQuestions.length}</h2>
    <div class="card"><p style="margin-bottom:20px;">${q.question}</p>
      <button class="btn btn-primary" style="display:block;width:100%;margin-bottom:10px;" onclick="answerValue('${opts[0].code}')">${opts[0].text}</button>
      <button class="btn" style="display:block;width:100%;" onclick="answerValue('${opts[1].code}')">${opts[1].text}</button>
    </div><button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
}

function answerValue(code) { state.valueAnswers.push(code); state.currentQuestion++; render(); }

// ==================== اعتبارسنجی ۳۰ سوال ====================
function validateAllAnswers() {
  const answeredStrategy = state.strategyAnswers.length;
  const answeredValue = state.valueAnswers.length;
  const totalStrategy = state.strategyQuestions.length || 20;
  const totalValue = state.valueQuestions.length || 10;
  
  if (answeredStrategy < totalStrategy || answeredValue < totalValue) {
    console.error(`⚠️ اعتبارسنجی: ${answeredStrategy}/${totalStrategy} راهبرد و ${answeredValue}/${totalValue} ارزش`);
    return false;
  }
  return true;
}

// ==================== SUBMIT TO API ====================
async function submitResults() {
  if (!validateAllAnswers()) {
    alert('لطفاً تمام سوالات را پاسخ دهید.');
    goBack(); return;
  }
  state.stage = 'results';
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;

  const sjtAnswers = {};
  state.strategyQuestions.forEach((q, idx) => {
    if (state.strategyAnswers[idx] !== undefined) {
      sjtAnswers[q.id] = String.fromCharCode(65 + state.strategyAnswers[idx]);
    }
  });
  const conjointChoices = {};
  state.valueQuestions.forEach((q, idx) => {
    if (state.valueAnswers[idx] !== undefined) {
      conjointChoices[q.id] = state.valueAnswers[idx];
    }
  });

  const payload = {
    micro_motives: state.likedCodes,
    sjt_answers: sjtAnswers,
    conjoint_choices: conjointChoices,
    reality: null
  };

  try {
    const response = await fetch(API_BASE + '/api/darkhorse/discover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();
    displayResults(data, sjtAnswers, conjointChoices);
  } catch (e) {
    console.error('خطا در ارسال:', e);
    app.innerHTML = `<h2>❌ خطا</h2><p>نتوانستیم با سرور ارتباط برقرار کنیم. لطفاً اتصال خود را بررسی کن و دوباره تلاش کن.</p><button class="btn btn-primary" onclick="goBack()">بازگشت</button>`;
  }
}

function displayResults(data, sjtAnswers, conjointChoices) {
  const recs = data.discovery_result?.recommendations || [];
  const matchedRecs = recs.filter(r => (r.fit_score || 0) >= 30).sort((a, b) => b.fit_score - a.fit_score);
  
  let html = `<h2>📊 نتایج</h2>
    <p>بر اساس <strong>${state.likedCodes.length}</strong> جرقهٔ انرژی، ${matchedRecs.length} رشته با فردیت تو هم‌راستا هستند:</p>`;
  
  // نمایش خلاصه تحلیل (شفاف‌سازی مشارکت لایه‌های دوم و سوم)
  html += `<div style="background:#1a1a2e;border-radius:12px;padding:12px;margin:15px 0;text-align:right;font-size:0.85rem;color:#aaa;">
    <p style="margin:0;color:#f0c040;">🔍 خلاصه تحلیل</p>
    <p style="margin:5px 0;">✨ جرقه‌های انرژی: <strong>${state.likedCodes.length}</strong> عدد</p>
    <p style="margin:5px 0;">🧭 پاسخ‌های راهبرد: <strong>${Object.keys(sjtAnswers).length}</strong> از ۲۰ سوال</p>
    <p style="margin:5px 0;">⚖️ پاسخ‌های ارزشی: <strong>${Object.keys(conjointChoices).length}</strong> از ۱۰ سوال</p>
    <p style="margin:5px 0;">📊 وزن‌ها: ۶۰٪ جرقه‌ها + ۲۰٪ راهبردها + ۲۰٪ ارزش‌ها</p>
  </div>`;

  if (matchedRecs.length === 0) {
    html += `<p style="color:#f0c040;">رشته‌ای با آستانهٔ ۳۰٪ پیدا نشد.</p>`;
  } else {
    matchedRecs.forEach(r => {
      html += `<div class="card" style="text-align:right;">
        <h3 style="color:#f0c040;">${r.major_name_fa || 'رشتهٔ پیشنهادی'}</h3>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
        <p>🔹 <strong>${r.fit_score}%</strong> تطابق</p></div>`;
    });
  }
  html += `<button class="btn btn-primary" onclick="resetJourney()">شروع دوباره</button>`;
  app.innerHTML = html;
}

function resetJourney() {
  state.stage = 'splash'; state.history = [];
  state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.likedCodesSet.clear();
  state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0;
  state.completedPaths.clear(); state.completedSubRealms.clear();
  render();
}

// ==================== INIT ====================
async function init() { await loadQuestions(); render(); }
init();
