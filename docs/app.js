// frontend/app.js — نسخهٔ نهایی (V7.0)
const API_BASE = 'https://dark-horse-career.onrender.com';
const DATA_BASE = 'https://raw.githubusercontent.com/arad2000/dark-horse-career/main/data/';

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
  strategyQuestions: [],
  valueQuestions: [],
  visitedPaths: new Set()
};

const app = document.getElementById('app');

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

function renderSplash() {
  app.innerHTML = `
    <h1>🐴 اسب سیاه</h1>
    <div class="card"><p class="quote">«شهر رؤیاها...»</p>
      <button class="btn btn-primary" onclick="goTo('realm')">شروع سفر اکتشافی</button></div>`;
}

function renderRealm() {
  const maxSelect = Math.min(3, REALMS.length);
  let html = `<h2>🌃 شهر رؤیاها</h2>
    <p style="color:#b0a080;">کدام محله‌ها تو را صدا می‌زنند؟ (۱ تا ${maxSelect})</p>
    <p style="color:#f0c040;">💛 جرقه‌های تو: <strong>${state.likedCodes.length}</strong></p>
    <div class="grid">`;
  REALMS.forEach(r => {
    const isSelected = state.selectedRealms.includes(r.id);
    html += `<div class="option ${isSelected ? 'selected' : ''}" onclick="toggleRealm('${r.id}')">
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

function renderSubRealm() {
  const subs = [];
  state.selectedRealms.forEach(id => { if (SUB_REALMS[id]) subs.push(...SUB_REALMS[id]); });
  const maxSelect = Math.min(3, subs.length);
  let html = `<h2>راهروهای محله</h2><p style="color:#b0a080;">از میان این گذرها انتخاب کن (۱ تا ${maxSelect})</p><div class="grid">`;
  subs.forEach(s => {
    const visited = state.visitedPaths.has(s.id);
    const isSelected = state.selectedSubRealms.includes(s.id);
    html += `<div class="option ${isSelected ? 'selected' : ''} ${visited ? 'disabled' : ''}" 
      onclick="${visited ? '' : `toggleSub('${s.id}',${maxSelect})`}" 
      style="${visited ? 'opacity:0.5;pointer-events:none;' : ''}">
      <span class="option-icon">${s.icon}</span><strong>${s.name} ${visited ? '✅' : ''}</strong>
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

function renderNarrowPath() {
  const paths = [];
  state.selectedSubRealms.forEach(id => { if (NARROW_PATHS[id]) paths.push(...NARROW_PATHS[id]); });
  let html = `<h2>مسیرهای باریک</h2><p style="color:#b0a080;">کدام مسیر تو را صدا می‌زند؟</p><div class="grid">`;
  paths.forEach(p => {
    const visited = state.visitedPaths.has(p.id);
    const isSelected = state.selectedNarrowPaths.includes(p.id);
    html += `<div class="option ${isSelected ? 'selected' : ''} ${visited ? 'disabled' : ''}" 
      onclick="${visited ? '' : `togglePath('${p.id}')`}" 
      style="${visited ? 'opacity:0.5;pointer-events:none;' : ''}">
      <span class="option-icon">${p.icon}</span><strong>${p.name} ${visited ? '✅' : ''}</strong>
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
    state.swipeCards = all.filter(m => majorCodes.some(p => m.code.startsWith(p)) && !state.likedCodes.includes(m.code));
    state.swipeIndex = 0;
    state.totalSwipes = state.swipeCards.length;
    // علامت‌گذاری مسیرهای بازدیدشده
    state.selectedNarrowPaths.forEach(id => state.visitedPaths.add(id));
    if (state.selectedSubRealms.length > 0) state.selectedSubRealms.forEach(id => state.visitedPaths.add(id));
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

function renderSwipe() {
  if (state.swipeIndex >= state.swipeCards.length) {
    if (state.likedCodes.length >= 20) { goTo('strategies'); return; }
    else { alert(`حداقل ۲۰ جرقه لازمه! الان ${state.likedCodes.length} جرقه داری.`); goBack(); return; }
  }
  if (state.likedCodes.length >= 80) { alert('🎉 حداکثر جرقه!'); setTimeout(() => goTo('strategies'), 500); return; }
  const card = state.swipeCards[state.swipeIndex];
  const progress = state.totalSwipes > 0 ? ((state.swipeIndex + 1) / state.totalSwipes) * 100 : 0;
  const canFinish = state.likedCodes.length >= 20;
  const reachedMax = state.likedCodes.length >= 80;
  app.innerHTML = `
    <h2>🔥 جرقهٔ انرژی</h2>
    <div style="color:#f0c040;">💛 <strong>${state.likedCodes.length}</strong> جرقه <span style="font-size:0.8rem;color:#888;">(حداقل ۲۰ - حداکثر ۸۰)</span></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="swipe-card">
      <p style="font-size:1.2rem;line-height:2.2;">${card.description_fa}</p>
      <div style="display:flex;gap:15px;justify-content:center;margin-top:20px;">
        <button class="btn btn-heart" onclick="likeCard(true)" ${reachedMax ? 'disabled' : ''}>❤️ جرقه زد</button>
        <button class="btn btn-skip" onclick="likeCard(false)">❌ ادامه</button>
      </div>
      ${canFinish ? `<button class="btn btn-primary" style="margin-top:15px;width:100%;" onclick="finishSwipe()">کافیه، برو به مرحلهٔ بعد (${state.likedCodes.length} جرقه)</button>` : ''}
      ${!canFinish ? `<p style="color:#f0c040;margin-top:15px;">برای ادامه حداقل به ۲۰ جرقه نیاز داری (${20 - state.likedCodes.length} جرقهٔ دیگر)</p>` : ''}
    </div>`;
}

function likeCard(liked) {
  if (liked && state.likedCodes.length < 80) state.likedCodes.push(state.swipeCards[state.swipeIndex].code);
  state.swipeIndex++;
  renderSwipe();
}

function finishSwipe() {
  if (state.likedCodes.length < 20) { alert(`حداقل ۲۰ جرقه لازم است. شما ${state.likedCodes.length} جرقه دارید.`); return; }
  goTo('strategies');
}

async function loadQuestionData() {
  try {
    const res = await fetch(DATA_BASE + 'questions.json');
    const data = await res.json();
    state.strategyQuestions = data.layers.strategies.questions;
    state.valueQuestions = data.layers.values.questions;
  } catch (e) { alert('خطا در بارگذاری سوالات.'); }
}

function renderStrategy() {
  if (state.currentQuestion >= state.strategyQuestions.length) { state.currentQuestion = 0; goTo('values'); return; }
  const q = state.strategyQuestions[state.currentQuestion];
  let html = `<h2>🧭 راهبرد ${q.number} از ${state.strategyQuestions.length}</h2><div class="card"><p>${q.question}</p>`;
  q.options.forEach(o => html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;" onclick="answerStrategy(${o.index})">${o.text}</button>`);
  html += `</div><button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
  app.innerHTML = html;
}

function answerStrategy(idx) { state.strategyAnswers.push(idx); state.currentQuestion++; renderStrategy(); }

function renderValue() {
  if (state.currentQuestion >= state.valueQuestions.length) { submitResults(); return; }
  const q = state.valueQuestions[state.currentQuestion];
  app.innerHTML = `
    <h2>⚖️ ارزش ${q.number} از ${state.valueQuestions.length}</h2>
    <div class="card"><p>${q.question}</p>
      <button class="btn btn-primary" style="display:block;width:100%;margin-bottom:10px;" onclick="answerValue('${q.options[0].code}')">${q.options[0].text}</button>
      <button class="btn" style="display:block;width:100%;" onclick="answerValue('${q.options[1].code}')">${q.options[1].text}</button>
    </div><button class="btn" onclick="goBack()">⬅️ بازگشت</button>`;
}

function answerValue(code) { state.valueAnswers.push(code); state.currentQuestion++; renderValue(); }

async function submitResults() {
  goTo('results');
  app.innerHTML = `<h2>⏳ در حال تحلیل...</h2>`;
  // ساخت payload کاملاً استاندارد
  const sjtAnswers = {};
  state.strategyQuestions.forEach((q, idx) => {
    if (state.strategyAnswers[idx] !== undefined) {
      const letter = String.fromCharCode(65 + state.strategyAnswers[idx]);
      sjtAnswers[q.id] = letter; // "S01": "A"
    }
  });
  const conjointChoices = {};
  state.valueAnswers.forEach((code, idx) => {
    if (state.valueQuestions[idx]) {
      conjointChoices[state.valueQuestions[idx].id] = code;
    }
  });
  const payload = { micro_motives: state.likedCodes, sjt_answers: sjtAnswers, conjoint_choices: conjointChoices, reality: null };
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  try {
    let response = await fetch(API_BASE + '/api/darkhorse/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      console.warn('⚠️ /api/darkhorse/discover failed, trying /api/calculate...');
      response = await fetch(API_BASE + '/api/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!response.ok) {
      console.warn('⚠️ /api/calculate failed, trying /api/match...');
      response = await fetch(API_BASE + '/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();
    console.log('📥 Response:', data);
    displayResults(data);
  } catch (e) {
    console.error('❌ Fetch error:', e);
    app.innerHTML = `<h2>❌ خطا</h2><p>اتصال به سرور برقرار نشد. لطفاً دوباره تلاش کن.</p><p style="color:#888;">${e.message}</p><button class="btn btn-primary" onclick="goBack()">بازگشت</button>`;
  }
}

function displayResults(data) {
  const recs = data.discovery_result?.recommendations || data.recommendations || [];
  const matchedRecs = recs.filter(r => (r.fit_score || r.total_score || 0) >= 30).sort((a, b) => (b.fit_score || b.total_score) - (a.fit_score || a.total_score));
  let html = `<h2>📊 نتایج</h2><p>بر اساس <strong>${state.likedCodes.length}</strong> جرقه، ${matchedRecs.length} رشته هم‌راستا با فردیت تو:</p>`;
  if (matchedRecs.length === 0) html += `<p style="color:#f0c040;">رشته‌ای با آستانهٔ ۳۰٪ پیدا نشد.</p>`;
  else matchedRecs.slice(0, 15).forEach(r => {
    const score = r.fit_score || r.total_score || 0;
    html += `<div class="card" style="text-align:right;"><h3 style="color:#f0c040;">${r.major_name_fa || r.name || 'رشتهٔ پیشنهادی'}</h3>
      <div class="progress-bar"><div class="progress-fill" style="width:${score}%"></div></div>
      <p style="margin-top:8px;">🔹 <strong>${score}%</strong> تطابق</p></div>`;
  });
  html += `<button class="btn btn-primary" onclick="resetJourney()">شروع دوباره</button>`;
  app.innerHTML = html;
}

function resetJourney() {
  state.stage = 'splash'; state.history = []; state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0; state.visitedPaths.clear();
  render();
}

async function init() { await loadQuestionData(); render(); }
init();
