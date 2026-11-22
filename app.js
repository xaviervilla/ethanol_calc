const STORAGE_KEY = 'ethanol-blend-calculator:v1';

const DEFAULTS = {
  target: 'E30',
  e85: 85,
  fuel: 25,
  current: 30,
};

const BLEND_ETHANOL = { E30: 30, E50: 50 };

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function loadState() {
  const state = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.target = typeof parsed.target === 'string' ? parsed.target : DEFAULTS.target;
        state.e85 = Number(parsed.e85);
        state.fuel = Number(parsed.fuel);
        state.current = Number(parsed.current);
      }
    }
  } catch (err) {
    // corrupted storage -> fall back to defaults
  }
  if (!Object.prototype.hasOwnProperty.call(BLEND_ETHANOL, state.target)) {
    state.target = DEFAULTS.target;
  }
  if (!Number.isFinite(state.current)) {
    state.current = BLEND_ETHANOL[state.target];
  }
  return {
    target: state.target,
    e85: clamp(Number.isFinite(state.e85) ? state.e85 : DEFAULTS.e85, 0, 100),
    fuel: clamp(Number.isFinite(state.fuel) ? state.fuel : DEFAULTS.fuel, 0, 100),
    current: clamp(Number.isFinite(state.current) ? state.current : DEFAULTS.current, 0, 100),
  };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // storage may be unavailable; fail silently
  }
}

function fmt(n) {
  return String(Math.round(n));
}

let state = loadState();

const TANK_SIZE = 20.2; // Explorer ST, gallons
const PUMP_ETHANOL = 10; // gasoline ethanol %
const RESOLUTION = 0.001;

function calculateMix(currentFillLevel, targetMix, currentMix, e85EthanolContent) {
  var currentGallons = TANK_SIZE * (currentFillLevel / 100);
  var e85Added = 0;
  var pumpAdded = 0;
  while (TANK_SIZE - currentGallons > 0) {
    var newEthanolContent = currentMix < targetMix ? e85EthanolContent : PUMP_ETHANOL;
    var addingE85 = currentMix < targetMix;
    var newMix = (currentGallons * currentMix + RESOLUTION * newEthanolContent) / (currentGallons + RESOLUTION);
    if (addingE85) e85Added += RESOLUTION;
    else pumpAdded += RESOLUTION;
    currentGallons += RESOLUTION;
    currentMix = (currentGallons * currentMix + RESOLUTION * newEthanolContent) / (currentGallons + RESOLUTION);
  }
  return { E85Added: e85Added, PumpAdded: pumpAdded, ResultingMix: currentMix };
}

const targetButtons = document.querySelectorAll('[data-blend]');
const e85Value = document.getElementById('e85-value');
const currentGaugeValue = document.getElementById('current-gauge-value');
const fuelOverlay = document.getElementById('fuel-gauge-overlay');
const fuelGaugeValue = document.getElementById('fuel-gauge-value');
const resultE85 = document.getElementById('result-e85');
const resultPump = document.getElementById('result-pump');
const resultMix = document.getElementById('result-mix');

// Overlay image is 900px tall. 100% fuel sits at y=106, 0% at y=814.
const FUEL_FULL_Y = 106;
const FUEL_EMPTY_Y = 814;
const FUEL_OVERLAY_HEIGHT = 900;

const wheelConfigs = [
  { key: 'e85', root: document.getElementById('e85-wheel') },
  { key: 'fuel', root: document.getElementById('fuel-wheel') },
  { key: 'current', root: document.getElementById('current-wheel') },
];

function setupWheel({ key, root }) {
  const scroller = root.querySelector('.wheel__scroller');
  const list = root.querySelector('.wheel__list');
  const items = [];

  for (let v = 100; v >= 0; v -= 1) {
    const item = document.createElement('div');
    item.className = 'wheel__item';
    item.dataset.value = String(v);
    const label = document.createElement('span');
    label.className = 'wheel__item-label';
    label.textContent = String(v);
    item.appendChild(label);
    list.appendChild(item);
    items[v] = item;
  }

  let activeIndex = -1;
  let marksKey = '';
  let frame = 0;
  let lastScrollAt = 0;

  const itemHeight = (items[0] && items[0].getBoundingClientRect().height) || 44;

  const commit = (v) => {
    v = clamp(Math.round(v), 0, 100);
    if (v === state[key]) return;
    state[key] = v;
    saveState(state);
    render();
  };

  const scrollToValue = (v, smooth) => {
    const top = (100 - clamp(v, 0, 100)) * itemHeight;
    if (Math.abs(scroller.scrollTop - top) < 1) return;
    scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  };

  scroller.scrollTop = (100 - state[key]) * itemHeight;

  scroller.addEventListener('scroll', () => {
    lastScrollAt = performance.now();
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      commit(100 - scroller.scrollTop / itemHeight);
    });
  }, { passive: true });

  list.addEventListener('click', (e) => {
    if (performance.now() - lastScrollAt < 250) return;
    const item = e.target.closest('.wheel__item');
    if (!item) return;
    const v = Number(item.dataset.value);
    scrollToValue(v, true);
    commit(v);
  });

  root.addEventListener('pointerdown', () => {
    root.focus({ preventScroll: true });
  });

  root.addEventListener('keydown', (e) => {
    const current = state[key];
    let next = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = current + 1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = current - 1;
    else if (e.key === 'PageUp') next = current + 5;
    else if (e.key === 'PageDown') next = current - 5;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    next = clamp(next, 0, 100);
    scrollToValue(next, true);
    commit(next);
  });

  return {
    key,
    root,
    items,
    setActive(v) {
      if (v === activeIndex) return;
      if (items[activeIndex]) items[activeIndex].classList.remove('wheel__item--active');
      activeIndex = v;
      if (items[activeIndex]) items[activeIndex].classList.add('wheel__item--active');
      root.setAttribute('aria-valuenow', String(v));
    },
    setMarks(values) {
      const key2 = values.join(',');
      if (key2 === marksKey) return;
      marksKey = key2;
      for (const item of items) item.classList.remove('wheel__item--mark');
      for (const v of values) {
        if (items[v]) items[v].classList.add('wheel__item--mark');
      }
    },
  };
}

const wheelViews = wheelConfigs.map((config) => setupWheel(config));

function wheelMarks(key) {
  if (key === 'fuel') return [25, 50, 75];
  if (key === 'e85') return [85];
  if (key === 'current') return [BLEND_ETHANOL[state.target]];
  return [];
}

function render() {
  for (const btn of targetButtons) {
    btn.setAttribute('aria-pressed', btn.dataset.blend === state.target);
  }
  for (const view of wheelViews) {
    view.setActive(state[view.key]);
    view.setMarks(wheelMarks(view.key));
  }
  e85Value.textContent = fmt(state.e85);
  currentGaugeValue.textContent = fmt(state.current);
  if (fuelOverlay) {
    const y = FUEL_EMPTY_Y + (FUEL_FULL_Y - FUEL_EMPTY_Y) * (state.fuel / 100);
    fuelOverlay.style.clipPath = `inset(${((y / FUEL_OVERLAY_HEIGHT) * 100).toFixed(2)}% 0 0 0)`;
  }
  if (fuelGaugeValue) fuelGaugeValue.textContent = fmt(state.fuel) + '%';

  // Calculate blend
  var targetMix = BLEND_ETHANOL[state.target];
  var res = calculateMix(state.fuel, targetMix, state.current, state.e85);
  if (resultE85) resultE85.textContent = res.E85Added.toFixed(2) + ' gal';
  if (resultPump) resultPump.textContent = res.PumpAdded.toFixed(2) + ' gal';
  if (resultMix) resultMix.textContent = res.ResultingMix.toFixed(1) + '% (E' + Math.round(res.ResultingMix) + ')';
}

for (const btn of targetButtons) {
  btn.addEventListener('click', () => {
    state.target = btn.dataset.blend;
    saveState(state);
    render();
  });
}

render();
