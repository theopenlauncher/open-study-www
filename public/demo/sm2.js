// SM-2 spaced repetition, ported from open-study/Services/StudyLogic.swift
// so the demo shows the same intervals the app would.

export const RATINGS = ['again', 'hard', 'good', 'easy'];
export const RATING_LABEL = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

const QUALITY = { again: 2, hard: 3, good: 4, easy: 5 };
const DAY = 86400000;

export function schedule(card, rating, now = Date.now()) {
  const q = QUALITY[rating];
  const ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (rating === 'again') {
    return { ease, intervalDays: 0, repetitions: 0, lapses: card.lapses + 1, due: now + 10 * 60 * 1000 };
  }

  const reps = card.repetitions + 1;
  let interval;
  if (reps === 1) interval = rating === 'easy' ? 4 : 1;
  else if (reps === 2) interval = rating === 'hard' ? 3 : 6;
  else interval = Math.max(1, card.intervalDays) * ease;
  if (rating === 'hard') interval = Math.max(1, interval * 0.8);
  if (rating === 'easy' && reps > 1) interval *= 1.3;
  interval = Math.round(interval);

  const start = new Date(now); start.setHours(0, 0, 0, 0);
  return { ease, intervalDays: interval, repetitions: reps, lapses: card.lapses, due: start.getTime() + interval * DAY };
}

/** Mirrors Fmt.interval(days:) in Components.swift. */
export function formatInterval(days) {
  if (days < 1) return '<1d';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function preview(card, rating) {
  if (rating === 'again') return '10m';
  return formatInterval(schedule(card, rating).intervalDays);
}

export function describeInterval(card, rating) {
  if (rating === 'again') return 'in 10 minutes';
  const d = schedule(card, rating).intervalDays;
  if (d === 1) return 'tomorrow';
  if (d < 30) return `in ${d} days`;
  const m = Math.round(d / 30);
  return m === 1 ? 'in a month' : `in ${m} months`;
}

export function newCard(front, back, extra = {}) {
  return { id: uid(), front, back, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, due: Date.now() - 1, ...extra };
}

let counter = 0;
export function uid() {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}
