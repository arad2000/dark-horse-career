// frontend/app.js — نسخهٔ نهایی و کامل (V18.0)
// شامل تمام اصلاحات:
// - نام‌های evidence با d (matched)
// - رنگ سوالات زرد
// - دکمه‌های پاسخ بی‌رنگ با border طلایی هنگام انتخاب
// - بازگشت به سوال قبل در لایه دوم، سوم و جرقه‌ها
// - رفع باگ ۸۰ جرقه (introStrategies قبل از سوالات)
// - حذف تمام دیباگ‌ها از نتایج
// - تحلیل سبک شخصی و سناریوهای همسویی
// - ذخیره خودکار، لوگوی مه‌آلود و تمام قابلیت‌های قبلی

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
  valueQuestions: [],
  lastPayload: null,
  microMotivesMap: {}
};

const app = document.getElementById('app');

// ==================== ذخیره و بازیابی خودکار ====================
function saveSession() {
  const sessionData = {
    selectedRealms: state.selectedRealms,
    selectedSubRealms: state.selectedSubRealms,
    selectedNarrowPaths: state.selectedNarrowPaths,
    likedCodes: state.likedCodes,
    strategyAnswers: state.strategyAnswers,
    valueAnswers: state.valueAnswers,
    currentQuestion: state.currentQuestion,
    stage: state.stage,
    completedPaths: [...state.completedPaths],
    completedSubRealms: [...state.completedSubRealms]
  };
  try { sessionStorage.setItem('darkhorse_session', JSON.stringify(sessionData)); } catch (e) {}
}

function loadSession() {
  const saved = sessionStorage.getItem('darkhorse_session');
  if (!saved) return false;
  try {
    const data = JSON.parse(saved);
    state.selectedRealms = data.selectedRealms || [];
    state.selectedSubRealms = data.selectedSubRealms || [];
    state.selectedNarrowPaths = data.selectedNarrowPaths || [];
    state.likedCodes = data.likedCodes || [];
    state.strategyAnswers = data.strategyAnswers || [];
    state.valueAnswers = data.valueAnswers || [];
    state.currentQuestion = data.currentQuestion || 0;
    state.stage = data.stage || 'splash';
    state.completedPaths = new Set(data.completedPaths || []);
    state.completedSubRealms = new Set(data.completedSubRealms || []);
    state.likedCodesSet = new Set(data.likedCodes || []);
    return true;
  } catch (e) { return false; }
}

function clearSession() { sessionStorage.removeItem('darkhorse_session'); }

// ==================== بارگذاری دیکشنری میکروموتیوها ====================
async function loadMicroMotivesMap() {
  try {
    const res = await fetch(DATA_BASE + 'micro_motives.json');
    const all = await res.json();
    all.forEach(m => { state.microMotivesMap[m.code] = m.description_fa; });
  } catch (e) { console.error('خطا در بارگذاری میکروموتیوها:', e); }
}

// ==================== بارگذاری سوالات ====================
async function loadQuestions() {
  try {
    const res = await fetch(DATA_BASE + 'questions.json');
    const data = await res.json();
    state.strategyQuestions = data.layers.strategies.questions;
    state.valueQuestions = data.layers.values.questions;
  } catch (e) { console.error('خطا در بارگذاری سوالات:', e); }
}

// ==================== NAVIGATION ====================
function goTo(stage) {
  state.history.push(state.stage);
  state.stage = stage;
  saveSession();
  render();
}

function goBack() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  state.stage = prev;
  if (prev === 'realm') { state.selectedSubRealms = []; state.selectedNarrowPaths = []; }
  else if (prev === 'subRealm') { state.selectedNarrowPaths = []; }
  state.currentQuestion = 0;
  saveSession();
  render();
}

// ==================== RENDER ====================
function render() {
  switch (state.stage) {
    case 'splash': renderSplash(); break;
    case 'realm': renderRealm(); break;
    case 'subRealm': renderSubRealm(); break;
    case 'narrowPath': renderNarrowPath(); break;
    case 'introSwipe': renderIntroSwipe(); break;
    case 'swipe': renderSwipe(); break;
    case 'introStrategies': renderIntroStrategies(); break;
    case 'strategies': renderStrategy(); break;
    case 'introValues': renderIntroValues(); break;
    case 'values': renderValue(); break;
    case 'results': renderResults(); break;
  }
}

// ==================== SPLASH ====================
function renderSplash() {
  const hasSession = sessionStorage.getItem('darkhorse_session');
  let resumeHTML = '';
  if (hasSession) {
    resumeHTML = `<p style="color:#f0c040;margin-top:15px;">📌 آخرین سفر ناتمامت رو پیدا کردیم!</p>
      <button class="btn" onclick="resumeJourney()" style="margin-top:8px;">📋 ادامه بده</button>`;
  }
  app.innerHTML = `
    <div style="position:relative;display:inline-block;margin-bottom:20px;">
      <div style="font-size:6rem;filter:blur(6px) brightness(0.6);opacity:0.4;position:absolute;top:-20px;left:50%;transform:translateX(-50%);">🐴</div>
      <div style="font-size:4rem;position:relative;z-index:1;text-shadow:0 0 30px #d4af37;">🐴</div>
    </div>
    <h1 style="margin-top:0;">اسب سیاه</h1>
    <div class="card">
      <p class="quote">«شهر رؤیاها، جایی که هر کودکی قبل از خواب به آن سفر می‌کرد...»</p>
      <p>یادت می‌آید بچه که بودی، چشمانت را می‌بستی و خودت را جای یک نفر دیگر تصور می‌کردی؟ یک روز دکتر بودی، یک روز خلبان، یک روز نقاش، یک روز هم کاشف سیارات دور. آن تصویرها، آن حس‌ها، هنوز هم جایی در عمق وجودت زنده‌اند.</p>
      <p>حالا وقت آن رسیده که دوباره به آن شهر برگردی. اما این بار، نه با خیال کودکانه، که با نگاه دقیق یک بزرگسال. در «شهر رؤیاها»، شش محله وجود دارد. هر محله، بوی خاصی می‌دهد، نوری متفاوت دارد، و آدم‌هایش کاری می‌کنند که انگار برای آن به دنیا آمده‌اند.</p>
      <p><strong>کدام یک از این محله‌ها، هنوز هم قلبت را به تپش می‌اندازد؟</strong></p>
      <button class="btn btn-primary" onclick="startNewJourney()">شروع سفر اکتشافی</button>
      ${resumeHTML}
    </div>`;
}

function startNewJourney() {
  clearSession();
  state.stage = 'realm'; state.history = [];
  state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0;
  state.likedCodesSet.clear(); state.completedPaths.clear(); state.completedSubRealms.clear();
  state.lastPayload = null;
  render();
}

function resumeJourney() {
  if (loadSession()) { if (state.stage === 'results' || state.stage === 'splash') state.stage = 'realm'; render(); }
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
  state.selectedRealms.forEach(realmId => { if (SUB_REALMS[realmId]) subs.push(...SUB_REALMS[realmId]); });
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
  state.selectedSubRealms.forEach(subId => { if (NARROW_PATHS[subId]) paths.push(...NARROW_PATHS[subId]); });
  let html = `<h2>مسیرهای باریک</h2>
    <p style="color:#b0a080;">کدام مسیر تو را صدا می‌زند؟</p>
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
    <button class="btn btn-primary" onclick="if(state.selectedNarrowPaths.length>=1) goTo('introSwipe')">مشاهدهٔ جرقه‌های انرژی</button>`;
  app.innerHTML = html;
}

function togglePath(id) {
  const idx = state.selectedNarrowPaths.indexOf(id);
  if (idx > -1) state.selectedNarrowPaths.splice(idx, 1);
  else state.selectedNarrowPaths.push(id);
  renderNarrowPath();
}

// ==================== INTRO SWIPE ====================
function renderIntroSwipe() {
  app.innerHTML = `
    <h2>🔥 به عمیق‌ترین لایه وجودت رسیدی!</h2>
    <div class="card">
      <p style="color:#b0a080;line-height:2.2;">بر اساس تمام انتخاب‌هایی که تا اینجا کردی — از قلمروها و زیرقلمروها تا مسیرهای باریک — حالا درست در همان جایی ایستاده‌ای که <strong>ناخودآگاه و خودآگاهت</strong> به هم گره خورده‌اند.</p>
      <p style="color:#d4af37;">در این مرحله، فعالیت‌های جزئی‌ای را می‌بینی. آن‌هایی که <strong>واقعاً</strong> به تو انرژی می‌دهند، ❤️ بزن. هرچه دقیق‌تر انتخاب کنی، خودِ واقعی‌ات شفاف‌تر کشف خواهد شد.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:20px;" onclick="loadSwipeCards()">🚀 شروع جرقه‌های انرژی</button>
      <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
}

// ==================== SWIPE CARDS ====================
async function loadSwipeCards() {
  const majorCodes = [];
  state.selectedNarrowPaths.forEach(pathId => {
    const path = findNarrowPath(pathId);
    if (path?.majorCodes) majorCodes.push(...path.majorCodes);
  });
  if (majorCodes.length === 0) { alert('هیچ جرقه‌ای نیست.'); goBack(); return; }
  try {
    const res = await fetch(DATA_BASE + 'micro_motives.json');
    const all = await res.json();
    state.swipeCards = all.filter(m =>
      majorCodes.some(prefix => m.code.startsWith(prefix)) && !state.likedCodesSet.has(m.code)
    );
    state.swipeIndex = 0; state.totalSwipes = state.swipeCards.length;
    goTo('swipe');
  } catch (e) { alert('خطا در بارگذاری جرقه‌ها.'); }
}

function findNarrowPath(id) {
  for (const subId in NARROW_PATHS) { const found = NARROW_PATHS[subId].find(p => p.id === id); if (found) return found; }
  return null;
}

function updateCompletionStatus() {
  state.selectedNarrowPaths.forEach(pathId => { if (state.swipeCards.length === 0 || state.swipeIndex >= state.swipeCards.length) state.completedPaths.add(pathId); });
  state.selectedSubRealms.forEach(subId => { const allPaths = NARROW_PATHS[subId] || []; if (allPaths.length > 0 && allPaths.every(p => state.completedPaths.has(p.id))) state.completedSubRealms.add(subId); });
}

function renderSwipe() {
  if (state.likedCodes.length >= 80) {
    updateCompletionStatus();
    setTimeout(() => goTo('introStrategies'), 500);
    app.innerHTML = `<h2>🎉 تبریک!</h2><div class="card"><p>حداکثر جرقه! در حال انتقال...</p></div>`;
    return;
  }
  if (state.swipeIndex >= state.swipeCards.length && state.likedCodes.length < 20) {
    const remaining = 20 - state.likedCodes.length;
    app.innerHTML = `<h2>🔥 جرقه‌های انرژی</h2>
      <div style="color:#f0c040;margin:20px 0;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div>
      <div class="card"><p style="color:#f0c040;">⚠️ هنوز ${remaining} جرقهٔ دیگر نیاز داری.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="goBack()">🔙 بازگشت به قلمروها</button></div>`;
    return;
  }
  if (state.swipeIndex >= state.swipeCards.length && state.likedCodes.length >= 20) {
    updateCompletionStatus();
    app.innerHTML = `<h2>🔥 جرقه‌های انرژی</h2>
      <div style="color:#f0c040;margin:20px 0;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div>
      <div class="card"><p style="color:#b0a080;">🌟 شما به حداقل جرقه‌ها رسیدید! اما هرچه جرقه‌های بیشتری بزنی، خودِ واقعی‌ات را دقیق‌تر کشف می‌کنی.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="finishSwipe()">🚀 ورود به لایهٔ دوم</button>
      <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 جرقه‌های بیشتر</button></div>`;
    return;
  }

  const card = state.swipeCards[state.swipeIndex];
  const progress = state.totalSwipes > 0 ? ((state.swipeIndex + 1) / state.totalSwipes) * 100 : 0;
  const canFinish = state.likedCodes.length >= 20;
  const remainingSlots = 80 - state.likedCodes.length;

  app.innerHTML = `
    <h2>🔥 جرقهٔ انرژی</h2>
    <div style="color:#f0c040;">💛 <strong>${state.likedCodes.length}</strong> جرقه <span style="font-size:0.8rem;color:#888;">(حداقل ۲۰ - حداکثر ۸۰)</span></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="swipe-card">
      <p style="font-size:1.2rem;line-height:2.2;">${card.description_fa}</p>
      <button class="btn btn-heart" onclick="likeCard(true)">❤️ جرقه زد</button>
      <button class="btn btn-skip" onclick="likeCard(false)">❌ ادامه</button>
      ${canFinish ? `
        <div style="margin-top:20px;border-top:1px solid #333;padding-top:15px;">
          <p style="color:#b0a080;">🌟 حداقل جرقه‌ها را داری! اما هرچه بیشتر بزنی، دقیق‌تر کشف می‌شوی.</p>
          <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="finishSwipe()">🚀 ورود به لایهٔ دوم</button>
          <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 جرقه‌های بیشتر (تا ${remainingSlots} جرقهٔ دیگر)</button>
        </div>` : `
        <p style="color:#f0c040;margin-top:15px;">⚠️ <strong>${20 - state.likedCodes.length}</strong> جرقهٔ دیگر لازم داری</p>
        <button class="btn" style="width:100%;margin-top:10px;" onclick="goBack()">🔙 بازگشت به قلمروها</button>`}
      ${state.swipeIndex > 0 ? `<button class="btn" style="margin-top:15px;width:100%;" onclick="previousCard()">⬅️ جرقهٔ قبل</button>` : ''}
    </div>`;
}

function likeCard(liked) {
  if (liked && state.likedCodes.length < 80) {
    state.likedCodes.push(state.swipeCards[state.swipeIndex].code);
    state.likedCodesSet.add(state.swipeCards[state.swipeIndex].code);
  }
  state.swipeIndex++;
  saveSession();
  renderSwipe();
}

function previousCard() {
  if (state.swipeIndex > 0) {
    state.swipeIndex--;
    const removedCode = state.swipeCards[state.swipeIndex]?.code;
    if (removedCode && state.likedCodes.length > 0 && state.likedCodes[state.likedCodes.length - 1] === removedCode) {
      state.likedCodes.pop();
      state.likedCodesSet.delete(removedCode);
    }
    saveSession();
    renderSwipe();
  }
}

function finishSwipe() {
  updateCompletionStatus();
  state.currentQuestion = 0; state.strategyAnswers = [];
  goTo('introStrategies');
}

// ==================== INTRO STRATEGIES ====================
function renderIntroStrategies() {
  app.innerHTML = `
    <h2>🧭 لایهٔ دوم: راهبردهای فردی</h2>
    <div class="card">
      <p style="color:#b0a080;line-height:2.2;">حالا که جرقه‌های انرژی‌ات را شناختی، وقت آن رسیده که بفهمی <strong>چطور</strong> فکر می‌کنی، یاد می‌گیری و با چالش‌ها روبرو می‌شوی. در این بخش، ۲۰ موقعیت واقعی پیش روی توست. هیچ پاسخ درست یا غلطی وجود ندارد — فقط مسیرهای متفاوت.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:20px;" onclick="goTo('strategies')">🚀 شروع سوالات راهبرد</button>
      <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
}

// ==================== STRATEGY QUESTIONS ====================
function renderStrategy() {
  if (!state.strategyQuestions || state.strategyQuestions.length === 0) {
    app.innerHTML = `<h2>⚠️ در حال بارگذاری سوالات...</h2>`;
    loadQuestions().then(() => render()); return;
  }
  if (state.currentQuestion >= state.strategyQuestions.length) { state.currentQuestion = 0; goTo('introValues'); return; }
  const q = state.strategyQuestions[state.currentQuestion];
  const currentAnswer = state.strategyAnswers[state.currentQuestion];
  let html = `<h2>🧭 راهبرد ${q.number} از ${state.strategyQuestions.length}</h2>
    <div class="card"><p style="margin-bottom:20px;color:#f0c040;">${q.question}</p>`;
  q.options.forEach(o => {
    const isSelected = currentAnswer === o.index;
    html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;${isSelected ? 'border:2px solid #f0c040;' : ''}" onclick="answerStrategy(${o.index})">${o.text}</button>`;
  });
  html += `</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
      ${state.currentQuestion > 0 ? `<button class="btn" onclick="previousStrategy()">⬅️ سوال قبل</button>` : ''}
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
  app.innerHTML = html;
}

function answerStrategy(idx) { state.strategyAnswers[state.currentQuestion] = idx; state.currentQuestion++; saveSession(); render(); }

function previousStrategy() { if (state.currentQuestion > 0) { state.currentQuestion--; saveSession(); render(); } }

// ==================== INTRO VALUES ====================
function renderIntroValues() {
  app.innerHTML = `
    <h2>⚖️ لایهٔ سوم: ارزش‌های بنیادین</h2>
    <div class="card">
      <p style="color:#b0a080;line-height:2.2;">و در آخر... چه چیزی به کارت <strong>معنا</strong> می‌دهد؟ در این مرحله، ۱۰ دوگانهٔ قدرتمند پیش روی توست. باید یکی را انتخاب کنی — انتخابی که از اعماق وجودت می‌آید.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:20px;" onclick="goTo('values')">🚀 شروع دوگانه‌های ارزشی</button>
      <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
}

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
  const currentAnswer = state.valueAnswers[state.currentQuestion];
  app.innerHTML = `
    <h2>⚖️ ارزش ${q.number} از ${state.valueQuestions.length}</h2>
    <div class="card">
      <p style="margin-bottom:20px;color:#f0c040;">${q.question}</p>
      <button class="btn" style="display:block;width:100%;margin-bottom:10px;text-align:right;${currentAnswer === opts[0].code ? 'border:2px solid #f0c040;' : ''}" onclick="answerValue('${opts[0].code}')">${opts[0].text}</button>
      <button class="btn" style="display:block;width:100%;text-align:right;${currentAnswer === opts[1].code ? 'border:2px solid #f0c040;' : ''}" onclick="answerValue('${opts[1].code}')">${opts[1].text}</button>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
      ${state.currentQuestion > 0 ? `<button class="btn" onclick="previousValue()">⬅️ سوال قبل</button>` : ''}
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
}

function answerValue(code) { state.valueAnswers[state.currentQuestion] = code; state.currentQuestion++; saveSession(); render(); }

function previousValue() { if (state.currentQuestion > 0) { state.currentQuestion--; saveSession(); render(); } }

// ==================== BUILD PAYLOAD ====================
function buildPayload() {
  const sjt = {};
  state.strategyQuestions.forEach((q, i) => { if (state.strategyAnswers[i] !== undefined) sjt[q.id] = String.fromCharCode(65 + state.strategyAnswers[i]); });
  const conj = {};
  state.valueQuestions.forEach((q, i) => { if (state.valueAnswers[i] !== undefined) conj[q.id] = state.valueAnswers[i]; });
  return { micro_motives: state.likedCodes, sjt_answers: sjt, conjoint_choices: conj, reality: null };
}

// ==================== SUBMIT TO API ====================
async function submitResults() {
  state.stage = 'results'; const payload = buildPayload(); state.lastPayload = payload;
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;
  try {
    const res = await fetch(API_BASE + '/api/darkhorse/discover', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json(); clearSession(); displayResults(data, payload.sjt_answers, payload.conjoint_choices);
  } catch(e) {
    console.error(e);
    app.innerHTML = `<h2>❌ خطا در دریافت نتایج</h2><div class="card"><p>نتوانستیم با سرور ارتباط برقرار کنیم.</p><button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="retrySubmit()">🔄 تلاش دوباره</button><button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 بازگشت</button></div>`;
  }
}

async function retrySubmit() {
  if (!state.lastPayload) { goBack(); return; }
  app.innerHTML = `<h2>⏳ در حال تلاش مجدد...</h2>`;
  try {
    const res = await fetch(API_BASE + '/api/darkhorse/discover', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(state.lastPayload) });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json(); clearSession(); displayResults(data, state.lastPayload.sjt_answers, state.lastPayload.conjoint_choices);
  } catch(e) {
    console.error(e);
    app.innerHTML = `<h2>❌ خطا</h2><div class="card"><p>هنوز نمی‌توانیم متصل شویم.</p><button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="retrySubmit()">🔄 تلاش دوباره</button><button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 بازگشت</button></div>`;
  }
}

// ==================== تحلیل سبک شخصی ====================
function analyzeStrategyStyle(answers) {
  const counts = [0,0,0,0,0];
  answers.forEach(a => { if (a !== undefined) counts[a]++; });
  const labels = [
    { label: 'تحلیلی و گام‌به‌گام', icon: '🔍', key: 0 },
    { label: 'آزمایشگر و جهشی', icon: '🧪', key: 1 },
    { label: 'مشورتی و اجتماعی', icon: '🤝', key: 2 },
    { label: 'شهودی و جرقه‌ای', icon: '💡', key: 3 },
    { label: 'اقدام‌گرا و سریع', icon: '⚡', key: 4 }
  ];
  const dominant = labels.sort((a,b) => counts[b.key] - counts[a.key])[0];
  const total = answers.filter(a => a !== undefined).length;
  const percentage = total > 0 ? Math.round((counts[dominant.key] / total) * 100) : 0;
  return { style: dominant.label, icon: dominant.icon, strength: percentage, description: percentage > 60 ? `شما به‌وضوح یک فرد ${dominant.label} هستید (${percentage}٪ پاسخ‌ها).` : `سبک غالب شما ${dominant.label} است، اما انعطاف‌پذیری بالایی دارید.` };
}

function analyzeValueStyle(answers) {
  const map = {
    'Q1A': { label: 'تأثیر فوری بر انسان', icon: '❤️' }, 'Q1B': { label: 'بهینه‌سازی سیستم‌ها', icon: '⚙️' },
    'Q2A': { label: 'ساختن ماندگار', icon: '🏗️' }, 'Q2B': { label: 'تکثیر ایده در ذهن‌ها', icon: '🌱' },
    'Q3A': { label: 'تنوع و چالش روزانه', icon: '🎢' }, 'Q3B': { label: 'عمق و تخصص مرجع', icon: '🎯' },
    'Q4A': { label: 'مسئولیت فردی', icon: '🫂' }, 'Q4B': { label: 'مسئولیت سیستمی', icon: '🌐' },
    'Q5A': { label: 'تقدیر از دقت و نظم', icon: '🏅' }, 'Q5B': { label: 'تقدیر از خلاقیت', icon: '🎨' },
    'Q6A': { label: 'انرژی از تعامل', icon: '💬' }, 'Q6B': { label: 'انرژی از تمرکز تنهایی', icon: '🧘' },
    'Q7A': { label: 'نوآوری و اختراع', icon: '🚀' }, 'Q7B': { label: 'مربی‌گری و پرورش', icon: '👨‍🏫' },
    'Q8A': { label: 'ثبات و امنیت', icon: '🏰' }, 'Q8B': { label: 'آزادی و انعطاف', icon: '🕊️' },
    'Q9A': { label: 'کاهش رنج انسان', icon: '🕯️' }, 'Q9B': { label: 'خلق زیبایی و دانش', icon: '✨' },
    'Q10A': { label: 'رهبری و تعیین مسیر', icon: '🧭' }, 'Q10B': { label: 'همدلی و وفاق‌سازی', icon: '🕊️' }
  };
  const selected = answers.map(a => map[a] || { label: a, icon: '❓' });
  const unique = [...new Set(selected.map(s => s.label))];
  return { values: selected.slice(0, 5), summary: unique.slice(0, 4).join('، '), description: 'ارزش‌های بنیادین شما نشان می‌دهد که چه چیزی به کارتان معنا می‌بخشد.' };
}

// ==================== DISPLAY RESULTS (تمیز، بدون دیباگ) ====================
function displayResults(data, sjt, conj) {
  const recs = data.discovery_result?.recommendations || [];
  const matched = recs.filter(r => (r.fit_score || 0) >= 30).sort((a, b) => b.fit_score - a.fit_score);
  const strategyStyle = state.strategyAnswers.length >= 15 ? analyzeStrategyStyle(state.strategyAnswers) : null;
  const valueStyle = state.valueAnswers.length >= 5 ? analyzeValueStyle(state.valueAnswers) : null;
  const topScore = matched.length > 0 ? matched[0].fit_score : 0;

  let scenarioHTML = '';
  if (matched.length > 0 && topScore >= 85) scenarioHTML = `<p style="color:#f0c040;font-size:1rem;margin:10px 0;">🎯 <strong>همسویی طلایی!</strong> علایق، سبک فکری و ارزش‌هایت کاملاً هم‌راستا هستند. این رشته‌ها برای تو ساخته شده‌اند.</p>`;
  else if (matched.length > 0 && topScore >= 50) scenarioHTML = `<p style="color:#d4af37;font-size:1rem;margin:10px 0;">⚡ <strong>ترکیب منحصربه‌فرد!</strong> جرقه‌هایت به این رشته‌ها اشاره می‌کنند، اما سبک فکری یا ارزش‌هایت کمی متفاوت است. این نشانهٔ یک "اسب سیاه" در توست. پیشنهاد: <strong>محیط‌های استارتاپی، پروژه‌های آزاد، یا دانشگاه‌های خلاق</strong> را بررسی کن.</p>`;
  else if (matched.length > 0) scenarioHTML = `<p style="color:#f0c040;font-size:1rem;margin:10px 0;">🔍 <strong>قطعات پازل هنوز کامل نیستند.</strong> جرقه‌هایت یک داستان می‌گویند، سبک فکری‌ات داستانی دیگر. جرقه‌های بیشتری بزن یا قلمروهای جدید کشف کن.</p>`;

  let html = `
    <h2>📊 نتایج</h2>
    <p style="color:#b0a080;font-style:italic;margin-bottom:15px;">✨ این پیشنهادها بر اساس ویژگی‌هایی است که <strong>امروز</strong> در خودت کشف کردی. فردیت یک سفر است، نه یک مقصد — ممکن است در طول زمان تغییر کند و این کاملاً طبیعی است.</p>
    ${scenarioHTML}
    ${strategyStyle || valueStyle ? `
    <div style="background:#1a1a2e;border:1px solid #d4af37;border-radius:12px;padding:15px;margin:15px 0;text-align:right;font-size:0.85rem;">
      <p style="margin:0 0 10px 0;color:#f0c040;font-weight:bold;">🧠 تحلیل سبک شخصی تو</p>
      ${strategyStyle ? `<p style="margin:5px 0;"><span style="font-size:1.2rem;">${strategyStyle.icon}</span> <strong>سبک فکری:</strong> ${strategyStyle.style} (${strategyStyle.strength}٪) — ${strategyStyle.description}</p>` : ''}
      ${valueStyle ? `<p style="margin:5px 0;"><span style="font-size:1.2rem;">⚖️</span> <strong>ارزش‌های کلیدی:</strong> ${valueStyle.summary}</p>` : ''}
    </div>` : ''}
    <p>بر اساس <strong>${state.likedCodes.length}</strong> جرقهٔ انرژی، ${matched.length} رشته با فردیت تو هم‌راستا هستند:</p>
    ${matched.length < 5 ? `<p style="color:#f0c040;">💡 هرچه جرقه‌های بیشتری بزنی (مخصوصاً ۴۰-۵۰ جرقه از حوزه‌های متنوع)، نتایج کامل‌تری می‌بینی.</p>` : ''}`;

  if (matched.length === 0) {
    html += `<p style="color:#f0c040;">رشته‌ای با آستانهٔ ۳۰٪ پیدا نشد. جرقه‌های بیشتری بزن یا مسیرهای جدیدی انتخاب کن.</p>`;
  } else {
    matched.forEach(r => {
      let evidenceHtml = '';
      if (r.evidence && typeof r.evidence === 'object') {
        const parts = [];
        const microMatch = r.evidence.micro_motives_matched || r.evidence.micro_motives_match || [];
        const strategyMatch = r.evidence.strategy_matched || r.evidence.strategy_match || [];
        const valueMatch = r.evidence.value_matched || r.evidence.value_match || [];
        if (microMatch.length) parts.push(`🧩 جرقه‌های هم‌راستا: ${microMatch.slice(0,3).map(m=>m.description||m).join('، ')}`);
        if (strategyMatch.length) parts.push(`🧭 سبک فکری هم‌راستا: ${strategyMatch.slice(0,2).map(m=>m.description||m).join('، ')}`);
        if (valueMatch.length) parts.push(`⚖️ ارزش‌های هم‌راستا: ${valueMatch.slice(0,2).map(m=>m.description||m).join('، ')}`);
        if (parts.length) evidenceHtml = parts.join('<br>');
      }
      html += `<div class="card" style="text-align:right;">
        <h3 style="color:#f0c040;">${r.major_name_fa || 'رشتهٔ پیشنهادی'}</h3>
        <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
        <p style="margin-top:8px;">🔹 <strong>${r.fit_score}%</strong> تطابق</p>
        ${evidenceHtml ? `<p style="font-size:0.85rem;color:#b0a080;line-height:1.8;">📋 ${evidenceHtml}</p>` : ''}
      </div>`;
    });
  }

  html += `<button class="btn btn-primary" onclick="resetJourney()" style="margin-top:15px;">شروع دوباره</button>`;
  app.innerHTML = html;
}

// ==================== RESET & INIT ====================
function resetJourney() {
  clearSession();
  state.stage = 'splash'; state.history = []; state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.likedCodesSet.clear(); state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0;
  state.completedPaths.clear(); state.completedSubRealms.clear(); state.lastPayload = null;
  render();
}

async function init() { await Promise.all([loadQuestions(), loadMicroMotivesMap()]); render(); }
init();
