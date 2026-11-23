// Small interactive vignettes for the Features section. Each one isolates a
// single interaction from the app so it can be tried in place.

import { icon, esc, BLOCK_KINDS, filterBlockKinds, mmss, prefersReducedMotion } from './demo/ui.js';
import { preview, describeInterval, RATINGS, RATING_LABEL, newCard } from './demo/sm2.js';

/* ------------------------------------------------------ blocks & pages */

export function blocksVignette(el) {
  const blocks = [
    { kind: 'heading', label: 'Reaction mechanisms' },
    { kind: 'text', label: 'Lecture notes' },
  ];
  let query = '';
  let active = 0;
  let fresh = null;

  const kindOf = (k) => BLOCK_KINDS.find((b) => b.kind === k);

  function paint(focusSearch = false) {
    const items = filterBlockKinds(query);
    active = Math.min(active, Math.max(0, items.length - 1));
    el.innerHTML = `<div class="fx">
      <div class="fx-panel fx-page">
        <div class="fx-page-title">${icon('flask')}<span>Chemistry</span></div>
        <div class="fx-page-blocks" aria-live="polite">
          ${blocks.map((b) => `<div class="fx-page-block ${b === fresh ? 'is-new' : ''}">${icon(kindOf(b.kind).icon)}${esc(b.label)}<span>${kindOf(b.kind).name}</span></div>`).join('')}
        </div>
        <div class="fx-slash">${icon('plus')}Type / for blocks</div>
      </div>
      <div class="fx-panel fx-menu">
        <label class="fx-menu-search">${icon('search')}
          <input type="text" value="${esc(query)}" placeholder="Search blocks — try “quiz” or “timer”" aria-label="Search blocks" autocomplete="off"
            role="combobox" aria-expanded="true" aria-controls="fx-blocks-list">
        </label>
        <div class="fx-menu-list" id="fx-blocks-list" role="listbox" aria-label="Block types">
          ${items.length ? items.map((b, i) => `<button class="fx-menu-item ${i === active ? 'is-active' : ''}" role="option" aria-selected="${i === active}" data-kind="${b.kind}" tabindex="-1">
            <span class="fx-menu-icon">${icon(b.icon)}</span><span><b>${b.name}</b><small>${b.sub}</small></span>
          </button>`).join('') : `<p class="fx-menu-none">No blocks match “${esc(query)}”</p>`}
        </div>
      </div>
      <p class="fx-hint">Pick a block to add it to the page.</p>
    </div>`;
    if (focusSearch) {
      const input = el.querySelector('input');
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function add(kind) {
    const k = kindOf(kind);
    const labels = { text: 'New note', heading: 'New section', divider: '—', callout: 'Key idea', checklist: 'Before the exam',
      tasks: 'Chemistry tasks', flashcards: 'Functional groups', pdf: 'Lecture 6 slides.pdf', pomodoro: '25-minute focus',
      statistics: 'This week', quiz: 'Practice test' };
    fresh = { kind, label: labels[kind] || k.name };
    blocks.push(fresh);
    if (blocks.length > 5) blocks.splice(2, 1);
    query = '';
    active = 0;
    paint(true);
  }

  el.addEventListener('input', (e) => { if (e.target.matches('input')) { query = e.target.value; active = 0; fresh = null; paint(true); } });
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) add(b.dataset.kind); });
  el.addEventListener('keydown', (e) => {
    if (!e.target.matches('input')) return;
    const items = filterBlockKinds(query);
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paint(true); scrollActive(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(true); scrollActive(); }
    if (e.key === 'Enter' && items[active]) { e.preventDefault(); add(items[active].kind); }
  });
  const scrollActive = () => el.querySelector('.fx-menu-item.is-active')?.scrollIntoView({ block: 'nearest' });
  paint();
}

/* ----------------------------------------------------------- flashcards */

export function cardsVignette(el) {
  const deck = [
    newCard('State Newton’s second law.', 'F = ma: force equals mass times acceleration.', { repetitions: 2, intervalDays: 6 }),
    newCard('Who wrote Pride and Prejudice?', 'Jane Austen, published in 1813.'),
    newCard('What does “je me souviens” mean?', '“I remember.”', { repetitions: 3, intervalDays: 15 }),
  ];
  let i = 0;
  let flipped = false;
  let toast = null;
  let timer = null;

  function paint(focusSel) {
    const card = deck[i];
    el.innerHTML = `<div class="fx">
      <div class="fx-card-meta"><span>Card ${i + 1} of ${deck.length}</span><span>${card.repetitions ? `Reviewed ${card.repetitions}×` : 'New card'}</span></div>
      <div class="fx-card-wrap">
        <div class="fx-card ${flipped ? 'is-flipped' : ''}" role="button" tabindex="0" aria-label="${flipped ? 'Answer shown' : 'Show answer'}" data-flip>
          <div class="fx-card-face fx-panel" aria-hidden="${flipped}"><span class="fx-label">Question</span>${esc(card.front)}</div>
          <div class="fx-card-face fx-card-back fx-panel" aria-hidden="${!flipped}"><span class="fx-label">Answer</span>${esc(card.back)}<small>How well did you know it?</small></div>
        </div>
      </div>
      <div class="fx-ratings" aria-live="polite">
        ${toast ? `<div class="fx-toast">${toast}</div>`
          : flipped ? RATINGS.map((r) => `<button class="fx-rate" data-r="${r}">${RATING_LABEL[r]}<small>${preview(card, r)}</small></button>`).join('')
            : '<button class="fx-show" data-flip>Show answer <kbd>Space</kbd></button>'}
      </div>
    </div>`;
    if (focusSel) el.querySelector(focusSel)?.focus({ preventScroll: true });
  }

  function flip() { if (!flipped && !toast) { flipped = true; paint('.fx-rate[data-r="good"]'); } }

  function rate(r) {
    const card = deck[i];
    toast = `<span><b style="font-weight:600;color:var(--text)">${RATING_LABEL[r]}.</b> You’ll see this card ${describeInterval(card, r)}.</span>`;
    paint();
    clearTimeout(timer);
    timer = setTimeout(() => {
      i = (i + 1) % deck.length; flipped = false; toast = null;
      paint(el.contains(document.activeElement) ? '.fx-show' : null);
    }, prefersReducedMotion() ? 1200 : 1700);
  }

  el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-r]');
    if (r) return rate(r.dataset.r);
    if (e.target.closest('[data-flip]')) flip();
  });
  el.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && e.target.matches('.fx-card')) { e.preventDefault(); flip(); }
    if (/^[1-4]$/.test(e.key) && flipped && !toast) { e.preventDefault(); rate(RATINGS[Number(e.key) - 1]); }
  });
  paint();
}

/* ---------------------------------------------------------- focus timer */

export function focusVignette(el) {
  const FOCUS = 25 * 60;
  const SPEED = 60; // one real second shows one minute passing
  const week = [40, 95, 60, 120, 30, 75, 50];
  const days = Array.from({ length: 7 }, (_, n) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + n);
    return d.toLocaleDateString(undefined, { weekday: 'narrow' });
  });
  const goal = 120;
  let remaining = FOCUS;
  let running = false;
  let handle = null;
  let sessions = 0;

  const R = 80;
  const C = 2 * Math.PI * R;

  function paint() {
    const today = week[6];
    const max = Math.max(...week, goal);
    el.innerHTML = `<div class="fx"><div class="fx-panel fx-focus">
      <div class="fx-ring">
        <svg viewBox="0 0 168 168" aria-hidden="true"><circle class="track" cx="84" cy="84" r="${R}"/>
          <circle class="prog" cx="84" cy="84" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (remaining / FOCUS)}"/></svg>
        <div class="fx-ring-text"><span class="fx-label">Focus</span><b data-time>${mmss(remaining)}</b></div>
      </div>
      <div class="fx-focus-controls">
        <button class="btn btn-primary btn-sm" data-act="toggle">${icon(running ? 'pause' : 'play')}${running ? 'Pause' : remaining < FOCUS ? 'Resume' : 'Start focus'}</button>
        <button class="btn btn-ghost btn-sm" data-act="reset" ${remaining === FOCUS ? 'disabled' : ''} aria-label="Reset timer">${icon('reset')}</button>
      </div>
      <div class="fx-goal">
        <div class="fx-goal-row"><span class="fx-label">Today</span><span><b>${today}</b> of ${goal} min</span></div>
        <div class="fx-bar"><i style="width:${Math.min(100, (today / goal) * 100)}%"></i></div>
        <div class="fx-week" aria-label="Focus minutes this week">
          ${week.map((m, n) => `<div class="${n === 6 ? 'is-today' : ''}"><i style="height:${(m / max) * 100}%" title="${m} min"></i><small>${days[n]}</small></div>`).join('')}
        </div>
      </div>
    </div>
    <p class="fx-hint" aria-live="polite">${sessions ? `Session logged: +25 minutes today.` : 'This preview runs 60× faster than the real timer.'}</p></div>`;
  }

  function tick() {
    remaining = Math.max(0, remaining - SPEED / 4);
    if (remaining === 0) {
      clearInterval(handle); running = false; sessions += 1;
      week[6] += 25; remaining = FOCUS;
      paint();
      el.querySelector('[data-act="toggle"]')?.focus({ preventScroll: true });
      return;
    }
    const t = el.querySelector('[data-time]');
    const p = el.querySelector('.prog');
    if (t) t.textContent = mmss(remaining);
    if (p) p.setAttribute('stroke-dashoffset', String(C * (remaining / FOCUS)));
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'toggle') {
      running = !running;
      clearInterval(handle);
      if (running) handle = setInterval(tick, 250);
    } else {
      running = false; clearInterval(handle); remaining = FOCUS;
    }
    paint();
    el.querySelector(`[data-act="${b.dataset.act === 'reset' ? 'toggle' : b.dataset.act}"]`)?.focus({ preventScroll: true });
  });
  paint();
}

/* ------------------------------------------------------------------ pdf */

export function pdfVignette(el) {
  const sentences = [
    'Photosynthesis converts light energy into chemical energy stored in glucose.',
    'It happens in two stages: the light-dependent reactions and the Calvin cycle.',
    'The light-dependent reactions take place in the thylakoid membranes and release oxygen.',
    'The Calvin cycle uses ATP and NADPH to fix carbon dioxide in the stroma.',
    'Rubisco, the enzyme that fixes CO₂, is thought to be the most abundant protein on Earth.',
  ];
  const marked = new Set([2]);
  let mode = true;
  let fresh = null;

  function paint(focusIdx) {
    const list = [...marked].sort((a, b) => a - b);
    el.innerHTML = `<div class="fx"><div class="fx-panel fx-pdf ${mode ? 'is-highlighting' : ''}">
      <div class="fx-pdf-bar">${icon('doc')}<span>lecture-6-photosynthesis.pdf</span><span class="sp"></span>
        <button class="fx-tool ${mode ? 'is-on' : ''}" data-act="mode" aria-pressed="${mode}">${icon('highlight')}Highlight</button>
      </div>
      <div class="fx-pdf-page">
        <h4>6.2 · Photosynthesis</h4>
        <p>${sentences.map((t, n) => `<span class="fx-sent ${marked.has(n) ? 'is-marked' : ''}" data-n="${n}" ${mode ? `role="button" tabindex="0" aria-pressed="${marked.has(n)}"` : ''}>${esc(t)}</span>`).join(' ')}</p>
      </div>
      <div class="fx-annots">
        <span class="fx-label">Annotations · ${list.length}</span>
        ${list.length ? `<ul>${list.map((n) => `<li class="${n === fresh ? 'is-new' : ''}">${esc(sentences[n])}</li>`).join('')}</ul>` : '<p>No highlights yet.</p>'}
      </div>
    </div>
    <p class="fx-hint">${mode ? 'Click a sentence to highlight it — click again to remove.' : 'Turn on Highlight to mark up the page.'}</p></div>`;
    if (focusIdx != null) el.querySelector(`.fx-sent[data-n="${focusIdx}"]`)?.focus({ preventScroll: true });
  }

  function toggle(n) {
    if (!mode) return;
    if (marked.has(n)) { marked.delete(n); fresh = null; } else { marked.add(n); fresh = n; }
    paint(n);
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="mode"]')) {
      mode = !mode; fresh = null; paint();
      el.querySelector('[data-act="mode"]')?.focus({ preventScroll: true });
      return;
    }
    const s = e.target.closest('.fx-sent');
    if (s) toggle(Number(s.dataset.n));
  });
  el.addEventListener('keydown', (e) => {
    const s = e.target.closest?.('.fx-sent');
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(Number(s.dataset.n)); }
  });
  paint();
}
