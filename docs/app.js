// frontend/app.js — نسخهٔ نهایی و کامل (V25.3)
// شامل: Manifesto، Guide، Splash، سه حلقه، سوایپ، لایه دوم و سوم، تحلیل سبک،
// سناریوهای همسویی هوشمند (سناریوی ۴ ساده‌شده)، نظرسنجی ۱۰ سوالی،
// دکمهٔ مشاهده بازخوردها، ذخیره خودکار، اصلاحات کلود (XSS, currentQuestion, Resume, Cache)

const API_BASE = 'https://dark-horse-career.onrender.com';
const DATA_BASE = 'https://raw.githubusercontent.com/arad2000/dark-horse-career/main/data/';

// ==================== GLOBAL STATE ====================
const state = {
  stage: 'manifesto',
  history: [],
  selectedRealms: [],
  selectedSubRealms: [],
  selectedNarrowPaths: [],
  likedCodes: [],
  strategyAnswers: [],
  valueAnswers: [],
  currentQuestion: 0,
  currentValueQuestion: 0,
  swipeCards: [],
  swipeIndex: 0,
  totalSwipes: 0,
  likedCodesSet: new Set(),
  completedPaths: new Set(),
  completedSubRealms: new Set(),
  strategyQuestions: [],
  valueQuestions: [],
  lastPayload: null,
  microMotivesMap: {},
  cachedMotives: null
};

const app = document.getElementById('app');

// ==================== Sanitize HTML ====================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    currentValueQuestion: state.currentValueQuestion,
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
    state.currentValueQuestion = data.currentValueQuestion || 0;
    state.stage = data.stage || 'manifesto';
    state.completedPaths = new Set(data.completedPaths || []);
    state.completedSubRealms = new Set(data.completedSubRealms || []);
    state.likedCodesSet = new Set(data.likedCodes || []);
    return true;
  } catch (e) { return false; }
}

function clearSession() { sessionStorage.removeItem('darkhorse_session'); }

// ==================== بارگذاری داده‌ها ====================
async function loadMicroMotivesMap() {
  try {
    const res = await fetch(DATA_BASE + 'micro_motives.json');
    const all = await res.json();
    all.forEach(m => { state.microMotivesMap[m.code] = m.description_fa; });
  } catch (e) { console.error('خطا در بارگذاری میکروموتیوها:', e); }
}

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
  state.currentValueQuestion = 0;
  saveSession();
  render();
}

// ==================== RENDER ====================
function render() {
  switch (state.stage) {
    case 'manifesto': renderManifesto(); break;
    case 'guide': renderGuide(); break;
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

// ==================== MANIFESTO ====================
function renderManifesto() {
  app.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:3rem;margin-bottom:15px;">🐴</div>
      <h1 style="color:#f0c040;font-size:1.6rem;margin-bottom:20px;">انقلاب شخصی‌سازی</h1>
      <div class="card">
        <p style="color:#b0a080;line-height:2.2;font-size:0.95rem;">
          این اپلیکیشن بر اساس کتاب <strong style="color:#f0c040;">«اسب سیاه»</strong> نوشتهٔ <strong>تاد رز</strong> و <strong>اگی اوگاس</strong> ساخته شده است. آن‌ها باور دارند موفقیت واقعی یک فرمول استاندارد نیست، بلکه <strong style="color:#d4af37;">کشف فردیت منحصربه‌فرد</strong> هر انسان است.
        </p>
        <p style="color:#b0a080;line-height:2.2;font-size:0.95rem;margin-top:15px;">
          🧩 <strong style="color:#f0c040;">خرده‌انگیزه‌هایت را بشناس:</strong> نه علایق کلی و مبهم، که فعالیت‌های جزئی‌ای که واقعاً به تو انرژی می‌دهند.
        </p>
        <p style="color:#b0a080;line-height:2.2;font-size:0.95rem;">
          🧭 <strong style="color:#f0c040;">راهبردهایت را کشف کن:</strong> هر کس سبک منحصربه‌فردی برای یادگیری، حل مسئله و تصمیم‌گیری دارد — سبک خودت را پیدا کن.
        </p>
        <p style="color:#b0a080;line-height:2.2;font-size:0.95rem;">
          ⚖️ <strong style="color:#f0c040;">ارزش‌هایت را بفهم:</strong> چه چیزی واقعاً به کار و زندگی‌ات معنا می‌دهد؟ پاسخ این سوال مسیرت را روشن می‌کند.
        </p>
        <p style="color:#b0a080;line-height:2.2;font-size:0.95rem;">
          🛤️ <strong style="color:#f0c040;">مقصد را فراموش کن:</strong> مسیر زندگی یک مقصد از پیش تعیین‌شده نیست — یک سفر اکتشافی است که هر روز شکل می‌گیرد.
        </p>
        <p style="color:#d4af37;line-height:2.2;font-size:0.95rem;margin-top:15px;">
          <strong>در شهر رؤیاها، خودت را کشف می‌کنی و رشته‌های متناسب با فردیت خود را خواهی دید.</strong> آماده‌ای؟
        </p>
      </div>
      <button class="btn btn-primary" style="margin-top:20px;width:100%;" onclick="goTo('guide')">🚀 شروع سفر اکتشافی</button>
    </div>`;
}

// ==================== GUIDE ====================
function renderGuide() {
  app.innerHTML = `
    <div style="text-align:right;padding:10px;">
      <h2 style="color:#f0c040;">⏳ پیش از شروع، این چند نکته را بخوان</h2>
      <p style="color:#b0a080;line-height:2.2;font-weight:500;">این یک تست شخصیت نیست — بلکه <strong>سفری اکتشافی</strong> به درون خودت است. پس با دقت و آرامش پیش برو.</p>
      
      <div class="card" style="margin-top:15px;">
        <p style="color:#f0c040;font-weight:bold;">🧩 مسیر سفرت چگونه است؟</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;">این سفر سه لایه دارد که هر کدام یک بُعد از فردیت تو را کشف می‌کند:</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;"><strong style="color:#f0c040;">۱. لایهٔ اول: خرده‌انگیزه‌ها (۶۰٪ امتیاز نهایی)</strong><br>
        این لایه خودش سه مرحله دارد که فقط برای <strong>هدایت تو به سمت جرقه‌های انرژی‌ات</strong> طراحی شده‌اند. هیچ‌کدام از این انتخاب‌ها «نتیجهٔ نهایی» نیستند:<br>
        🏙️ <strong>انتخاب قلمروها (۱ تا ۳ تا):</strong> تو فقط مسیر کلی‌ات را مشخص می‌کنی. این انتخاب «پاسخ» نیست — یک راهنمای مسیر است.<br>
        🚪 <strong>انتخاب زیرقلمروها (۱ تا ۳ تا):</strong> مسیر را کمی دقیق‌تر می‌کنی. باز هم نگران نباش — این هم یک راهنماست.<br>
        🎯 <strong>انتخاب مسیرهای باریک:</strong> این آخرین قدم برای رسیدن به مقصد واقعی‌ات است: <strong>خرده‌انگیزه‌ها.</strong></p>
        <p style="color:#d4af37;line-height:2.2;font-weight:500;">🎯 <strong>پاسخ واقعی تو در این لایه، فقط و فقط خرده‌انگیزه‌هایی (جرقه‌های انرژی) هستند که ❤️ می‌زنی.</strong> انتخاب‌های قبلی فقط برای این بوده که به این جرقه‌ها برسی. نتیجهٔ نهایی بر اساس همین جرقه‌ها ساخته می‌شود، نه قلمروها یا زیرقلمروهایی که انتخاب کردی.</p>
      </div>

      <div class="card" style="margin-top:15px;">
        <p style="color:#f0c040;font-weight:bold;">🎯 دربارهٔ جرقه‌های انرژی (خرده‌انگیزه‌ها)</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;">در بخش جرقه‌ها، فعالیت‌های جزئی‌ای را می‌بینی. از میان <strong style="color:#f0c040;">۹۶۰ خرده‌انگیزهٔ مختلف</strong>، <strong>حداقل ۲۰ جرقه و حداکثر ۸۰ جرقه</strong> می‌توانی انتخاب کنی. پس <strong style="color:#f0c040;">با دقت بسیار</strong> آن‌هایی را برگزین که واقعاً به تو انرژی می‌دهند. هرچه جرقه‌های بیشتری بزنی، خودِ واقعی‌ات شفاف‌تر کشف می‌شود.<br><br>
        💡 <strong style="color:#f0c040;">پیشنهاد ویژه:</strong> بهتر است ابتدا <strong>با دقت مطالعه و بررسی کنی</strong> که در کدام قلمرو داری سفر می‌کنی، زیرقلمروها و مسیرهای باریک آن را <strong>بهدقت بخوانی</strong> و پس از رسیدن به انتهای قلمرو و زدن خرده‌انگیزه‌هایی که برایت انرژی می‌دهند، می‌توانی برگردی و قلمروهای دیگر را نیز به همین منوال <strong>مطالعه و بررسی دقیق</strong> قرار دهی. <strong style="color:#f0c040;">حتماً توضیحات هر قلمرو، زیرقلمرو و مسیر باریک را با دقت بخوان</strong> — چون نهایتاً از دل این‌ها خرده‌انگیزه‌هایت را انتخاب خواهی کرد.</p>
      </div>

      <div class="card" style="margin-top:15px;">
        <p style="color:#f0c040;font-weight:bold;">🧭 لایهٔ دوم: راهبردهای فردی (۲۰٪ امتیاز)</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;">در این بخش، ۲۰ موقعیت واقعی پیش روی توست که سبک حل مسئله، یادگیری، کار تیمی و تصمیم‌گیری‌ات را می‌سنجد. هیچ پاسخ درست یا غلطی وجود ندارد — فقط مسیرهای متفاوت.</p>
        
        <p style="color:#f0c040;font-weight:bold;margin-top:10px;">⚖️ لایهٔ سوم: ارزش‌های بنیادین (۲۰٪ امتیاز)</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;">در این بخش، ۱۰ دوگانهٔ قدرتمند پیش روی توست که نشان می‌دهد چه چیزی واقعاً به کار و زندگی‌ات معنا می‌دهد.</p>
      </div>

      <div class="card" style="margin-top:15px;">
        <p style="color:#f0c040;font-weight:bold;">⏳ چند نکتهٔ حیاتی</p>
        <p style="color:#b0a080;line-height:2.2;font-weight:500;">۱. <strong>فضایی آرام انتخاب کن.</strong> جایی که سکوت باشد و کسی مزاحمت نشود.<br>
        ۲. <strong>عجله نکن!</strong> این یک تست نیست — یک <strong>سفر اکتشافی</strong> است. ممکن است بین ۳۰ تا ۶۰ دقیقه طول بکشد. هرچه با حوصله و دقت بیشتری پاسخ دهی، نتیجهٔ دقیق‌تری می‌گیری.<br>
        ۳. <strong>با قلبت پاسخ بده، نه با منطقت.</strong> در این سفر، هیچ پاسخ «درست» یا «غلطی» وجود ندارد. فقط آنچه را که <strong>واقعاً</strong> به تو انرژی می‌دهد انتخاب کن، نه آنچه فکر می‌کنی «باید» انتخاب کنی.<br>
        ۴. <strong>داری سرنوشت خودت را رقم می‌زنی.</strong> انتخاب‌هایت در این سفر، مسیر زندگی تحصیلی و شغلی‌ات را روشن می‌کند. پس <strong>با خودت صادق باش.</strong><br>
        ۵. <strong>اگر خسته شدی، اشکالی ندارد.</strong> می‌توانی هر لحظه مکث کنی و بعداً برگردی. همهٔ پاسخ‌هایت ذخیره می‌شود.</p>
      </div>

      <p style="color:#d4af37;text-align:center;margin-top:20px;font-weight:bold;"><strong>حالا با خیال راحت، سفرت را شروع کن...</strong></p>
      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="goTo('splash')">🚀 ورود به شهر رؤیاها</button>
    </div>`;
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
      <button class="btn btn-primary" onclick="startNewJourney()">ادامه</button>
      ${resumeHTML}
    </div>`;
}

function startNewJourney() {
  clearSession();
  state.stage = 'realm'; state.history = [];
  state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0; state.currentValueQuestion = 0;
  state.likedCodesSet.clear(); state.completedPaths.clear(); state.completedSubRealms.clear();
  state.lastPayload = null;
  render();
}

function resumeJourney() {
  if (loadSession()) {
    if (state.stage === 'results' || state.stage === 'splash' || state.stage === 'manifesto' || state.stage === 'guide') {
      state.stage = 'realm';
    } else if (state.stage === 'swipe') {
      state.stage = 'introSwipe';
    }
    render();
  }
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
      <span class="option-icon">${r.icon}</span><strong>${escapeHtml(r.name)}</strong>
      <p style="color:#d4af37;">${escapeHtml(r.motto)}</p><small>${escapeHtml(r.description)}</small></div>`;
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
      <strong>${escapeHtml(s.name)} ${isComplete ? '✅' : ''}</strong>
      <p style="color:#d4af37;">«${escapeHtml(s.motto)}»</p><small>${escapeHtml(s.description)}</small></div>`;
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
      <strong>${escapeHtml(p.name)} ${isComplete ? '✅' : ''}</strong>
      <p style="color:#d4af37;">${escapeHtml(p.description)}</p></div>`;
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
    let all;
    if (state.cachedMotives) {
      all = state.cachedMotives;
    } else {
      const res = await fetch(DATA_BASE + 'micro_motives.json');
      all = await res.json();
      state.cachedMotives = all;
    }
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
      <p style="font-size:1.2rem;line-height:2.2;">${escapeHtml(card.description_fa)}</p>
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
  state.currentQuestion = 0;
  state.currentValueQuestion = 0;
  state.strategyAnswers = [];
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
  if (state.currentQuestion >= state.strategyQuestions.length) {
    state.currentQuestion = 0;
    state.currentValueQuestion = 0;
    goTo('introValues');
    return;
  }
  const q = state.strategyQuestions[state.currentQuestion];
  const currentAnswer = state.strategyAnswers[state.currentQuestion];
  let html = `<h2>🧭 راهبرد ${q.number} از ${state.strategyQuestions.length}</h2>
    <div class="card"><p style="margin-bottom:20px;color:#f0c040;">${escapeHtml(q.question)}</p>`;
  q.options.forEach(o => {
    const isSelected = currentAnswer === o.index;
    html += `<button class="btn" style="display:block;width:100%;text-align:right;margin-bottom:8px;${isSelected ? 'border:2px solid #f0c040;' : ''}" onclick="answerStrategy(${o.index})">${escapeHtml(o.text)}</button>`;
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
  if (state.currentValueQuestion >= state.valueQuestions.length) {
    app.innerHTML = `
      <h2>✅ پایان سفر اکتشافی</h2>
      <div class="card"><p>تبریک! شما ${state.likedCodes.length} جرقه و به ${state.strategyAnswers.length} موقعیت و ${state.valueAnswers.length} ارزش پاسخ داده‌اید.</p>
      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="submitResults()">🚀 پایان و تحلیل نتایج</button></div>`; return;
  }
  const q = state.valueQuestions[state.currentValueQuestion];
  const opts = q.options;
  const currentAnswer = state.valueAnswers[state.currentValueQuestion];
  app.innerHTML = `
    <h2>⚖️ ارزش ${q.number} از ${state.valueQuestions.length}</h2>
    <div class="card">
      <p style="margin-bottom:20px;color:#f0c040;">${escapeHtml(q.question)}</p>
      <button class="btn" style="display:block;width:100%;margin-bottom:10px;text-align:right;${currentAnswer === opts[0].code ? 'border:2px solid #f0c040;' : ''}" onclick="answerValue('${opts[0].code}')">${escapeHtml(opts[0].text)}</button>
      <button class="btn" style="display:block;width:100%;text-align:right;${currentAnswer === opts[1].code ? 'border:2px solid #f0c040;' : ''}" onclick="answerValue('${opts[1].code}')">${escapeHtml(opts[1].text)}</button>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
      ${state.currentValueQuestion > 0 ? `<button class="btn" onclick="previousValue()">⬅️ سوال قبل</button>` : ''}
      <button class="btn" onclick="goBack()">⬅️ بازگشت</button>
    </div>`;
}

function answerValue(code) { state.valueAnswers[state.currentValueQuestion] = code; state.currentValueQuestion++; saveSession(); render(); }
function previousValue() { if (state.currentValueQuestion > 0) { state.currentValueQuestion--; saveSession(); render(); } }

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

// ==================== DISPLAY RESULTS ====================
function displayResults(data, sjt, conj) {
  const recs = data.discovery_result?.recommendations || [];
  const matched = recs.filter(r => (r.fit_score || 0) >= 30).sort((a, b) => b.fit_score - a.fit_score);
  const bestMajor = matched.length > 0 ? matched[0] : null;

  const strategyStyle = state.strategyAnswers.length >= 15 ? analyzeStrategyStyle(state.strategyAnswers) : null;
  const valueStyle = state.valueAnswers.length >= 5 ? analyzeValueStyle(state.valueAnswers) : null;

  let html = `
    <h2>📊 نتایج</h2>
    <p style="color:#b0a080;font-style:italic;margin-bottom:15px;">✨ این پیشنهادها بر اساس ویژگی‌هایی است که <strong>امروز</strong> در خودت کشف کردی. فردیت یک سفر است، نه یک مقصد — ممکن است در طول زمان تغییر کند و این کاملاً طبیعی است.</p>

    ${strategyStyle || valueStyle ? `
    <div style="background:#1a1a2e;border:1px solid #d4af37;border-radius:12px;padding:15px;margin:15px 0;text-align:right;font-size:0.85rem;">
      <p style="margin:0 0 10px 0;color:#f0c040;font-weight:bold;">🧠 تحلیل سبک شخصی تو</p>
      <p style="margin:5px 0;font-size:0.75rem;color:#888;">برگرفته از پاسخ‌های تو به ۲۰ سوال راهبردی (سبک فکری) و ۱۰ سوال ارزشی (ترجیحات)</p>
      ${strategyStyle ? `<p style="margin:5px 0;"><span style="font-size:1.2rem;">${strategyStyle.icon}</span> <strong>سبک فکری:</strong> ${escapeHtml(strategyStyle.style)} (${strategyStyle.strength}٪) — ${escapeHtml(strategyStyle.description)}</p>` : ''}
      ${valueStyle ? `<p style="margin:5px 0;"><span style="font-size:1.2rem;">⚖️</span> <strong>ارزش‌های کلیدی:</strong> ${escapeHtml(valueStyle.summary)}</p>` : ''}
    </div>` : ''}

    <p>بر اساس <strong>${state.likedCodes.length}</strong> خرده‌انگیزه، ${matched.length} رشته با فردیت تو هم‌راستا هستند:</p>`;

  if (matched.length === 0) {
    html += `<p style="color:#f0c040;">با همین خرده‌انگیزه‌ها، هیچ رشته‌ای به آستانهٔ ۳۰٪ نرسیده است.</p>`;
  } else {
    const avgMicroCount = matched.reduce((sum, r) => {
      const ev = r.evidence || {};
      const mm = ev.micro_motives_matched || ev.micro_motives_match || [];
      return sum + mm.length;
    }, 0) / matched.length;

    matched.forEach(r => {
      let alignmentBadge = '';
      if (r.evidence && typeof r.evidence === 'object') {
        const microMatch = r.evidence.micro_motives_matched || r.evidence.micro_motives_match || [];
        const strategyMatch = r.evidence.strategy_matched || r.evidence.strategy_match || [];
        const valueMatch = r.evidence.value_matched || r.evidence.value_match || [];

        const hasStrategy = strategyMatch.length > 0;
        const hasValue = valueMatch.length > 0;
        const microCount = microMatch.length;

        let scenarioText = '';
        let borderColor = '#b0a080';
        const isMicroWeak = microCount < avgMicroCount && (hasStrategy || hasValue);

        if (hasStrategy && hasValue && isMicroWeak && bestMajor && r.major_id !== bestMajor.major_id) {
          borderColor = '#d4af37';
          const bestMicroEv = bestMajor.evidence || {};
          const bestMicroMatch = bestMicroEv.micro_motives_matched || bestMicroEv.micro_motives_match || [];
          const bestMicroDesc = bestMicroMatch.slice(0, 2).map(m => m.description || m).join(' و ');
          scenarioText = `⚡ سبک فکری و ارزش‌هایت با این رشته همسو هستند، اما خرده‌انگیزه‌هایت (فعالیت‌های جزئی که به تو انرژی می‌دهند) بیشتر به سمت «${escapeHtml(bestMicroDesc)}» اشاره دارند — برای همین «${escapeHtml(bestMajor.major_name_fa)}» در صدر نشسته است. اگر خرده‌انگیزه‌های بیشتری از این حوزه بزنی، جایگاه این رشته تغییر خواهد کرد.`;
        } else if (hasStrategy && hasValue) {
          borderColor = '#f0c040';
          scenarioText = '🎯 هر سه لایهٔ فردیتت با این رشته هم‌راستاست.';
        } else if (hasStrategy && !hasValue) {
          borderColor = '#d4af37';
          scenarioText = '⚡ خرده‌انگیزه‌ها و سبک فکری‌ات همسو هستند، اما ارزش‌هایت مسیر متفاوتی نشان می‌دهند. می‌توانی با انگیزه‌های نوآورانه در این رشته عمل کنی.';
        } else if (!hasStrategy && hasValue) {
          borderColor = '#d4af37';
          scenarioText = '⚡ خرده‌انگیزه‌ها و ارزش‌هایت همسو هستند، اما سبک فکری‌ات با مسیر سنتی تفاوت دارد. محیط‌های خلاق و استارتاپی را بررسی کن.';
        } else {
          borderColor = '#b0a080';
          scenarioText = '🔍 خرده‌انگیزه‌هایت با این رشته همسو هستند.';
        }

        alignmentBadge = `
          <div style="background:#1a1a2e;border:1px solid ${borderColor};border-radius:8px;padding:8px 10px;margin-top:8px;text-align:right;font-size:0.8rem;">
            <p style="margin:0;color:${borderColor};line-height:1.6;">${scenarioText}</p>
          </div>`;
      }

      let evidenceHtml = '';
      if (r.evidence && typeof r.evidence === 'object') {
        const parts = [];
        const microMatch = r.evidence.micro_motives_matched || r.evidence.micro_motives_match || [];
        const strategyMatch = r.evidence.strategy_matched || r.evidence.strategy_match || [];
        const valueMatch = r.evidence.value_matched || r.evidence.value_match || [];
        if (microMatch.length) parts.push(`🧩 خرده‌انگیزه‌های هم‌راستا: ${microMatch.slice(0,3).map(m=>escapeHtml(m.description)||escapeHtml(m)).join('، ')}`);
        if (strategyMatch.length) parts.push(`🧭 سبک فکری هم‌راستا: ${strategyMatch.slice(0,2).map(m=>escapeHtml(m.description)||escapeHtml(m)).join('، ')}`);
        if (valueMatch.length) parts.push(`⚖️ ارزش‌های هم‌راستا: ${valueMatch.slice(0,2).map(m=>escapeHtml(m.description)||escapeHtml(m)).join('، ')}`);
        if (parts.length) evidenceHtml = parts.join('<br>');
      }

      html += `
        <div class="card" style="text-align:right;">
          <h3 style="color:#f0c040;">${escapeHtml(r.major_name_fa) || 'رشتهٔ پیشنهادی'}</h3>
          <div class="progress-bar"><div class="progress-fill" style="width:${r.fit_score}%"></div></div>
          <p style="margin-top:8px;">🔹 <strong>${r.fit_score}%</strong> تطابق</p>
          ${evidenceHtml ? `<p style="font-size:0.85rem;color:#b0a080;line-height:1.8;">📋 ${evidenceHtml}</p>` : ''}
          ${alignmentBadge}
        </div>`;
    });
  }

  // ==================== نظرسنجی ۱۰ سوالی ====================
  html += `
    <div id="feedbackSection" style="background:#1a1a2e;border:1px solid #d4af37;border-radius:12px;padding:15px;margin:30px 0 15px 0;text-align:right;">
      <p style="color:#f0c040;font-weight:bold;margin-bottom:10px;">💬 نظرت دربارهٔ اسب سیاه چیه؟</p>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۱. چقدر از تجربهٔ کلی این سفر اکتشافی راضی بودی؟</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;" id="feedback-q1">
        ${[1,2,3,4,5].map(i => `<span onclick="setFeedback('q1', ${i})" style="font-size:1.5rem;cursor:pointer;opacity:0.3;" id="star-q1-${i}">⭐</span>`).join('')}
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۲. چقدر نتایج با علایق و فردیت واقعی‌ات همخوانی داشت؟</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;" id="feedback-q2">
        ${[1,2,3,4,5].map(i => `<span onclick="setFeedback('q2', ${i})" style="font-size:1.5rem;cursor:pointer;opacity:0.3;" id="star-q2-${i}">⭐</span>`).join('')}
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۳. آیا این اپلیکیشن را به یک دوست معرفی می‌کنی؟</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;" id="feedback-q3">
        <button class="btn btn-sm" onclick="setFeedback('q3', 'yes')" id="btn-q3-yes" style="padding:6px 16px;">بله</button>
        <button class="btn btn-sm" onclick="setFeedback('q3', 'maybe')" id="btn-q3-maybe" style="padding:6px 16px;">شاید</button>
        <button class="btn btn-sm" onclick="setFeedback('q3', 'no')" id="btn-q3-no" style="padding:6px 16px;">خیر</button>
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۴. اگر می‌توانستی <strong>شانس قبولی خود را در دانشگاه‌های مختلف</strong> ببینی، چقدر برایت ارزشمند بود؟</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;" id="feedback-q4">
        ${[1,2,3,4,5].map(i => `<span onclick="setFeedback('q4', ${i})" style="font-size:1.5rem;cursor:pointer;opacity:0.3;" id="star-q4-${i}">⭐</span>`).join('')}
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۵. چقدر دوست داری <strong>آیندهٔ شغلی و بازار کار</strong> این رشته‌ها را ببینی؟</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;" id="feedback-q5">
        ${[1,2,3,4,5].map(i => `<span onclick="setFeedback('q5', ${i})" style="font-size:1.5rem;cursor:pointer;opacity:0.3;" id="star-q5-${i}">⭐</span>`).join('')}
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۶. آیا به انتخاب رشتهٔ سنتی (بر اساس رتبه) هم نیاز داری؟</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;" id="feedback-q6">
        <button class="btn btn-sm" onclick="setFeedback('q6', 'yes')" id="btn-q6-yes" style="padding:6px 16px;">بله</button>
        <button class="btn btn-sm" onclick="setFeedback('q6', 'no')" id="btn-q6-no" style="padding:6px 16px;">خیر</button>
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۷. اگر سرویس <strong>کشف رشته‌های متناسب با فردیت</strong> (همین سفر اکتشافی) پولی بود، باز هم استفاده می‌کردی؟</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;" id="feedback-q7">
        <button class="btn btn-sm" onclick="setFeedback('q7', 'yes')" id="btn-q7-yes" style="padding:6px 16px;">بله</button>
        <button class="btn btn-sm" onclick="setFeedback('q7', 'maybe')" id="btn-q7-maybe" style="padding:6px 16px;">شاید</button>
        <button class="btn btn-sm" onclick="setFeedback('q7', 'no')" id="btn-q7-no" style="padding:6px 16px;">خیر</button>
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۸. اگر بخش <strong>آیندهٔ شغلی و بازار کار</strong> هر رشته (با هزینهٔ کم) ارائه شود، برایت ارزشمند است؟</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;" id="feedback-q8">
        <button class="btn btn-sm" onclick="setFeedback('q8', 'yes')" id="btn-q8-yes" style="padding:6px 16px;">بله</button>
        <button class="btn btn-sm" onclick="setFeedback('q8', 'maybe')" id="btn-q8-maybe" style="padding:6px 16px;">شاید</button>
        <button class="btn btn-sm" onclick="setFeedback('q8', 'no')" id="btn-q8-no" style="padding:6px 16px;">خیر</button>
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۹. چقدر این روش (کشف رشته از طریق فردیت) نسبت به روش‌های سنتی برات نوآورانه بود؟</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;" id="feedback-q10">
        ${[1,2,3,4,5].map(i => `<span onclick="setFeedback('q10', ${i})" style="font-size:1.5rem;cursor:pointer;opacity:0.3;" id="star-q10-${i}">⭐</span>`).join('')}
      </div>

      <p style="color:#b0a080;margin:15px 0 5px 0;">۱۰. چه پیشنهادی برای بهبود داری؟ (اختیاری)</p>
      <textarea id="feedback-q9" placeholder="اینجا بنویس..." style="width:100%;padding:10px;background:#0a0a0f;color:#fff;border:1px solid #333;border-radius:8px;min-height:60px;font-family:Vazirmatn;"></textarea>

      <button class="btn btn-primary" style="width:100%;margin-top:15px;" onclick="submitFeedback()">📩 ثبت بازخورد</button>
      <p id="feedback-msg" style="color:#f0c040;margin-top:8px;display:none;">✅ ممنون از بازخوردت! نظرت ثبت شد.</p>
    </div>`;

  html += `<button class="btn btn-primary" onclick="resetJourney()" style="margin-top:15px;">شروع دوباره</button>`;
  app.innerHTML = html;
}

// ==================== مدیریت بازخورد ====================
const feedback = {};

function setFeedback(question, value) {
  feedback[question] = value;
  if (typeof value === 'number') {
    for (let i = 1; i <= 5; i++) {
      const star = document.getElementById(`star-${question}-${i}`);
      if (star) star.style.opacity = i <= value ? '1' : '0.3';
    }
  }
  if (['q3','q6','q7','q8'].includes(question)) {
    ['yes','maybe','no'].forEach(v => {
      const btn = document.getElementById(`btn-${question}-${v}`);
      if (btn) btn.style.border = v === value ? '2px solid #f0c040' : 'none';
    });
  }
}

function submitFeedback() {
  feedback['q9'] = document.getElementById('feedback-q9')?.value || '';
  const allFeedback = {
    session_id: sessionStorage.getItem('darkhorse_session') || 'unknown',
    timestamp: new Date().toISOString(),
    likedCodes: state.likedCodes.length,
    strategyAnswers: state.strategyAnswers.length,
    valueAnswers: state.valueAnswers.length,
    feedback: feedback
  };
  try {
    const existing = JSON.parse(localStorage.getItem('darkhorse_feedback') || '[]');
    existing.push(allFeedback);
    localStorage.setItem('darkhorse_feedback', JSON.stringify(existing));
  } catch (e) {
    console.error('خطا در ذخیره بازخورد:', e);
  }
  document.getElementById('feedback-msg').style.display = 'block';
}

// ==================== نمایش بازخوردها ====================
function showAllFeedback() {
  try {
    const feedbackData = JSON.parse(localStorage.getItem('darkhorse_feedback') || '[]');
    if (feedbackData.length === 0) { alert('هنوز هیچ بازخوردی ثبت نشده است.'); return; }

    let html = `
      <h2>📋 بازخوردهای ثبت‌شده (${feedbackData.length} مورد)</h2>
      <button class="btn" onclick="goTo('splash')" style="margin-bottom:15px;">⬅️ بازگشت به صفحه اصلی</button>
      <button class="btn" onclick="copyAllFeedback()" style="margin-bottom:15px;background:#d4af37;color:#000;">📋 کپی همه به صورت JSON</button>
      <div style="text-align:right;">`;

    feedbackData.forEach(fb => {
      const date = new Date(fb.timestamp).toLocaleString('fa-IR');
      html += `
        <div class="card" style="text-align:right;margin-bottom:15px;">
          <p style="color:#888;font-size:0.8rem;">📅 ${date}</p>
          <p style="color:#b0a080;">✨ خرده‌انگیزه‌ها: <strong>${fb.likedCodes || '؟'}</strong> عدد</p>
          <p style="color:#b0a080;">🧭 پاسخ‌های راهبرد: <strong>${fb.strategyAnswers || '؟'}</strong> از ۲۰</p>
          <p style="color:#b0a080;">⚖️ پاسخ‌های ارزشی: <strong>${fb.valueAnswers || '؟'}</strong> از ۱۰</p>
          <hr style="border-color:#333;margin:8px 0;">
          <p style="color:#f0c040;">۱. رضایت از تجربه: ${'⭐'.repeat(fb.feedback?.q1 || 0)}</p>
          <p style="color:#f0c040;">۲. همخوانی با فردیت: ${'⭐'.repeat(fb.feedback?.q2 || 0)}</p>
          <p style="color:#f0c040;">۳. معرفی به دوست: ${fb.feedback?.q3 === 'yes' ? '✅ بله' : fb.feedback?.q3 === 'maybe' ? '🤷 شاید' : '❌ خیر'}</p>
          <p style="color:#f0c040;">۴. ارزشمندی شانس قبولی: ${'⭐'.repeat(fb.feedback?.q4 || 0)}</p>
          <p style="color:#f0c040;">۵. علاقه به آینده شغلی: ${'⭐'.repeat(fb.feedback?.q5 || 0)}</p>
          <p style="color:#f0c040;">۶. نیاز به روش سنتی: ${fb.feedback?.q6 === 'yes' ? '✅ بله' : '❌ خیر'}</p>
          <p style="color:#f0c040;">۷. کشف فردیت پولی: ${fb.feedback?.q7 === 'yes' ? '✅ بله' : fb.feedback?.q7 === 'maybe' ? '🤷 شاید' : '❌ خیر'}</p>
          <p style="color:#f0c040;">۸. آینده شغلی پولی: ${fb.feedback?.q8 === 'yes' ? '✅ بله' : fb.feedback?.q8 === 'maybe' ? '🤷 شاید' : '❌ خیر'}</p>
          <p style="color:#f0c040;">۹. نوآورانه بودن: ${'⭐'.repeat(fb.feedback?.q10 || 0)}</p>
          <p style="color:#f0c040;">۱۰. پیشنهاد بهبود: ${escapeHtml(fb.feedback?.q9) || 'ندارد'}</p>
        </div>`;
    });

    html += `</div><button class="btn" onclick="goTo('splash')">⬅️ بازگشت به صفحه اصلی</button>`;
    app.innerHTML = html;
  } catch (e) {
    console.error('خطا در نمایش بازخوردها:', e);
  }
}

function copyAllFeedback() {
  try {
    const feedbackData = JSON.parse(localStorage.getItem('darkhorse_feedback') || '[]');
    const text = JSON.stringify(feedbackData, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ تمام بازخوردها به صورت JSON کپی شد.');
    }).catch(() => {
      alert('❌ خطا در کپی. لطفاً دستی کپی کن.');
    });
  } catch (e) {
    console.error('خطا در کپی بازخوردها:', e);
  }
}

// ==================== RESET & INIT ====================
function resetJourney() {
  clearSession();
  state.stage = 'manifesto'; state.history = []; state.selectedRealms = []; state.selectedSubRealms = []; state.selectedNarrowPaths = [];
  state.likedCodes = []; state.likedCodesSet.clear(); state.strategyAnswers = []; state.valueAnswers = []; state.currentQuestion = 0; state.currentValueQuestion = 0;
  state.completedPaths.clear(); state.completedSubRealms.clear(); state.lastPayload = null; state.cachedMotives = null;
  render();
}

async function init() { await Promise.all([loadQuestions(), loadMicroMotivesMap()]); render(); }
init();
