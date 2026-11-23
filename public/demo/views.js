// Render functions for each screen of the demo. They return HTML strings;
// interaction is wired up by event delegation in app.js via data-action.

import { icon, esc, SUBJECT_COLORS, filterBlockKinds, mmss } from './ui.js';
import { preview, RATINGS, RATING_LABEL } from './sm2.js';
import { dayKey, keyToTime, daysBetween } from './data.js';
import {
  subjectById, deckById, quizById, dueCards, totalDue, subjectDue, dayStats, focusToday,
  streak, taskGroup, GROUP_LABEL, dueLabel, habitStreak, lastNDays, greeting, calendarItems,
  formatMinutes, todayKey,
} from './selectors.js';

const sc = (s, id) => { const sub = subjectById(s, id); return sub ? SUBJECT_COLORS[sub.color] : 'var(--c-text-3)'; };
const PHASE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

/* ---------------------------------------------------------------- shell */

export function renderApp(s) {
  return `
    <div class="os-strip">
      <div class="os-lights" aria-hidden="true"><span></span><span></span><span></span></div>
      ${!s.sidebarOpen && !s.focusMode ? `<button class="os-icon-btn" data-action="toggle-sidebar" title="Show sidebar" aria-label="Show sidebar">${icon('sidebar')}</button>` : ''}
      <div class="os-strip-spacer"></div>
      ${renderPill(s)}
    </div>
    <div class="os-body">
      ${s.focusMode ? '' : renderSidebar(s)}
      ${s.focusMode ? '' : '<button class="os-scrim" data-action="toggle-sidebar" aria-label="Hide sidebar" tabindex="-1"></button>'}
      <div class="os-card">
        <div class="os-main" id="os-main" tabindex="-1">${renderView(s)}</div>
      </div>
      ${s.popover?.type === 'subject' ? renderSubjectPopover(s) : ''}
    </div>
    ${s.sheet ? renderSheet(s) : ''}`;
}

function renderPill(s) {
  const t = s.timer;
  if (!t.started || s.focusMode) return '';
  return `<button class="os-pill" data-action="nav" data-view="focus" aria-label="Timer: ${PHASE_LABEL[t.phase]}, open Focus">
    <span class="os-dot ${t.phase === 'focus' ? '' : 'is-break'}"></span>
    <b data-timer="time">${mmss(t.remaining)}</b>
    <span>${t.running ? PHASE_LABEL[t.phase] : 'Paused'}</span>
  </button>`;
}

function renderSidebar(s) {
  const navItem = (view, label, ic, extra = '') => `
    <button class="os-row ${s.view === view ? 'is-active' : ''}" data-action="nav" data-view="${view}" ${s.view === view ? 'aria-current="page"' : ''}>
      ${icon(ic)}<span class="os-row-label">${label}</span>${extra}
    </button>`;
  const due = totalDue(s);
  const st = streak(s);
  return `
  <aside class="os-sidebar" aria-label="Sidebar">
    <div class="os-sidebar-inner">
      <div class="os-brand">${icon('books')}<span>Open Study</span>
        <button class="os-icon-btn" data-action="toggle-sidebar" title="Hide sidebar" aria-label="Hide sidebar">${icon('sidebar')}</button>
      </div>
      <div class="os-scroll-side">
        <nav class="os-nav" aria-label="Sections">
          ${navItem('home', 'Home', 'home')}
          ${navItem('calendar', 'Calendar', 'calendar')}
          ${navItem('tasks', 'Tasks', 'tasks')}
          ${navItem('flashcards', 'Flashcards', 'cards', due ? `<span class="os-badge">${due}</span>` : '')}
          ${navItem('statistics', 'Statistics', 'chart')}
          ${navItem('focus', 'Focus', 'timer')}
        </nav>
        <div class="os-side-label"><span class="os-label">Subjects</span>
          <button class="os-icon-btn sm" data-action="new-subject" title="New subject" aria-label="New subject">${icon('plus')}</button>
        </div>
        <nav class="os-nav" aria-label="Subjects">
          ${s.subjects.map((sub) => {
            const active = s.view === 'subject' && s.subjectId === sub.id;
            const n = subjectDue(s, sub.id);
            return `<button class="os-row ${active ? 'is-active' : ''}" data-action="open-subject" data-id="${sub.id}" ${active ? 'aria-current="page"' : ''}>
              <span style="color:${SUBJECT_COLORS[sub.color]}; display:flex">${icon(sub.icon)}</span>
              <span class="os-row-label" data-subject-label="${sub.id}">${esc(sub.name) || 'Untitled'}</span>
              ${n ? `<span class="os-row-count">${n}</span>` : ''}
            </button>`;
          }).join('')}
        </nav>
      </div>
      <div class="os-side-foot">
        ${navItem('settings', 'Settings', 'gear')}
        ${st ? `<p class="os-streak">${st}-day streak</p>` : ''}
      </div>
    </div>
  </aside>`;
}

function renderView(s) {
  switch (s.view) {
    case 'home': return renderHome(s);
    case 'calendar': return renderCalendar(s);
    case 'tasks': return renderTasks(s);
    case 'flashcards': return renderFlashcards(s);
    case 'statistics': return renderStatistics(s);
    case 'focus': return renderFocus(s);
    case 'settings': return renderSettings(s);
    case 'subject': return renderSubject(s);
    default: return '';
  }
}

const pageHeader = (title, subtitle) => `
  <h1 class="os-title os-serif">${title}</h1>
  ${subtitle ? `<p class="os-subtitle">${subtitle}</p>` : ''}`;

function ring(size, stroke, progressStroke, s) {
  const r = (size - progressStroke) / 2;
  const c = 2 * Math.PI * r;
  const p = s.timer.duration ? 1 - s.timer.remaining / s.timer.duration : 0;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
    <circle class="prog" data-timer="ring" data-c="${c}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${progressStroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
  </svg>`;
}

const checkbox = (checked, action, attrs, label, square = false) => `
  <button class="os-check ${square ? 'sq' : ''}" role="checkbox" aria-checked="${checked}" aria-label="${esc(label)}" data-action="${action}" ${attrs}>${icon('check')}</button>`;

function subjectChip(s, id) {
  const sub = subjectById(s, id);
  if (!sub) return '';
  return `<span class="os-chip"><span class="os-sdot" style="--sc:${SUBJECT_COLORS[sub.color]}"></span>${esc(sub.name)}</span>`;
}

/* ----------------------------------------------------------------- home */

function renderHome(s) {
  const t = s.timer;
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const due = totalDue(s);
  const todays = s.tasks.filter((x) => !x.done && (taskGroup(x) === 'today' || taskGroup(x) === 'overdue'))
    .concat(s.tasks.filter((x) => x.done && x.doneToday));
  const upNext = s.tasks.filter((x) => !x.done && taskGroup(x) === 'upcoming').sort((a, b) => a.due - b.due).slice(0, 3);
  const exams = s.exams.filter((e) => daysBetween(Date.now(), e.date) >= 0).sort((a, b) => a.date - b.date).slice(0, 3);
  const days7 = lastNDays(7);

  const hero = t.started ? `
    <div>
      <p class="os-label os-hero-label">${PHASE_LABEL[t.phase]}</p>
      <div class="os-hero-time os-serif os-num" data-timer="time">${mmss(t.remaining)}</div>
      ${subjectById(s, t.subjectId) ? `<p>${esc(subjectById(s, t.subjectId).name)}</p>` : ''}
      <div class="os-hero-actions">
        <button class="os-hero-btn" data-action="timer-toggle">${icon(t.running ? 'pause' : 'play')}${t.running ? 'Pause' : 'Resume'}</button>
        <button class="os-hero-btn is-outline" data-action="focus-mode">Focus mode</button>
      </div>
    </div>
    <div class="os-ring os-hero-ring-wrap" style="width:92px;height:92px">
      <svg class="os-hero-ring" viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="44" stroke-width="2" style="opacity:.15"/>
        <circle data-timer="ring" data-c="${2 * Math.PI * 44}" cx="46" cy="46" r="44" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="${2 * Math.PI * 44}" stroke-dashoffset="${2 * Math.PI * 44 * (t.remaining / t.duration)}"/>
      </svg>
    </div>` : `
    <div>
      <h2 class="os-serif">Ready to focus?</h2>
      <p>Start a ${s.prefs.focus}-minute session. Your time is tracked automatically.</p>
      <div class="os-hero-actions">
        <button class="os-hero-btn" data-action="timer-toggle">${icon('play')}Start focus</button>
        <button class="os-hero-btn is-outline" data-action="focus-mode">Focus mode</button>
      </div>
    </div>`;

  return `<div class="os-page">
    ${pageHeader(greeting(), date)}
    <div class="os-home-top">
      <section class="os-hero" aria-label="Focus">${hero}</section>
      <div class="os-tile os-tiles">
        <div class="os-stat"><b>${focusToday(s)}</b><span>of ${s.prefs.goal} min today</span></div>
        <div class="os-stat"><b>${due}</b><span>card${due === 1 ? '' : 's'} due</span></div>
        <div class="os-stat"><b>${streak(s)}</b><span>day streak</span></div>
      </div>
    </div>
    <div class="os-home-grid">
      <div class="os-home-col">
        <section>
          <div class="os-section-head"><span class="os-label">Today</span>
            <button class="os-btn os-btn-ghost sm" data-action="nav" data-view="tasks">All tasks</button></div>
          ${todays.length ? todays.map((x) => taskRow(s, x, false)).join('') : '<p class="os-hint">Nothing due today.</p>'}
        </section>
        ${upNext.length ? `<section>
          <div class="os-section-head"><span class="os-label">Up next</span></div>
          ${upNext.map((x) => taskRow(s, x, false)).join('')}
        </section>` : ''}
        <section>
          <div class="os-section-head"><span class="os-label">Habits</span></div>
          ${s.habits.map((h) => {
            const done = h.done.has(todayKey());
            const n = habitStreak(h);
            return `<div class="os-list-row">
              ${checkbox(done, 'toggle-habit', `data-id="${h.id}"`, `${h.name}, done today`)}
              <span class="os-list-title">${esc(h.name)}</span>
              <span class="os-habit-strip" aria-label="Last 7 days">${days7.map((k) => `<i class="${h.done.has(k) ? 'is-on' : ''}"></i>`).join('')}</span>
              <span class="os-row-count" style="min-width:52px;text-align:right">${n} day${n === 1 ? '' : 's'}</span>
            </div>`;
          }).join('')}
        </section>
      </div>
      <div class="os-home-col">
        <section>
          <div class="os-section-head"><span class="os-label">Flashcards</span></div>
          ${due ? `<div class="os-panel os-review-card">
            <div><b>${due} card${due === 1 ? '' : 's'} ready for review</b><small>A few minutes now keeps them fresh.</small></div>
            <button class="os-btn os-btn-secondary" data-action="open-review">Review</button>
          </div>` : '<p class="os-hint">All caught up. New reviews appear here when cards are due.</p>'}
        </section>
        <section>
          <div class="os-section-head"><span class="os-label">Upcoming exams</span>
            <button class="os-btn os-btn-ghost sm" data-action="nav" data-view="calendar">Calendar</button></div>
          ${exams.map((e) => countdown(s, e)).join('')}
        </section>
      </div>
    </div>
    <section style="margin-top:32px">
      <div class="os-section-head"><span class="os-label">Subjects</span></div>
      <div class="os-subject-grid">
        ${s.subjects.map((sub) => {
          const n = subjectDue(s, sub.id);
          return `<button class="os-subject-card" style="--sc:${SUBJECT_COLORS[sub.color]}" data-action="open-subject" data-id="${sub.id}">
            ${icon(sub.icon)}<b>${esc(sub.name) || 'Untitled'}</b><small>${n ? `${n} cards due` : 'Open page'}</small>
          </button>`;
        }).join('')}
      </div>
    </section>
  </div>`;
}

function countdown(s, e) {
  const d = daysBetween(Date.now(), e.date);
  return `<div class="os-countdown">
    <div class="os-stat"><b>${d}</b><span>${d === 1 ? 'day' : 'days'}</span></div>
    <div><div>${esc(e.title)}</div><small class="os-hint">${new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</small></div>
  </div>`;
}

function taskRow(s, x, showSubject = true) {
  const g = taskGroup(x);
  return `<div class="os-list-row os-task-row ${x.done ? 'is-done' : ''}">
    ${checkbox(x.done, 'toggle-task', `data-id="${x.id}"`, x.title)}
    <span class="os-list-title">${esc(x.title)}</span>
    <span class="os-task-meta">
      ${showSubject ? subjectChip(s, x.subjectId) : `<span class="os-sdot" style="--sc:${sc(s, x.subjectId)}" title="${esc(subjectById(s, x.subjectId)?.name || '')}"></span>`}
      ${x.due != null ? `<span class="os-chip ${!x.done && g === 'overdue' ? 'is-danger' : ''}">${dueLabel(x.due)}</span>` : ''}
      ${x.priority ? `<span class="os-flag ${x.priority}" title="${x.priority} priority">${icon('flag')}</span>` : ''}
    </span>
  </div>`;
}

/* ---------------------------------------------------------------- tasks */

function renderTasks(s) {
  let list = s.tasks.slice();
  if (s.tasksFilter === 'open') list = list.filter((x) => !x.done);
  if (s.tasksFilter === 'completed') list = list.filter((x) => x.done);
  if (s.tasksSubject !== 'all') list = list.filter((x) => x.subjectId === s.tasksSubject);
  const groups = ['overdue', 'today', 'upcoming', 'none']
    .map((g) => ({ g, items: list.filter((x) => taskGroup(x) === g).sort((a, b) => (a.due ?? 0) - (b.due ?? 0)) }))
    .filter((x) => x.items.length);
  const open = s.tasks.filter((x) => !x.done).length;

  return `<div class="os-page">
    ${pageHeader('Tasks', `${open} open task${open === 1 ? '' : 's'}`)}
    <form class="os-add-task" data-form="add-task">
      <input class="os-field" name="title" placeholder="Add a task…" aria-label="Task title" autocomplete="off" required>
      <select class="os-field" name="subject" aria-label="Subject">
        <option value="">No subject</option>
        ${s.subjects.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}
      </select>
      <select class="os-field" name="due" aria-label="Due date">
        <option value="0">Today</option><option value="1">Tomorrow</option><option value="7">Next week</option><option value="">No date</option>
      </select>
      <button class="os-btn os-btn-primary" type="submit">${icon('plus')}Add</button>
    </form>
    <div class="os-toolbar">
      <div class="os-seg" role="group" aria-label="Show">
        ${[['open', 'Open'], ['completed', 'Completed'], ['all', 'All']].map(([v, l]) =>
          `<button aria-pressed="${s.tasksFilter === v}" data-action="tasks-filter" data-v="${v}">${l}</button>`).join('')}
      </div>
      <select class="os-field" data-change="tasks-subject" aria-label="Filter by subject" style="height:28px">
        <option value="all">All subjects</option>
        ${s.subjects.map((x) => `<option value="${x.id}" ${s.tasksSubject === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
    </div>
    ${groups.length ? `<div class="os-panel os-task-card">
      ${groups.map(({ g, items }) => `<div class="os-task-group">
        <div class="os-label" style="${g === 'overdue' ? 'color:var(--c-danger)' : ''}">${GROUP_LABEL[g]}</div>
        ${items.map((x) => taskRow(s, x)).join('')}
      </div>`).join('')}
    </div>` : emptyState('tasks', s.tasksFilter === 'completed' ? 'Nothing completed yet' : 'All clear',
      s.tasksFilter === 'completed' ? 'Tick off a task and it will show up here.' : 'No open tasks here. Add one above, or from a subject page.')}
  </div>`;
}

function emptyState(ic, title, text, button = '') {
  return `<div class="os-empty"><div class="os-empty-disc">${icon(ic)}</div><h3>${title}</h3><p>${text}</p>${button}</div>`;
}

/* ----------------------------------------------------------- flashcards */

function renderFlashcards(s) {
  const due = totalDue(s);
  const cards = s.decks.reduce((n, d) => n + d.cards.length, 0);
  return `<div class="os-page">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>${pageHeader('Flashcards', `${s.decks.length} decks · ${cards} cards`)}</div>
      <button class="os-btn os-btn-primary" data-action="open-review" ${due ? '' : 'disabled'}>${icon('play')}Review all due${due ? ` (${due})` : ''}</button>
    </div>
    <div class="os-deck-grid">
      ${s.decks.map((d) => {
        const n = dueCards(d).length;
        return `<div class="os-panel os-deck">
          <b>${esc(d.name)}</b>
          <div>${subjectChip(s, d.subjectId)}</div>
          <div class="os-deck-foot">
            <span class="os-muted">${d.cards.length} cards${n ? ` · <span class="os-due">${n} due</span>` : ''}</span>
            <button class="os-btn os-btn-secondary sm" data-action="open-review" data-deck="${d.id}" ${n ? '' : 'disabled'}>Review</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ----------------------------------------------------------- statistics */

function renderStatistics(s) {
  const n = s.statsRange;
  const keys = lastNDays(n);
  const days = keys.map((k) => dayStats(s, k));
  const focus = days.reduce((a, d) => a + d.focus, 0);
  const reviews = days.reduce((a, d) => a + d.reviews, 0);
  const correct = days.reduce((a, d) => a + d.correct, 0);
  const activeDays = days.filter((d) => d.focus || d.reviews).length;
  const maxF = Math.max(60, ...days.map((d) => d.focus));
  const maxR = Math.max(10, ...days.map((d) => d.reviews));
  const bySub = {};
  days.forEach((d) => Object.entries(d.bySubject).forEach(([k, v]) => { bySub[k] = (bySub[k] || 0) + v; }));
  const subRows = Object.entries(bySub).sort((a, b) => b[1] - a[1]);
  const maxSub = Math.max(1, ...subRows.map((r) => r[1]));
  const fmtDay = (k) => new Date(keyToTime(k)).toLocaleDateString(undefined, n === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' });
  const heatKeys = lastNDays(91);
  const level = (k) => { const f = dayStats(s, k).focus; return f === 0 ? 0 : f < 30 ? 1 : f < 60 ? 2 : f < 90 ? 3 : 4; };

  return `<div class="os-page">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>${pageHeader('Statistics', 'Your study activity')}</div>
      <div class="os-seg" role="group" aria-label="Range">
        ${[7, 30, 90].map((v) => `<button aria-pressed="${n === v}" data-action="stats-range" data-v="${v}">${v} days</button>`).join('')}
      </div>
    </div>
    <div class="os-kpis">
      <div class="os-tile"><div class="os-stat"><b>${formatMinutes(focus)}</b></div><span>Study time</span></div>
      <div class="os-tile"><div class="os-stat"><b>${reviews}</b></div><span>Cards reviewed</span></div>
      <div class="os-tile"><div class="os-stat"><b>${reviews ? Math.round((correct / reviews) * 100) : 0}%</b></div><span>Recall accuracy</span></div>
      <div class="os-tile"><div class="os-stat"><b>${activeDays}</b></div><span>Active days</span></div>
    </div>
    <div class="os-charts">
      <div class="os-panel os-chart"><h4>Study time per day</h4><small>Minutes of focus</small>
        <div class="os-bars">${days.map((d, i) => `<i style="height:${(d.focus / maxF) * 100}%" title="${fmtDay(keys[i])}: ${d.focus} min"></i>`).join('')}</div>
        <div class="os-axis"><span>${fmtDay(keys[0])}</span><span>Today</span></div>
      </div>
      <div class="os-panel os-chart"><h4>Reviews per day</h4><small>Flashcards rated</small>
        <div class="os-bars is-accent">${days.map((d, i) => `<i style="height:${(d.reviews / maxR) * 100}%" title="${fmtDay(keys[i])}: ${d.reviews} reviews"></i>`).join('')}</div>
        <div class="os-axis"><span>${fmtDay(keys[0])}</span><span>Today</span></div>
      </div>
      <div class="os-panel os-chart"><h4>Focus by subject</h4><small>Last ${n} days</small>
        <div class="os-hbars">${subRows.length ? subRows.map(([id, m]) => `<div class="os-hbar">
          <span>${esc(subjectById(s, id)?.name || 'Other')}</span>
          <div><i style="width:${(m / maxSub) * 100}%;--sc:${sc(s, id)}"></i></div>
          <span>${formatMinutes(m)}</span></div>`).join('') : '<p class="os-hint">No focus sessions in this range.</p>'}</div>
      </div>
      <div class="os-panel os-chart"><h4>Activity</h4><small>Last 13 weeks</small>
        <div class="os-heat">${heatKeys.map((k) => `<i data-l="${level(k)}" title="${k}: ${dayStats(s, k).focus} min"></i>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- focus */

function renderFocus(s) {
  const t = s.timer;
  const cycleDots = Array.from({ length: s.prefs.longEvery }, (_, i) => `<i class="${i < t.completedInCycle % s.prefs.longEvery || (t.completedInCycle && t.completedInCycle % s.prefs.longEvery === 0 && t.phase === 'long') ? 'is-on' : ''}"></i>`).join('');
  return `<div class="os-focus">
    ${s.focusMode ? `<button class="os-btn os-btn-ghost os-focus-exit" data-action="focus-exit">${icon('close')}Exit</button>` : ''}
    <div class="os-ring">
      ${ring(260, 2, 4, s)}
      <div class="os-ring-inner">
        <span class="os-label"><span class="os-dot ${t.phase === 'focus' ? '' : 'is-break'}"></span>${PHASE_LABEL[t.phase]}</span>
        <span class="os-ring-time os-serif" data-timer="time">${mmss(t.remaining)}</span>
      </div>
    </div>
    <div class="os-focus-sub">
      <label class="os-muted" for="focus-subject">Studying</label>
      <select class="os-field" id="focus-subject" data-change="timer-subject" style="height:28px">
        <option value="">No subject</option>
        ${s.subjects.map((x) => `<option value="${x.id}" ${t.subjectId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
    </div>
    ${t.prompt ? `<div class="os-panel os-phase-prompt" role="status">
      <span>${t.prompt === 'focus' ? 'Focus session complete. Nice work.' : 'Break’s over.'}</span>
      <button class="os-btn os-btn-primary sm" data-action="timer-toggle">${t.prompt === 'focus' ? `Start ${t.phase === 'long' ? s.prefs.long : s.prefs.short}-min break` : `Start session ${t.completedInCycle % s.prefs.longEvery + 1}`}</button>
      ${t.prompt === 'focus' ? '<button class="os-btn os-btn-ghost sm" data-action="timer-skip">Skip break</button>' : ''}
    </div>` : `<div class="os-focus-controls">
      <button class="os-btn os-btn-ghost" data-action="timer-reset" title="Reset" aria-label="Reset timer">${icon('reset')}</button>
      <button class="os-btn os-btn-primary" data-action="timer-toggle">${icon(t.running ? 'pause' : 'play')}${t.running ? 'Pause' : t.started ? 'Resume' : 'Start'}</button>
      <button class="os-btn os-btn-ghost" data-action="timer-skip" title="Skip to next phase" aria-label="Skip to next phase">${icon('skip')}</button>
    </div>`}
    <div class="os-session-dots" aria-label="Sessions until long break">${cycleDots}</div>
    ${s.focusMode ? '' : `<button class="os-btn os-btn-ghost sm" style="margin-top:20px" data-action="focus-mode">${icon('expand')}Focus mode</button>`}
  </div>`;
}

/* ------------------------------------------------------------- calendar */

function renderCalendar(s) {
  const { y, m } = s.calCursor;
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const start = new Date(y, m, 1 - offset).getTime();
  const weeks = Math.ceil((offset + new Date(y, m + 1, 0).getDate()) / 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const k = dayKey(d.getTime());
    const items = calendarItems(s, k);
    const out = d.getMonth() !== m;
    cells.push(`<button class="os-cal-day ${out ? 'is-out' : ''} ${k === todayKey() ? 'is-today' : ''} ${k === s.calSelected ? 'is-selected' : ''}"
      data-action="cal-select" data-key="${k}" aria-label="${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${items.length} item${items.length === 1 ? '' : 's'}" aria-pressed="${k === s.calSelected}">
      <span class="os-cal-num">${d.getDate()}</span>
      ${items.slice(0, 3).map((it) => `<span class="os-cal-chip" style="--sc:${sc(s, it.subjectId)}">${it.kind === 'exam' ? icon('flag', 'i-flag') : it.kind === 'task' ? '<span class="os-sdot" style="width:6px;height:6px"></span>' : ''}<span>${esc(it.title)}</span></span>`).join('')}
      ${items.length > 3 ? `<span class="os-cal-more">+${items.length - 3} more</span>` : ''}
    </button>`);
  }
  const sel = calendarItems(s, s.calSelected);
  const selDate = new Date(keyToTime(s.calSelected)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const exams = s.exams.filter((e) => daysBetween(Date.now(), e.date) >= 0).sort((a, b) => a.date - b.date);
  const KIND = { exam: 'Exam', task: 'Task due', session: 'Study session' };

  return `<div class="os-page">
    ${pageHeader('Calendar')}
    <div class="os-cal-wrap">
      <div>
        <div class="os-cal-head">
          <h3>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
          <button class="os-btn os-btn-secondary sm" data-action="cal-today">Today</button>
          <button class="os-icon-btn" data-action="cal-move" data-dir="-1" aria-label="Previous month">${icon('chev-left')}</button>
          <button class="os-icon-btn" data-action="cal-move" data-dir="1" aria-label="Next month">${icon('chev-right')}</button>
        </div>
        <div class="os-cal-grid">
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="os-cal-dow">${d}</div>`).join('')}
          ${cells.join('')}
        </div>
      </div>
      <div class="os-agenda">
        <section>
          <div class="os-section-head"><span class="os-label">${selDate}</span></div>
          ${sel.length ? sel.map((it) => `<div class="os-agenda-item">
            <span class="os-sdot" style="--sc:${sc(s, it.subjectId)}"></span>
            <div>${esc(it.title)}<small>${KIND[it.kind]}${it.done ? ' · done' : ''}</small></div>
          </div>`).join('') : '<p class="os-hint">Nothing on this day.</p>'}
        </section>
        <section>
          <div class="os-section-head"><span class="os-label">Upcoming exams</span></div>
          ${exams.map((e) => countdown(s, e)).join('')}
        </section>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------- settings */

function renderSettings(s) {
  const stepper = (key, label, unit, step) => `<div class="os-form-row">
    <span>${label}</span>
    <span class="os-stepper">
      <button class="os-icon-btn" data-action="pref" data-key="${key}" data-delta="${-step}" aria-label="Decrease ${label}">${icon('minus')}</button>
      <output aria-live="polite">${s.prefs[key]} ${unit}</output>
      <button class="os-icon-btn" data-action="pref" data-key="${key}" data-delta="${step}" aria-label="Increase ${label}">${icon('plus')}</button>
    </span></div>`;
  return `<div class="os-page">
    ${pageHeader('Settings')}
    <div class="os-form">
      <section><div class="os-section-head"><span class="os-label">Focus timer</span></div>
        <div class="os-panel os-form-group">
          ${stepper('focus', 'Focus length', 'min', 5)}
          ${stepper('short', 'Short break', 'min', 1)}
          ${stepper('long', 'Long break', 'min', 5)}
        </div></section>
      <section><div class="os-section-head"><span class="os-label">Study goal</span></div>
        <div class="os-panel os-form-group">${stepper('goal', 'Daily goal', 'min', 15)}</div></section>
      <section><div class="os-section-head"><span class="os-label">Appearance</span></div>
        <div class="os-panel os-form-group"><div class="os-form-row"><span>Theme</span>
          <div class="os-seg" role="group" aria-label="Theme">
            ${[['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button aria-pressed="${s.appearance === v}" data-action="appearance" data-v="${v}">${l}</button>`).join('')}
          </div></div></div></section>
      <p class="os-hint">In the app, Settings also covers notifications and sounds, setup, your data folder and privacy.</p>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- subject */

function renderSubject(s) {
  const sub = subjectById(s, s.subjectId);
  if (!sub) return '';
  const blocks = s.pages[sub.id] || [];
  return `<div class="os-page is-reading">
    <div class="os-subject-head" style="--sc:${SUBJECT_COLORS[sub.color]}">
      ${icon(sub.icon)}
      <h1 class="os-title os-serif os-editable-title" contenteditable="true" spellcheck="false" data-edit="subject-name" data-id="${sub.id}" aria-label="Subject name">${esc(sub.name)}</h1>
    </div>
    ${blocks.length ? '' : '<p class="os-page-empty">This page is empty. Type / or click + to add your first block — notes, flashcards, tasks, a timer…</p>'}
    <div class="os-blocks">
      ${blocks.map((b, i) => renderBlock(s, sub, b, i, blocks.length)).join('')}
    </div>
    <div class="os-trailing">
      <input data-input="trailing" placeholder="Type / for blocks" aria-label="Add a block: type text, or / for the block menu" autocomplete="off">
      ${s.inserter && s.inserter.anchor === 'end' ? renderInserter(s, sub) : ''}
    </div>
  </div>`;
}

const WIDGETS = new Set(['tasks', 'flashcards', 'pomodoro', 'statistics', 'quiz']);

function renderBlock(s, sub, b, i, count) {
  const menuOpen = s.blockMenu === b.id;
  const cls = `os-block ${b.width === 'half' ? 'is-half' : ''} ${WIDGETS.has(b.type) ? 'is-widget' : ''} ${menuOpen ? 'has-menu' : ''}`;
  const gutter = `<div class="os-gutter">
      <button class="os-icon-btn sm" data-action="insert-after" data-id="${b.id}" title="Add a block below" aria-label="Add a block below">${icon('plus')}</button>
      <button class="os-icon-btn sm" data-action="block-menu" data-id="${b.id}" title="Block menu" aria-label="Block menu" aria-expanded="${menuOpen}">${icon('grip')}</button>
    </div>
    ${menuOpen ? `<div class="os-block-menu" role="menu">
      <button class="os-menu-item" role="menuitem" data-action="block-move" data-id="${b.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>${icon('arrow-up')}Move up</button>
      <button class="os-menu-item" role="menuitem" data-action="block-move" data-id="${b.id}" data-dir="1" ${i === count - 1 ? 'disabled' : ''}>${icon('arrow-down')}Move down</button>
      ${b.type === 'pomodoro' || b.type === 'statistics' ? `<button class="os-menu-item" role="menuitem" data-action="block-width" data-id="${b.id}">${icon('expand')}${b.width === 'half' ? 'Full width' : 'Half width'}</button>` : ''}
      <div class="os-menu-sep"></div>
      <button class="os-menu-item is-danger" role="menuitem" data-action="block-delete" data-id="${b.id}">${icon('trash')}Delete</button>
    </div>` : ''}`;
  const inserter = s.inserter && s.inserter.anchor === b.id ? renderInserter(s, sub) : '';
  return `<div class="${cls}" data-block="${b.id}">${gutter}${blockBody(s, sub, b)}${inserter}</div>`;
}

function blockBody(s, sub, b) {
  switch (b.type) {
    case 'text':
      return `<div class="os-text" contenteditable="true" data-edit="text" data-id="${b.id}" data-placeholder="" aria-label="Note">${b.html}</div>`;
    case 'heading':
      return `<div class="os-heading h${b.level}" contenteditable="true" data-edit="heading" data-id="${b.id}" role="heading" aria-level="${b.level + 1}">${esc(b.text)}</div>`;
    case 'divider':
      return '<div class="os-divider" role="separator"></div>';
    case 'callout':
      return `<div class="os-callout" data-tone="${b.tone}">${icon('bulb')}<div class="os-text" contenteditable="true" data-edit="text" data-id="${b.id}" aria-label="Callout">${b.html}</div></div>`;
    case 'checklist':
      return `<div class="os-checklist">${b.items.map((it) => `<div class="os-check-item ${it.done ? 'is-done' : ''}">
        ${checkbox(it.done, 'check-item', `data-id="${b.id}" data-item="${it.id}"`, it.text || 'Checklist item', true)}
        <input value="${esc(it.text)}" placeholder="To-do" data-input="check-item" data-id="${b.id}" data-item="${it.id}" aria-label="Checklist item">
      </div>`).join('')}</div>`;
    case 'tasks': {
      const list = s.tasks.filter((x) => x.subjectId === sub.id).sort((a, b2) => (a.done - b2.done) || ((a.due ?? Infinity) - (b2.due ?? Infinity)));
      return `<div class="os-widget"><div class="os-widget-head">${icon('tasks')}<b>Tasks</b>
          <span class="os-row-count">${list.filter((x) => !x.done).length} open</span>
          <button class="os-icon-btn" data-action="nav" data-view="tasks" title="Open in Tasks" aria-label="Open in Tasks">${icon('arrow-right')}</button></div>
        <div class="os-widget-body" style="padding-top:4px">
          ${list.map((x) => taskRow(s, x, false)).join('') || '<p class="os-hint" style="padding:8px 0">No tasks for this subject yet.</p>'}
          <form class="os-inline-add" data-form="add-subject-task" data-subject="${sub.id}">
            <input class="os-field" name="title" placeholder="Add a task for ${esc(sub.name)}…" autocomplete="off" aria-label="New task" required>
            <button class="os-btn os-btn-secondary" type="submit">Add</button>
          </form>
        </div></div>`;
    }
    case 'flashcards': {
      const d = deckById(s, b.deckId);
      if (!d) return '';
      const due = dueCards(d).length;
      return `<div class="os-widget"><div class="os-widget-head">${icon('cards')}<b>${esc(d.name)}</b></div>
        <div class="os-widget-body">
          <div class="os-deck-summary">
            <div class="os-stat"><b>${d.cards.length}</b><span>cards</span></div>
            <div class="os-stat"><b style="${due ? 'color:var(--c-warning)' : ''}">${due}</b><span>due</span></div>
            <button class="os-btn ${due ? 'os-btn-primary' : 'os-btn-secondary'}" data-action="open-review" data-deck="${d.id}" ${due ? '' : 'disabled'}>${due ? `${icon('play')}Review` : 'All caught up'}</button>
          </div>
          <form class="os-add-card" data-form="add-card" data-deck="${d.id}">
            <input class="os-field" name="front" placeholder="Front" aria-label="Card front" autocomplete="off" required>
            <input class="os-field" name="back" placeholder="Back" aria-label="Card back" autocomplete="off" required>
            <button class="os-btn os-btn-ghost" type="submit">${icon('plus')}Add card</button>
          </form>
        </div></div>`;
    }
    case 'pomodoro': {
      const t = s.timer;
      return `<div class="os-widget"><div class="os-widget-head">${icon('timer')}<b>Pomodoro</b></div>
        <div class="os-widget-body os-pomo">
          <div class="os-ring">${ring(104, 2, 4, s)}<div class="os-ring-inner">
            <span class="os-label" style="font-size:9.5px">${PHASE_LABEL[t.phase]}</span>
            <span class="os-ring-time os-serif" data-timer="time">${mmss(t.remaining)}</span></div></div>
          <div style="display:grid;gap:8px">
            <p class="os-muted">${t.subjectId === sub.id || !t.started ? `Sessions here count toward ${esc(sub.name)}.` : `Running for ${esc(subjectById(s, t.subjectId)?.name || 'another subject')}.`}</p>
            <div style="display:flex;gap:6px">
              <button class="os-btn os-btn-primary sm" data-action="timer-toggle" data-subject="${sub.id}">${icon(t.running ? 'pause' : 'play')}${t.running ? 'Pause' : t.started ? 'Resume' : 'Start'}</button>
              <button class="os-btn os-btn-ghost sm" data-action="timer-reset" aria-label="Reset timer">${icon('reset')}</button>
            </div>
          </div>
        </div></div>`;
    }
    case 'statistics': {
      const keys = lastNDays(7);
      const mins = keys.map((k) => dayStats(s, k).bySubject[sub.id] || 0);
      const max = Math.max(30, ...mins);
      const total = mins.reduce((a, x) => a + x, 0);
      return `<div class="os-widget"><div class="os-widget-head">${icon('chart')}<b>Study statistics</b></div>
        <div class="os-widget-body">
          <div class="os-stat"><b>${formatMinutes(total)}</b><span>this week</span></div>
          <div class="os-minibars">${mins.map((m, i) => `<div><i style="height:${(m / max) * 100}%" title="${m} min"></i><small>${new Date(keyToTime(keys[i])).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>`).join('')}</div>
        </div></div>`;
    }
    case 'quiz': {
      const q = quizById(s, b.quizId);
      if (!q) return '';
      const best = q.attempts.length ? Math.max(...q.attempts) : null;
      return `<div class="os-widget"><div class="os-widget-head">${icon('quiz')}<b>${esc(q.title)}</b></div>
        <div class="os-widget-body os-deck-summary">
          <div class="os-stat"><b>${q.questions.length}</b><span>questions</span></div>
          <div class="os-stat"><b>${best == null ? '—' : `${best}%`}</b><span>best score</span></div>
          <div class="os-stat"><b>${q.attempts.length}</b><span>attempt${q.attempts.length === 1 ? '' : 's'}</span></div>
          <button class="os-btn os-btn-primary" data-action="open-quiz" data-id="${q.id}">${icon('play')}${q.attempts.length ? 'Retake quiz' : 'Start quiz'}</button>
        </div></div>`;
    }
    default: return '';
  }
}

export function inserterItems(s, sub) {
  return filterBlockKinds(s.inserter?.query || '').map((k) => {
    let disabled = null;
    if (k.kind === 'pdf') disabled = 'In the app';
    if (k.kind === 'quiz' && !s.quizzes.some((q) => q.subjectId === sub.id)) disabled = 'In the app';
    return { ...k, disabled };
  });
}

function renderInserter(s, sub) {
  const items = inserterItems(s, sub);
  const active = Math.min(s.inserter.index, items.length - 1);
  return `<div class="os-inserter ${s.inserter.up ? 'is-up' : ''}" role="dialog" aria-label="Insert a block">
    <div class="fx-menu-search" style="padding:8px 10px;margin:0">
      ${icon('search')}
      <input data-input="inserter" value="${esc(s.inserter.query)}" placeholder="Search blocks" aria-label="Search blocks" autocomplete="off"
        role="combobox" aria-expanded="true" aria-controls="os-ins-list" aria-activedescendant="${items[active] ? `ins-${items[active].kind}` : ''}">
    </div>
    <div class="os-inserter-list" id="os-ins-list" role="listbox">
      ${items.length ? items.map((k, i) => `<button class="os-inserter-item ${i === active ? 'is-active' : ''}" id="ins-${k.kind}" role="option" aria-selected="${i === active}"
          data-action="insert-kind" data-kind="${k.kind}" ${k.disabled ? 'disabled' : ''} tabindex="-1">
        <span class="os-ins-icon">${icon(k.icon)}</span>
        <span><b>${k.name}</b><small>${k.disabled ? 'Available in the desktop app' : k.sub}</small></span>
        ${k.disabled ? `<span class="os-ins-tag">${k.disabled}</span>` : ''}
      </button>`).join('') : `<p class="fx-menu-none" style="padding:12px">No blocks match “${esc(s.inserter.query)}”</p>`}
    </div>
  </div>`;
}

/* --------------------------------------------------------------- sheets */

function renderSheet(s) {
  const sh = s.sheet;
  let title = '';
  let body = '';
  let progress = null;
  if (sh.type === 'review') {
    const deck = sh.deckId ? deckById(s, sh.deckId) : null;
    title = deck ? `Review · ${esc(deck.name)}` : 'Review all due';
    progress = sh.queue.length ? sh.done / (sh.done + sh.queue.length) : 1;
    body = renderReview(s);
  } else if (sh.type === 'quiz') {
    const q = quizById(s, sh.quizId);
    title = esc(q.title);
    progress = sh.finished ? 1 : sh.i / q.questions.length;
    body = renderQuiz(s, q);
  }
  return `<div class="os-backdrop" data-action="sheet-backdrop">
    <div class="os-sheet" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="os-sheet-head"><h3>${title}</h3>
        <button class="os-icon-btn" data-action="sheet-close" aria-label="Close" title="Close (Esc)">${icon('close')}</button></div>
      ${progress != null ? `<div class="os-progress"><i style="width:${progress * 100}%"></i></div>` : ''}
      <div class="os-sheet-body">${body}</div>
    </div>
  </div>`;
}

function renderReview(s) {
  const sh = s.sheet;
  if (!sh.queue.length) {
    return `<div class="os-review-done">
      <div class="os-empty-disc" style="margin:0 auto 8px">${icon('check')}</div>
      <h3 style="font-size:17px;font-weight:600">Session complete</h3>
      <div class="os-stat"><b>${sh.done}</b><span>review${sh.done === 1 ? '' : 's'}</span></div>
      <p class="os-muted">${RATINGS.map((r) => `${RATING_LABEL[r]} ${sh.counts[r]}`).join(' · ')}</p>
      <div class="os-hero-actions" style="margin-top:20px"><button class="os-btn os-btn-primary" data-action="sheet-close">Done</button></div>
    </div>`;
  }
  const { deckId, cardId } = sh.queue[0];
  const deck = deckById(s, deckId);
  const card = deck.cards.find((c) => c.id === cardId);
  return `<div class="os-card-meta fx-card-meta" style="display:flex;justify-content:space-between;margin-bottom:14px">
      <span>${subjectChip(s, deck.subjectId)}</span>
      <span class="os-muted os-num">${sh.queue.length} left</span>
    </div>
    <div class="os-flip"><div class="os-flip-card ${sh.flipped ? 'is-flipped' : ''}">
      <div class="os-flip-face os-flip-front" aria-hidden="${sh.flipped}"><span class="os-label">Question</span>${esc(card.front)}</div>
      <div class="os-flip-face os-flip-back" aria-hidden="${!sh.flipped}"><span class="os-label">Answer</span><span class="os-q">${esc(card.front)}</span>${esc(card.back)}</div>
    </div></div>
    ${sh.flipped ? `<div class="os-rate-row" role="group" aria-label="How well did you know it?">
      ${RATINGS.map((r, i) => `<button class="os-rate ${r}" data-action="review-rate" data-r="${r}">
        <span>${RATING_LABEL[r]}<kbd>${i + 1}</kbd></span><small>${preview(card, r)}</small></button>`).join('')}
    </div>` : `<div class="os-show-row"><button class="os-btn os-btn-primary" data-action="review-show">Show answer<kbd>Space</kbd></button></div>`}
    <p class="os-hint" style="text-align:center;margin-top:14px;font-size:12px">${sh.flipped ? 'Each button shows when you’ll see this card again.' : 'Try to recall the answer before you flip.'}</p>`;
}

function renderQuiz(s, q) {
  const sh = s.sheet;
  if (sh.finished) {
    const wrong = q.questions.map((qq, i) => ({ qq, a: sh.answers[i], ok: sh.correct[i] })).filter((x) => !x.ok);
    const score = q.questions.length - wrong.length;
    const show = (qq, a) => qq.type === 'mc' ? qq.options[a] : qq.type === 'tf' ? (a ? 'True' : 'False') : a;
    return `<div class="os-review-done">
      <div class="os-stat"><b>${score}/${q.questions.length}</b></div>
      <p class="os-muted">${score === q.questions.length ? 'Full marks.' : `${Math.round((score / q.questions.length) * 100)}% — here’s what to look at again.`}</p>
      ${wrong.length ? `<div class="os-result-list">${wrong.map(({ qq, a }) => `<div class="os-panel os-result-item">
        <div>${esc(qq.prompt)}</div>
        <p class="os-wrong">Your answer: ${esc(show(qq, a) || '(blank)')}</p>
        <p class="os-right">Correct: ${esc(show(qq, qq.answer))}</p>
      </div>`).join('')}</div>` : ''}
      <div class="os-hero-actions" style="margin-top:20px">
        <button class="os-btn os-btn-secondary" data-action="open-quiz" data-id="${q.id}">Retake</button>
        <button class="os-btn os-btn-primary" data-action="sheet-close">Done</button>
      </div>
    </div>`;
  }
  const qq = q.questions[sh.i];
  const last = sh.i === q.questions.length - 1;
  let answer = '';
  if (qq.type === 'mc' || qq.type === 'tf') {
    const opts = qq.type === 'mc' ? qq.options : ['True', 'False'];
    answer = `<div class="os-options" role="radiogroup" aria-label="Answers">${opts.map((o, i) => {
      const val = qq.type === 'tf' ? i === 0 : i;
      return `<button class="os-option" role="radio" aria-checked="${sh.selected === val}" aria-pressed="${sh.selected === val}" data-action="quiz-select" data-v="${qq.type === 'tf' ? String(val) : i}">
        <span class="os-option-key">${String.fromCharCode(65 + i)}</span>${esc(o)}</button>`;
    }).join('')}</div>`;
  } else {
    answer = `<input class="os-field" style="width:100%;height:38px" data-input="quiz-short" value="${esc(sh.selected ?? '')}" placeholder="Type your answer" aria-label="Your answer" autocomplete="off">`;
  }
  const has = sh.selected != null && sh.selected !== '';
  return `<div class="os-label">Question ${sh.i + 1} of ${q.questions.length} · ${qq.type === 'mc' ? 'Multiple choice' : qq.type === 'tf' ? 'True or false' : 'Short answer'}</div>
    <p class="os-quiz-q">${esc(qq.prompt)}</p>
    ${answer}
    <div class="os-quiz-foot">
      <span class="os-hint" style="font-size:12px">${has ? '' : 'Choose an answer to continue'}</span>
      <button class="os-btn os-btn-primary" data-action="quiz-next" ${has ? '' : 'disabled'}>${last ? 'Finish' : 'Next'}</button>
    </div>`;
}

function renderSubjectPopover(s) {
  const p = s.popover;
  const icons = ['book', 'leaf', 'flask', 'function', 'columns', 'text', 'chart', 'bulb'];
  return `<div class="os-popover" role="dialog" aria-label="New subject">
    <h4>New subject</h4>
    <form data-form="new-subject">
      <input class="os-field" name="name" value="${esc(p.name)}" data-input="pop-name" placeholder="Subject name" aria-label="Subject name" autocomplete="off">
      <div class="os-swatches" role="group" aria-label="Colour">
        ${Object.entries(SUBJECT_COLORS).map(([k, v]) => `<button type="button" class="os-swatch" style="--sc:${v}" aria-label="${k}" aria-pressed="${p.color === k}" data-action="pop-color" data-v="${k}"></button>`).join('')}
      </div>
      <div class="os-icons" role="group" aria-label="Icon">
        ${icons.map((ic) => `<button type="button" aria-label="${ic} icon" aria-pressed="${p.icon === ic}" data-action="pop-icon" data-v="${ic}">${icon(ic)}</button>`).join('')}
      </div>
      <div class="os-pop-foot">
        <button type="button" class="os-btn os-btn-ghost" data-action="pop-cancel">Cancel</button>
        <button type="submit" class="os-btn os-btn-primary" ${p.name.trim() ? '' : 'disabled'}>Create</button>
      </div>
    </form>
  </div>`;
}

