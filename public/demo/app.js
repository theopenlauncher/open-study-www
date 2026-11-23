// The demo's controller: holds state in memory, renders views and handles
// interaction through event delegation. Nothing is persisted or sent anywhere.

import { createInitialState, dayAt } from './data.js';
import { schedule, newCard, uid } from './sm2.js';
import { mmss } from './ui.js';
import { renderApp, inserterItems } from './views.js';
import { subjectById, deckById, quizById, dueCards, todayKey } from './selectors.js';

export function mountDemo(root) {
  let s = createInitialState();
  let tickHandle = null;

  const os = document.createElement('div');
  os.className = 'os';
  root.replaceChildren(os);

  // Start with the sidebar closed when the demo is narrow, like a small window.
  const narrow = () => root.clientWidth <= 820;
  if (narrow()) s.sidebarOpen = false;

  /* ------------------------------------------------------------ render */

  let lastViewKey = '';
  let prevOpen = {};
  function render({ focus } = {}) {
    const main = os.querySelector('#os-main');
    const viewKey = `${s.view}:${s.subjectId}`;
    const scroll = main && viewKey === lastViewKey ? main.scrollTop : 0;
    const active = document.activeElement;
    const activeId = os.contains(active) ? focusKey(active) : null;

    // Entry animations play only when something first appears, not on every re-render.
    const was = prevOpen;
    prevOpen = {
      page: viewKey, ins: !!s.inserter, menu: s.blockMenu, pop: !!s.popover, sheet: s.sheet?.type || null,
      pill: s.timer.started && !s.focusMode, prompt: s.timer.prompt,
    };
    os.classList.toggle('steady-page', was.page === viewKey);
    os.classList.toggle('steady-ins', !!was.ins && prevOpen.ins);
    os.classList.toggle('steady-menu', !!was.menu && was.menu === prevOpen.menu);
    os.classList.toggle('steady-pop', !!was.pop && prevOpen.pop);
    os.classList.toggle('steady-sheet', !!was.sheet && was.sheet === prevOpen.sheet);
    os.classList.toggle('steady-pill', !!was.pill && prevOpen.pill);
    os.classList.toggle('steady-prompt', !!was.prompt && was.prompt === prevOpen.prompt);
    os.dataset.theme = s.appearance;
    os.classList.toggle('is-sidebar-closed', !s.sidebarOpen || s.focusMode);
    os.innerHTML = renderApp(s);

    const nextMain = os.querySelector('#os-main');
    if (nextMain) nextMain.scrollTop = scroll;
    lastViewKey = viewKey;

    const target = focus ? os.querySelector(focus) : activeId ? os.querySelector(activeId) : null;
    if (target) {
      target.focus({ preventScroll: !focus });
      if (focus) placeCaretAtEnd(target);
    }
  }

  // A selector that finds "the same" control after a re-render.
  function focusKey(el) {
    const parts = ['action', 'view', 'id', 'item', 'deck', 'v', 'r', 'key', 'dir', 'input', 'edit', 'change', 'kind'];
    const sel = parts.filter((p) => el.dataset?.[p] != null).map((p) => `[data-${p}="${CSS.escape(el.dataset[p])}"]`).join('');
    if (sel) return sel;
    if (el.name && el.form?.dataset.form) return `[data-form="${el.form.dataset.form}"] [name="${el.name}"]`;
    return null;
  }

  function placeCaretAtEnd(el) {
    if (el.isContentEditable) {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } else if (typeof el.setSelectionRange === 'function' && el.type !== 'checkbox') {
      const n = el.value.length; try { el.setSelectionRange(n, n); } catch { /* not a text input */ }
    }
  }

  const update = (fn, opts) => { fn(); render(opts); };

  /* ------------------------------------------------------------- timer */

  const phaseMinutes = (phase) => (phase === 'focus' ? s.prefs.focus : phase === 'short' ? s.prefs.short : s.prefs.long);

  function setPhase(phase) {
    const t = s.timer;
    t.phase = phase;
    t.duration = phaseMinutes(phase) * 60;
    t.remaining = t.duration;
  }

  function startTicking() {
    stopTicking();
    let last = performance.now();
    tickHandle = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      const t = s.timer;
      if (!t.running) return;
      t.remaining = Math.max(0, t.remaining - dt);
      if (t.remaining <= 0) completePhase();
      else paintTimer();
    }, 250);
  }
  function stopTicking() { if (tickHandle) clearInterval(tickHandle); tickHandle = null; }

  // Update only the live timer readouts so typing elsewhere isn't interrupted.
  function paintTimer() {
    const t = s.timer;
    const time = mmss(Math.ceil(t.remaining));
    os.querySelectorAll('[data-timer="time"]').forEach((el) => { if (el.textContent !== time) el.textContent = time; });
    os.querySelectorAll('[data-timer="ring"]').forEach((el) => {
      const c = Number(el.dataset.c);
      el.setAttribute('stroke-dashoffset', String(c * (t.remaining / t.duration)));
    });
  }

  function completePhase() {
    const t = s.timer;
    t.running = false;
    stopTicking();
    if (t.phase === 'focus') {
      logFocus(phaseMinutes('focus'), t.subjectId);
      t.completedInCycle += 1;
      setPhase(t.completedInCycle % s.prefs.longEvery === 0 ? 'long' : 'short');
      t.prompt = 'focus';
    } else {
      setPhase('focus');
      t.prompt = 'break';
    }
    render();
  }

  function logFocus(minutes, subjectId) {
    const k = todayKey();
    const d = s.stats[k] || (s.stats[k] = { focus: 0, reviews: 0, correct: 0, bySubject: {} });
    d.focus += minutes;
    if (subjectId) d.bySubject[subjectId] = (d.bySubject[subjectId] || 0) + minutes;
  }

  function toggleTimer(subjectId) {
    const t = s.timer;
    if (!t.started && subjectId) t.subjectId = subjectId;
    t.prompt = null;
    t.started = true;
    t.running = !t.running;
    if (t.running) startTicking(); else stopTicking();
  }

  /* ----------------------------------------------------------- actions */

  const pageBlocks = () => s.pages[s.subjectId];
  const findBlock = (id) => pageBlocks()?.find((b) => b.id === id);

  function insertBlock(kind) {
    const sub = subjectById(s, s.subjectId);
    const blocks = pageBlocks();
    const ins = s.inserter;
    let block = null;
    let focus = null;
    switch (kind) {
      case 'text': block = { id: uid(), type: 'text', html: '' }; break;
      case 'heading': block = { id: uid(), type: 'heading', level: 2, text: '' }; break;
      case 'divider': block = { id: uid(), type: 'divider' }; break;
      case 'callout': block = { id: uid(), type: 'callout', tone: 'neutral', html: '' }; break;
      case 'checklist': block = { id: uid(), type: 'checklist', items: [{ id: uid(), text: '', done: false }] }; break;
      case 'tasks': block = { id: uid(), type: 'tasks' }; break;
      case 'pomodoro': block = { id: uid(), type: 'pomodoro' }; break;
      case 'statistics': block = { id: uid(), type: 'statistics' }; break;
      case 'flashcards': {
        let deck = s.decks.find((d) => d.subjectId === sub.id);
        if (!deck) {
          deck = { id: uid(), name: `${sub.name || 'Untitled'} cards`, subjectId: sub.id, cards: [] };
          s.decks.push(deck);
        }
        block = { id: uid(), type: 'flashcards', deckId: deck.id };
        focus = `[data-form="add-card"][data-deck="${deck.id}"] [name="front"]`;
        break;
      }
      case 'quiz': {
        const q = s.quizzes.find((x) => x.subjectId === sub.id);
        if (!q) return;
        block = { id: uid(), type: 'quiz', quizId: q.id };
        break;
      }
      default: return;
    }
    if (ins.replace) {
      const i = blocks.findIndex((b) => b.id === ins.replace);
      blocks.splice(i, 1, block);
    } else if (ins.anchor === 'end') {
      blocks.push(block);
    } else {
      const i = blocks.findIndex((b) => b.id === ins.anchor);
      blocks.splice(i + 1, 0, block);
    }
    s.inserter = null;
    if (kind === 'text' || kind === 'callout') focus = `[data-edit="text"][data-id="${block.id}"]`;
    if (kind === 'heading') focus = `[data-edit="heading"][data-id="${block.id}"]`;
    if (kind === 'checklist') focus = `[data-input="check-item"][data-item="${block.items[0].id}"]`;
    if (!focus) focus = '[data-input="trailing"]';
    render({ focus });
  }

  function openInserter(anchor, opts = {}) {
    s.blockMenu = null;
    s.inserter = { anchor, query: '', index: 0, ...opts };
    if (s.inserter.query) {
      const sub = subjectById(s, s.subjectId);
      s.inserter.index = Math.max(0, inserterItems(s, sub).findIndex((k) => !k.disabled));
    }
    render({ focus: '[data-input="inserter"]' });
    // Open upwards when there isn't room below the anchor inside the window.
    const menu = os.querySelector('.os-inserter');
    const main = os.querySelector('#os-main');
    if (menu && main) {
      const r = menu.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      if (r.bottom > m.bottom && r.top - m.top > r.height + 40) { s.inserter.up = true; menu.classList.add('is-up'); }
      else menu.scrollIntoView({ block: 'nearest' });
    }
  }

  function closeInserter(focusSel) {
    if (!s.inserter) return;
    s.inserter = null;
    render({ focus: focusSel || '[data-input="trailing"]' });
  }

  function openReview(deckId) {
    const decks = deckId ? [deckById(s, deckId)] : s.decks;
    const queue = decks.flatMap((d) => dueCards(d).map((c) => ({ deckId: d.id, cardId: c.id })));
    if (!queue.length) return;
    s.sheet = { type: 'review', deckId: deckId || null, queue, flipped: false, done: 0, counts: { again: 0, hard: 0, good: 0, easy: 0 } };
    s.popover = null;
    render({ focus: '[data-action="review-show"]' });
  }

  function rate(r) {
    const sh = s.sheet;
    if (!sh || sh.type !== 'review' || !sh.flipped || !sh.queue.length) return;
    const item = sh.queue.shift();
    const card = deckById(s, item.deckId).cards.find((c) => c.id === item.cardId);
    Object.assign(card, schedule(card, r));
    // "Again" brings the card back later in this session, as a learning step.
    if (r === 'again') sh.queue.push(item);
    sh.counts[r] += 1;
    sh.done += 1;
    sh.flipped = false;
    const k = todayKey();
    const d = s.stats[k] || (s.stats[k] = { focus: 0, reviews: 0, correct: 0, bySubject: {} });
    d.reviews += 1;
    if (r !== 'again') d.correct += 1;
    render({ focus: sh.queue.length ? '[data-action="review-show"]' : '.os-review-done [data-action="sheet-close"]' });
  }

  function openQuiz(id) {
    s.sheet = { type: 'quiz', quizId: id, i: 0, answers: [], correct: [], selected: null, finished: false };
    render({ focus: '.os-option, [data-input="quiz-short"]' });
  }

  function quizNext() {
    const sh = s.sheet;
    const q = quizById(s, sh.quizId);
    const qq = q.questions[sh.i];
    if (sh.selected == null || sh.selected === '') return;
    let ok;
    if (qq.type === 'short') ok = qq.accept.includes(String(sh.selected).trim().toLowerCase());
    else ok = sh.selected === qq.answer;
    sh.answers.push(sh.selected);
    sh.correct.push(ok);
    sh.selected = null;
    if (sh.i === q.questions.length - 1) {
      sh.finished = true;
      q.attempts.push(Math.round((sh.correct.filter(Boolean).length / q.questions.length) * 100));
      render({ focus: '.os-review-done .os-btn-primary' });
    } else {
      sh.i += 1;
      render({ focus: '.os-option, [data-input="quiz-short"]' });
    }
  }

  function closeSheet() {
    if (!s.sheet) return;
    s.sheet = null;
    render({ focus: '#os-main' });
  }

  function navigate(view, subjectId = null) {
    s.view = view;
    s.subjectId = subjectId;
    s.inserter = null;
    s.blockMenu = null;
    s.popover = null;
    if (narrow()) s.sidebarOpen = false;
    render();
    os.querySelector('#os-main')?.focus({ preventScroll: true });
  }

  const actions = {
    'nav': (el) => navigate(el.dataset.view),
    'open-subject': (el) => navigate('subject', el.dataset.id),
    'toggle-sidebar': () => update(() => { s.sidebarOpen = !s.sidebarOpen; }),
    'timer-toggle': (el) => update(() => toggleTimer(el.dataset.subject)),
    'timer-reset': () => update(() => {
      const t = s.timer; t.running = false; stopTicking(); t.prompt = null;
      t.remaining = t.duration;
      if (t.phase === 'focus') t.started = false;
    }),
    'timer-skip': () => update(() => {
      const t = s.timer; const wasRunning = t.running;
      t.prompt = null;
      if (t.phase === 'focus') setPhase((t.completedInCycle + 1) % s.prefs.longEvery === 0 ? 'long' : 'short');
      else setPhase('focus');
      t.started = true;
      t.running = wasRunning;
    }),
    'focus-mode': () => { s.focusMode = true; navigate('focus'); },
    'focus-exit': () => update(() => { s.focusMode = false; s.view = 'home'; }),
    'open-review': (el) => openReview(el.dataset.deck),
    'review-show': () => update(() => { s.sheet.flipped = true; }, { focus: '.os-rate.good' }),
    'review-rate': (el) => rate(el.dataset.r),
    'sheet-close': closeSheet,
    'sheet-backdrop': (el, e) => { if (e.target === el) closeSheet(); },
    'open-quiz': (el) => openQuiz(el.dataset.id),
    'quiz-select': (el) => update(() => {
      const v = el.dataset.v; s.sheet.selected = v === 'true' ? true : v === 'false' ? false : Number(v);
    }),
    'quiz-next': quizNext,
    'toggle-task': (el) => update(() => {
      const t = s.tasks.find((x) => x.id === el.dataset.id);
      t.done = !t.done; t.doneToday = t.done;
    }),
    'toggle-habit': (el) => update(() => {
      const h = s.habits.find((x) => x.id === el.dataset.id);
      const k = todayKey();
      if (h.done.has(k)) h.done.delete(k); else h.done.add(k);
    }),
    'tasks-filter': (el) => update(() => { s.tasksFilter = el.dataset.v; }),
    'stats-range': (el) => update(() => { s.statsRange = Number(el.dataset.v); }),
    'cal-move': (el) => update(() => {
      const d = new Date(s.calCursor.y, s.calCursor.m + Number(el.dataset.dir), 1);
      s.calCursor = { y: d.getFullYear(), m: d.getMonth() };
    }),
    'cal-today': () => update(() => {
      const d = new Date(); s.calCursor = { y: d.getFullYear(), m: d.getMonth() }; s.calSelected = todayKey();
    }),
    'cal-select': (el) => update(() => { s.calSelected = el.dataset.key; }),
    'pref': (el) => update(() => {
      const key = el.dataset.key;
      const limits = { focus: [5, 90], short: [1, 30], long: [5, 60], goal: [15, 480] };
      const [lo, hi] = limits[key];
      s.prefs[key] = Math.min(hi, Math.max(lo, s.prefs[key] + Number(el.dataset.delta)));
      const t = s.timer;
      if (!t.running && t.remaining === t.duration) setPhase(t.phase);
    }),
    'appearance': (el) => update(() => { s.appearance = el.dataset.v; }),
    'new-subject': () => update(() => {
      s.popover = s.popover ? null : { type: 'subject', name: '', color: 'teal', icon: 'book' };
    }, { focus: '[data-input="pop-name"]' }),
    'pop-color': (el) => update(() => { s.popover.color = el.dataset.v; }),
    'pop-icon': (el) => update(() => { s.popover.icon = el.dataset.v; }),
    'pop-cancel': () => update(() => { s.popover = null; }),
    'insert-after': (el) => openInserter(el.dataset.id),
    'insert-kind': (el) => insertBlock(el.dataset.kind),
    'block-menu': (el) => update(() => { s.blockMenu = s.blockMenu === el.dataset.id ? null : el.dataset.id; s.inserter = null; },
      { focus: `[data-action="block-menu"][data-id="${el.dataset.id}"]` }),
    'block-move': (el) => update(() => {
      const blocks = pageBlocks();
      const i = blocks.findIndex((b) => b.id === el.dataset.id);
      const j = i + Number(el.dataset.dir);
      if (j < 0 || j >= blocks.length) return;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      s.blockMenu = null;
    }),
    'block-width': (el) => update(() => {
      const b = findBlock(el.dataset.id); b.width = b.width === 'half' ? undefined : 'half'; s.blockMenu = null;
    }),
    'block-delete': (el) => update(() => {
      s.pages[s.subjectId] = pageBlocks().filter((b) => b.id !== el.dataset.id);
      s.blockMenu = null;
    }, { focus: '[data-input="trailing"]' }),
    'check-item': (el) => update(() => {
      const it = findBlock(el.dataset.id).items.find((x) => x.id === el.dataset.item);
      it.done = !it.done;
    }),
  };

  /* ------------------------------------------------------------ events */

  os.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    // Clicking outside an open menu closes it.
    if (s.blockMenu && !e.target.closest('.os-block-menu, [data-action="block-menu"]')) { s.blockMenu = null; if (!el) render(); }
    if (s.inserter && !e.target.closest('.os-inserter, [data-action="insert-after"]')) { s.inserter = null; if (!el) render(); }
    if (s.popover && !e.target.closest('.os-popover, [data-action="new-subject"]')) { s.popover = null; if (!el) render(); }
    if (!el || !os.contains(el) || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  os.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const data = new FormData(form);
    switch (form.dataset.form) {
      case 'add-task': {
        const title = String(data.get('title')).trim();
        if (!title) return;
        const due = data.get('due');
        s.tasks.push({ id: uid(), title, subjectId: data.get('subject') || null, due: due === '' ? null : dayAt(Number(due)), priority: null, done: false });
        if (s.tasksFilter === 'completed') s.tasksFilter = 'open';
        render({ focus: '[data-form="add-task"] [name="title"]' });
        break;
      }
      case 'add-subject-task': {
        const title = String(data.get('title')).trim();
        if (!title) return;
        s.tasks.push({ id: uid(), title, subjectId: form.dataset.subject, due: null, priority: null, done: false });
        render({ focus: `[data-form="add-subject-task"] [name="title"]` });
        break;
      }
      case 'add-card': {
        const front = String(data.get('front')).trim();
        const back = String(data.get('back')).trim();
        if (!front || !back) return;
        deckById(s, form.dataset.deck).cards.push(newCard(front, back));
        render({ focus: `[data-form="add-card"][data-deck="${form.dataset.deck}"] [name="front"]` });
        break;
      }
      case 'new-subject': {
        const p = s.popover;
        if (!p.name.trim()) return;
        const id = uid();
        s.subjects.push({ id, name: p.name.trim(), icon: p.icon, color: p.color });
        s.pages[id] = [];
        s.popover = null;
        s.view = 'subject'; s.subjectId = id;
        if (narrow()) s.sidebarOpen = false;
        render({ focus: '[data-input="trailing"]' });
        break;
      }
      default:
    }
  });

  os.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change === 'tasks-subject') update(() => { s.tasksSubject = el.value; });
    if (el.dataset.change === 'timer-subject') { s.timer.subjectId = el.value || null; }
  });

  os.addEventListener('input', (e) => {
    const el = e.target;
    const { input, edit } = el.dataset;
    if (edit === 'subject-name') {
      const sub = subjectById(s, el.dataset.id);
      sub.name = el.textContent.trim();
      const label = os.querySelector(`[data-subject-label="${sub.id}"]`);
      if (label) label.textContent = sub.name || 'Untitled';
      return;
    }
    if (edit === 'text') {
      const b = findBlock(el.dataset.id);
      const plain = el.textContent.replace(/\u00a0/g, ' ');
      // Markdown-style shortcuts at the start of a block, like the app.
      const m = b.type === 'text' && /^(#{1,3}) (.*)$/.exec(plain);
      if (m) {
        Object.assign(b, { type: 'heading', level: m[1].length, text: m[2] }); delete b.html;
        render({ focus: `[data-edit="heading"][data-id="${b.id}"]` });
        return;
      }
      const cm = b.type === 'text' && /^\[\] (.*)$/.exec(plain);
      if (cm) {
        const item = { id: uid(), text: cm[1], done: false };
        Object.assign(b, { type: 'checklist', items: [item] }); delete b.html;
        render({ focus: `[data-input="check-item"][data-item="${item.id}"]` });
        return;
      }
      b.html = el.innerHTML;
      return;
    }
    if (edit === 'heading') { findBlock(el.dataset.id).text = el.textContent; return; }
    if (input === 'check-item') {
      findBlock(el.dataset.id).items.find((x) => x.id === el.dataset.item).text = el.value;
      return;
    }
    if (input === 'trailing' && el.value.startsWith('/')) {
      const query = el.value.slice(1);
      el.value = '';
      openInserter('end', { query });
      return;
    }
    if (input === 'inserter') {
      s.inserter.query = el.value;
      s.inserter.index = 0;
      const sub = subjectById(s, s.subjectId);
      const firstEnabled = inserterItems(s, sub).findIndex((k) => !k.disabled);
      s.inserter.index = Math.max(0, firstEnabled);
      render({ focus: '[data-input="inserter"]' });
      return;
    }
    if (input === 'quiz-short') {
      const had = s.sheet.selected != null && s.sheet.selected !== '';
      s.sheet.selected = el.value;
      const has = el.value !== '';
      if (had !== has) render({ focus: '[data-input="quiz-short"]' });
      return;
    }
    if (input === 'pop-name') {
      s.popover.name = el.value;
      const btn = os.querySelector('.os-popover [type="submit"]');
      if (btn) btn.disabled = !el.value.trim();
    }
  });

  os.addEventListener('keydown', (e) => {
    const el = e.target;
    const { input, edit } = el.dataset || {};

    if (input === 'inserter') {
      const sub = subjectById(s, s.subjectId);
      const items = inserterItems(s, sub);
      const move = (dir) => {
        let i = s.inserter.index;
        for (let n = 0; n < items.length; n += 1) {
          i = (i + dir + items.length) % items.length;
          if (!items[i].disabled) break;
        }
        s.inserter.index = i;
        render({ focus: '[data-input="inserter"]' });
        os.querySelector('.os-inserter-item.is-active')?.scrollIntoView({ block: 'nearest' });
      };
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const k = items[s.inserter.index];
        if (k && !k.disabled) insertBlock(k.kind);
      } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeInserter(); }
      return;
    }

    if (input === 'trailing' && e.key === 'Enter') {
      e.preventDefault();
      const text = el.value.trim();
      if (!text) return;
      const block = { id: uid(), type: 'text', html: escapeHtml(text) };
      pageBlocks().push(block);
      render({ focus: `[data-edit="text"][data-id="${block.id}"]` });
      return;
    }

    if (edit === 'subject-name' && e.key === 'Enter') { e.preventDefault(); el.blur(); render(); return; }

    if (edit === 'text' || edit === 'heading') {
      const blocks = pageBlocks();
      const i = blocks.findIndex((b) => b.id === el.dataset.id);
      const b = blocks[i];
      if (e.key === '/' && b.type === 'text' && el.textContent === '') {
        e.preventDefault();
        openInserter(b.id, { replace: b.id });
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const nb = { id: uid(), type: 'text', html: '' };
        blocks.splice(i + 1, 0, nb);
        render({ focus: `[data-edit="text"][data-id="${nb.id}"]` });
        return;
      }
      if (e.key === 'Backspace' && el.textContent === '' && (b.type === 'text' || b.type === 'heading')) {
        e.preventDefault();
        blocks.splice(i, 1);
        const prev = blocks[i - 1];
        const sel = prev && (prev.type === 'text' || prev.type === 'callout') ? `[data-edit="text"][data-id="${prev.id}"]`
          : prev && prev.type === 'heading' ? `[data-edit="heading"][data-id="${prev.id}"]` : '[data-input="trailing"]';
        render({ focus: sel });
      }
      return;
    }

    if (input === 'check-item') {
      const b = findBlock(el.dataset.id);
      const idx = b.items.findIndex((x) => x.id === el.dataset.item);
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = { id: uid(), text: '', done: false };
        b.items.splice(idx + 1, 0, it);
        render({ focus: `[data-input="check-item"][data-item="${it.id}"]` });
      } else if (e.key === 'Backspace' && el.value === '' && b.items.length > 1) {
        e.preventDefault();
        b.items.splice(idx, 1);
        const prev = b.items[Math.max(0, idx - 1)];
        render({ focus: `[data-input="check-item"][data-item="${prev.id}"]` });
      }
      return;
    }

    if (input === 'quiz-short' && e.key === 'Enter') { e.preventDefault(); quizNext(); return; }

    if (e.key === 'Escape') {
      if (s.sheet) { e.preventDefault(); closeSheet(); return; }
      if (s.popover) { e.preventDefault(); update(() => { s.popover = null; }, { focus: '[data-action="new-subject"]' }); return; }
      if (s.blockMenu) { e.preventDefault(); const id = s.blockMenu; update(() => { s.blockMenu = null; }, { focus: `[data-action="block-menu"][data-id="${id}"]` }); return; }
      if (s.focusMode) { e.preventDefault(); actions['focus-exit'](); }
    }
  });

  // Review and quiz shortcuts, only while a sheet is open and focus is inside the demo.
  document.addEventListener('keydown', (e) => {
    if (!s.sheet || e.metaKey || e.ctrlKey || e.altKey) return;
    const inField = e.target.matches?.('input, textarea, [contenteditable="true"]');
    if (s.sheet.type === 'review') {
      if (e.key === ' ' && !s.sheet.flipped && s.sheet.queue.length) { e.preventDefault(); actions['review-show'](); }
      else if (/^[1-4]$/.test(e.key) && s.sheet.flipped) { e.preventDefault(); rate(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]); }
      else if (e.key === 'Escape' && !os.contains(e.target)) closeSheet();
    } else if (s.sheet.type === 'quiz' && !inField && !s.sheet.finished) {
      const q = quizById(s, s.sheet.quizId).questions[s.sheet.i];
      const n = q.type === 'mc' ? q.options.length : q.type === 'tf' ? 2 : 0;
      const i = 'abcd'.indexOf(e.key.toLowerCase());
      if (i >= 0 && i < n) {
        e.preventDefault();
        s.sheet.selected = q.type === 'tf' ? i === 0 : i;
        render({ focus: `[data-action="quiz-select"][data-v="${q.type === 'tf' ? String(i === 0) : i}"]` });
      } else if (e.key === 'Enter' && e.target === document.body) { quizNext(); }
    }
  });

  // Paste into notes as plain text, so pasted markup never ends up in the page.
  os.addEventListener('paste', (e) => {
    if (!e.target.closest?.('[contenteditable="true"]')) return;
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  });

  // Keep focus inside an open sheet.
  os.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!s.sheet) return;
      const sheet = os.querySelector('.os-sheet');
      if (sheet && !sheet.contains(document.activeElement) && os.contains(document.activeElement)) {
        sheet.querySelector('button, input')?.focus();
      }
    });
  });

  // Re-render subject title changes in other places once editing ends.
  os.addEventListener('focusout', (e) => {
    if (e.target.dataset?.edit === 'subject-name') {
      const sub = subjectById(s, e.target.dataset.id);
      if (sub && !sub.name) sub.name = 'Untitled';
    }
  });

  // Day rollover / greeting freshness is handled on each render; keep the narrow layout sensible on resize.
  let wasNarrow = narrow();
  new ResizeObserver(() => {
    const n = narrow();
    if (n !== wasNarrow) { wasNarrow = n; s.sidebarOpen = !n; render(); }
  }).observe(root);

  render();

  return {
    reset() {
      stopTicking();
      s = createInitialState();
      if (narrow()) s.sidebarOpen = false;
      lastViewKey = '';
      prevOpen = {};
      render();
    },
  };
}

function escapeHtml(t) {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

