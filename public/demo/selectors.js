// Derived values computed from demo state (counts, streaks, groupings).

import { dayKey, dayAt, startOfDay, keyToTime, daysBetween } from './data.js';

export const todayKey = () => dayKey(Date.now());
export const subjectById = (s, id) => s.subjects.find((x) => x.id === id) || null;
export const deckById = (s, id) => s.decks.find((d) => d.id === id) || null;
export const quizById = (s, id) => s.quizzes.find((q) => q.id === id) || null;

export const isDue = (card) => card.due <= Date.now();
export const dueCards = (deck) => deck.cards.filter(isDue);
export const totalDue = (s) => s.decks.reduce((n, d) => n + dueCards(d).length, 0);
export const subjectDue = (s, id) => s.decks.filter((d) => d.subjectId === id).reduce((n, d) => n + dueCards(d).length, 0);

export function dayStats(s, key) {
  return s.stats[key] || { focus: 0, reviews: 0, correct: 0, bySubject: {} };
}
export const focusToday = (s) => dayStats(s, todayKey()).focus;

export function streak(s) {
  const active = (k) => { const d = s.stats[k]; return d && (d.focus > 0 || d.reviews > 0); };
  let offset = active(todayKey()) ? 0 : -1;
  let n = 0;
  while (active(dayKey(dayAt(offset)))) { n += 1; offset -= 1; }
  return n;
}

export function taskGroup(task) {
  if (task.due == null) return 'none';
  const diff = daysBetween(Date.now(), task.due);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

export const GROUP_LABEL = { overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', none: 'No date' };

export function dueLabel(t) {
  if (t == null) return '';
  const diff = daysBetween(Date.now(), t);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff} days ago`;
  if (diff < 7) return new Date(t).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function habitStreak(h) {
  let offset = h.done.has(todayKey()) ? 0 : -1;
  let n = 0;
  while (h.done.has(dayKey(dayAt(offset)))) { n += 1; offset -= 1; }
  return n;
}

export const lastNDays = (n) => Array.from({ length: n }, (_, i) => dayKey(dayAt(i - n + 1)));

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function calendarItems(s, key) {
  const t = keyToTime(key);
  const items = [];
  s.exams.filter((e) => dayKey(e.date) === key)
    .forEach((e) => items.push({ kind: 'exam', title: e.title, subjectId: e.subjectId }));
  s.tasks.filter((x) => x.due != null && dayKey(x.due) === key)
    .forEach((x) => items.push({ kind: 'task', title: x.title, subjectId: x.subjectId, done: x.done }));
  if (t <= startOfDay()) {
    const d = s.stats[key];
    if (d) Object.entries(d.bySubject).forEach(([sid, m]) => {
      const sub = subjectById(s, sid);
      items.push({ kind: 'session', title: `${sub ? sub.name : 'Study'} · ${m}m`, subjectId: sid, minutes: m });
    });
  }
  return items;
}

export function formatMinutes(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
