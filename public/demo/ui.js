// Small rendering helpers shared by the demo and the feature vignettes.

export const icon = (name, cls = '') =>
  `<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Subject colours from DESIGN.md §2.5. */
export const SUBJECT_COLORS = {
  clay: '#C2774F', sage: '#6B9871', sky: '#5A8BBB', teal: '#4C9693',
  lavender: '#8A7BC2', rose: '#C26A84', sand: '#B0954F', slate: '#6E7A87',
};

/** Block kinds and copy, from BlockKind in Models.swift. */
export const BLOCK_KINDS = [
  { kind: 'text', name: 'Text', icon: 'text', sub: 'Rich notes with formatting, lists, links and images', keys: 'text note paragraph write rich' },
  { kind: 'heading', name: 'Heading', icon: 'heading', sub: 'A section title for your page', keys: 'heading title h1 h2 h3 section' },
  { kind: 'divider', name: 'Divider', icon: 'minus', sub: 'Visually separate sections', keys: 'divider line separator rule hr' },
  { kind: 'callout', name: 'Callout', icon: 'bulb', sub: 'Highlight a key idea or reminder', keys: 'callout info note tip warning box' },
  { kind: 'checklist', name: 'Checklist', icon: 'checklist', sub: 'A quick checklist that lives on this page', keys: 'checklist todo check list' },
  { kind: 'tasks', name: 'Task list', icon: 'tasks', sub: 'Tasks with due dates that also appear in Tasks', keys: 'tasks todo deadline due planner' },
  { kind: 'flashcards', name: 'Flashcards', icon: 'cards', sub: 'Review a deck with spaced repetition', keys: 'flashcards cards deck review anki srs' },
  { kind: 'pdf', name: 'PDF document', icon: 'doc', sub: 'Read and annotate a PDF', keys: 'pdf document file read annotate' },
  { kind: 'pomodoro', name: 'Pomodoro timer', icon: 'timer', sub: 'Focus timer for this subject', keys: 'pomodoro timer focus clock' },
  { kind: 'statistics', name: 'Study statistics', icon: 'chart', sub: 'Study progress for this subject', keys: 'statistics stats progress chart' },
  { kind: 'quiz', name: 'Quiz', icon: 'quiz', sub: 'A practice test you can take and retake', keys: 'quiz test practice exam questions' },
];

export function filterBlockKinds(query) {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_KINDS;
  return BLOCK_KINDS.filter((b) => b.name.toLowerCase().includes(q) || b.keys.includes(q));
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const mmss = (secs) => `${pad2(Math.floor(secs / 60))}:${pad2(Math.floor(secs % 60))}`;

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
