// frontend/app.js — نسخهٔ نهایی (V17.0)
// نمایش دلیل پیشنهاد + جملهٔ پویایی فردیت + تمام امکانات قبلی

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
  microMotivesMap: {} // برای ترجمه کد به توضیح فارسی (از micro_motives.json)
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
  sessionStorage.setItem('darkhorse_session', JSON.stringify(sessionData));
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
  } catch (e) { console.error('خطا در بارگذاری دیکشنری میکروموتیوها:', e); }
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

// ==================== SPLASH (لوگوی مه‌آلود + متن کامل) ====================
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
  render();
}
function resumeJourney() { if (loadSession()) { if (state.stage === 'results' || state.stage === 'splash') state.stage = 'realm'; render(); } }

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

// ==================== INTRO SWIPE (راهنمای جدید) ====================
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
    state.swipeCards = all.filter(m => majorCodes.some(prefix => m.code.startsWith(prefix)) && !state.likedCodesSet.has(m.code));
    state.swipeIndex = 0; state.totalSwipes = state.swipeCards.length;
    goTo('swipe');
  } catch (e) { alert('خطا در بارگذاری جرقه‌ها.'); }
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
    if (state.swipeCards.length === 0 || state.swipeIndex >= state.swipeCards.length) state.completedPaths.add(pathId);
  });
  state.selectedSubRealms.forEach(subId => {
    const allPaths = NARROW_PATHS[subId] || [];
    if (allPaths.length > 0 && allPaths.every(p => state.completedPaths.has(p.id))) state.completedSubRealms.add(subId);
  });
}
function renderSwipe() {
  // خودکار در ۸۰ جرقه
  if (state.likedCodes.length >= 80) {
    updateCompletionStatus();
    setTimeout(() => goTo('strategies'), 500);
    app.innerHTML = `<h2>🎉 تبریک!</h2><div class="card"><p>حداکثر جرقه! در حال انتقال...</p></div>`;
    return;
  }
  // کارت‌ها تمام شده و جرقه < ۲۰
  if (state.swipeIndex >= state.swipeCards.length && state.likedCodes.length < 20) {
    const remaining = 20 - state.likedCodes.length;
    app.innerHTML = `<h2>🔥 جرقه‌های انرژی</h2><div style="color:#f0c040;margin:20px 0;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div><div class="card"><p style="color:#f0c040;">⚠️ هنوز ${remaining} جرقهٔ دیگر نیاز داری.</p><button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="goBack()">🔙 بازگشت به قلمروها</button></div>`;
    return;
  }
  // کارت‌ها تمام شده و جرقه >= ۲۰
  if (state.swipeIndex >= state.swipeCards.length && state.likedCodes.length >= 20) {
    updateCompletionStatus();
    app.innerHTML = `<h2>🔥 جرقه‌های انرژی</h2><div style="color:#f0c040;margin:20px 0;">💛 <strong>${state.likedCodes.length}</strong> جرقه</div><div class="card"><p style="color:#b0a080;">🌟 شما به حداقل جرقه‌ها رسیدید! اما هرچه جرقه‌های بیشتری بزنی، خودِ واقعی‌ات را دقیق‌تر کشف می‌کنی.</p><button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="finishSwipe()">🚀 ورود به لایهٔ دوم</button><button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 جرقه‌های بیشتر</button></div>`;
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
    loadQuestions().then(() => render());
    return;
  }
  if (state.currentQuestion >= state.strategyQuestions.length) {
    state.currentQuestion = 0;
    goTo('introValues');
    return;
  }
  const q = state.strategyQuestions[state.currentQuestion];
  let html = `<h2>🧭 راهبرد ${q.number} از ${state.strategyQuestions.length}</h2>
    <div class="card"><p style="margin-bottom:20px;">${q.question}</p>`;
  q.options.forEach(o => {
    html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;" onclick="answerStrategy(${o.index})">${o.text}</button>`;
  });
  html += `</div><button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
  app.innerHTML = html;
}
function answerStrategy(idx) {
  state.strategyAnswers.push(idx);
  state.currentQuestion++;
  saveSession();
  render();
}

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
    loadQuestions().then(() => render());
    return;
  }
  if (state.currentQuestion >= state.valueQuestions.length) {
    app.innerHTML = `
      <h2>✅ پایان سفر اکتشافی</h2>
      <div class="card">
        <p>تبریک! شما ${state.likedCodes.length} جرقه و به ${state.strategyAnswers.length} موقعیت و ${state.valueAnswers.length} ارزش پاسخ داده‌اید.</p>
        <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="submitResults()">🚀 پایان و تحلیل نتایج</button>
      </div>`;
    return;
  }
  const q = state.valueQuestions[state.currentQuestion];
  const opts = q.options;
  app.innerHTML = `
    <h2>⚖️ ارزش ${q.number} از ${state.valueQuestions.length}</h2>
    <div class="card">
      <p style="margin-bottom:20px;">${q.question}</p>
      <button class="btn" style="display:block;width:100%;margin-bottom:10px;text-align:right;" onclick="answerValue('${opts[0].code}')">${opts[0].text}</button>
      <button class="btn" style="display:block;width:100%;text-align:right;" onclick="answerValue('${opts[1].code}')">${opts[1].text}</button>
    </div>
    <button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
}
function answerValue(code) {
  state.valueAnswers.push(code);
  state.currentQuestion++;
  saveSession();
  render();
}

// ==================== API ====================
async function loadQuestions() {
  try {
    const res = await fetch(DATA_BASE + 'questions.json');
    const data = await res.json();
    state.strategyQuestions = data.layers.strategies.questions;
    state.valueQuestions = data.layers.values.questions;
  } catch (e) { console.error('خطا در بارگذاری سوالات:', e); }
}

function buildPayload() {
  const sjt = {};
  state.strategyQuestions.forEach((q, i) => {
    if (state.strategyAnswers[i] !== undefined) sjt[q.id] = String.fromCharCode(65 + state.strategyAnswers[i]);
  });
  const conj = {};
  state.valueQuestions.forEach((q, i) => {
    if (state.valueAnswers[i] !== undefined) conj[q.id] = state.valueAnswers[i];
  });
  return {
    micro_motives: state.likedCodes,
    sjt_answers: sjt,
    conjoint_choices: conj,
    reality: null
  };
}

async function submitResults() {
  state.stage = 'results';
  const payload = buildPayload();
  state.lastPayload = payload;
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;
  try {
    const res = await fetch(API_BASE + '/api/darkhorse/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    clearSession();
    displayResults(data, payload.sjt_answers, payload.conjoint_choices);
  } catch (e) {
    console.error('خطا در ارسال:', e);
    app.innerHTML = `
      <h2>❌ خطا در دریافت نتایج</h2>
      <div class="card">
        <p>نتوانستیم با سرور ارتباط برقرار کنیم. لطفاً اتصال خود را بررسی کن و دوباره تلاش کن.</p>
        <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="retrySubmit()">🔄 تلاش دوباره</button>
        <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 بازگشت</button>
      </div>`;
  }
}

async function retrySubmit() {
  if (!state.lastPayload) { goBack(); return; }
  app.innerHTML = `<h2>⏳ در حال تلاش مجدد...</h2>`;
  try {
    const res = await fetch(API_BASE + '/api/darkhorse/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.lastPayload)
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    clearSession();
    displayResults(data, state.lastPayload.sjt_answers, state.lastPayload.conjoint_choices);
  } catch (e) {
    console.error('خطا در تلاش مجدد:', e);
    app.innerHTML = `
      <h2>❌ خطا در دریافت نتایج</h2>
      <div class="card">
        <p>هنوز نمی‌توانیم به سرور متصل شویم. لطفاً اتصال خود را بررسی کن و دوباره تلاش کن.</p>
        <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="retrySubmit()">🔄 تلاش دوباره</button>
        <button class="btn" style="width:100%;margin-top:8px;" onclick="goBack()">🔙 بازگشت</button>
      </div>`;
  }
}

function displayResults(data, sjt, conj) {
  const recs = data.discovery_result?.recommendations || [];
  const matched = recs.filter(r => (r.fit_score || 0) >= 30).sort((a, b) => b.fit_score - a.fit_score);

  let html = `
    <h2>📊 نتایج</h2>
    <p style="color:#b0a080;font-style:italic;margin-bottom:15px;">✨ این پیشنهادها بر اساس ویژگی‌هایی است که <strong>امروز</strong> در خودت کشف کردی. فردیت یک سفر است، نه یک مقصد — ممکن است در طول زمان تغییر کند و این کاملاً طبیعی است.</p>
    <p>بر اساس <strong>${state.likedCodes.length}</strong> جرقهٔ انرژی، ${matched.length} رشته با فردیت تو هم‌راستا هستند:</p>

    <div style="background:#1a1a2e;border-radius:12px;padding:12px;margin:15px 0;text-align:right;font-size:0.85rem;color:#aaa;">
      <p style="margin:0;color:#f0c040;">🔍 خلاصه تحلیل</p>
      <p style="margin:5px 0;">✨ جرقه‌های انرژی: <strong>${state.likedCodes.length}</strong> عدد</p>
      <p style="margin:5px 0;">🧭 پاسخ‌های راهبرد: <strong>${Object.keys(sjt).length}</strong> از ۲۰ سوال</p>
      <p style="margin:5px 0;">⚖️ پاسخ‌های ارزشی: <strong>${Object.keys(conj).length}</strong> از ۱۰ سوال</p>
      <p style="margin:5px 0;">📊 وزن‌ها: ۶۰٪ جرقه‌ها + ۲۰٪ راهبردها + ۲۰٪ ارزش‌ها</p>
    </div>`;

  if (matched.length === 0) {
    html += `<p style="color:#f0c040;">رشته‌ای با آستانهٔ ۳۰٪ پیدا نشد. جرقه‌های بیشتری بزن یا مسیرهای جدیدی انتخاب کن.</p>`;
  } else {
    matched.forEach(r => {
      // امتیاز تفکیکی — اگر API برگرداند
      const mScore = r.m_score || 0;
      const sScore = r.s_score || 0;
      const vScore = r.v_score || 0;

      // جرقه‌های مشترک — اگر API برگرداند
      let sparkDescriptions = '';
      if (r.common_micro_motives && r.common_micro_motives.length > 0) {
        sparkDescriptions = r.common_micro_motives
          .slice(0, 3)
          .map(c => c.description || state.microMotivesMap[c.code] || c.code)
          .join('؛ ');
      }

      // شواهد — اگر API برگرداند
      let evidenceText = '';
      if (r.evidence && typeof r.evidence === 'object') {
        const flat = Object.values(r.evidence).flat().slice(0, 3);
        if (flat.length > 0) evidenceText = flat.join('؛ ');
      }

      html += `
        <div class="card" style="text-align:right;">
          <h3 style="color:#f0c040;">${r.major_name_fa || 'رشتهٔ پیشنهادی'}</h3>
          <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
          <p style="margin-top:8px;">🔹 <strong>${r.fit_score}%</strong> تطابق</p>
          <p style="font-size:0.8rem;color:#888;">
            🧩 خرده‌انگیزه‌ها: ${mScore}% | 
            🧭 راهبردها: ${sScore}% | 
            ⚖️ ارزش‌ها: ${vScore}%
          </p>
          ${sparkDescriptions ? `<p style="font-size:0.85rem;color:#b0a080;">💡 جرقه‌های مشترک: ${sparkDescriptions}</p>` : ''}
          ${evidenceText ? `<p style="font-size:0.85rem;color:#b0a080;">📋 شواهد تطابق: ${evidenceText}</p>` : ''}
        </div>`;
    });
  }

  // دکمهٔ Debug برای نمایش پاسخ خام API
  html += `
    <div style="margin-top:20px;text-align:center;">
      <button class="btn" onclick="document.getElementById('debugRaw').classList.toggle('hidden')" style="font-size:0.8rem;background:#333;color:#aaa;">🔧 نمایش پاسخ خام (Debug)</button>
      <pre id="debugRaw" class="hidden" style="background:#111;padding:10px;border-radius:8px;overflow-x:auto;font-size:0.7rem;color:#0f0;text-align:left;direction:ltr;margin-top:10px;">${JSON.stringify(data, null, 2).substring(0, 2000)}</pre>
    </div>
    <button class="btn btn-primary" onclick="resetJourney()">شروع دوباره</button>`;

  app.innerHTML = html;
}

function resetJourney() {
  clearSession();
  state.stage = 'splash'; state.history = [];
  state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.likedCodesSet.clear();
  state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0;
  state.completedPaths.clear(); state.completedSubRealms.clear();
  render();
}

// ==================== INIT ====================
async function init() {
  await Promise.all([loadQuestions(), loadMicroMotivesMap()]);
  render();
}
init();
