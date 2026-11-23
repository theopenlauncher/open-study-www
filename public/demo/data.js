// Sample workspace for the browser demo. Everything here is made up and lives
// only in memory; it is never sent anywhere or connected to the real app.

import { newCard, uid } from './sm2.js';

const DAY = 86400000;

export function startOfDay(t = Date.now()) {
  const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime();
}
export const dayAt = (offset) => startOfDay() + offset * DAY;
export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const keyToTime = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

// Deterministic pseudo-random numbers, so the sample history looks the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const card = (front, back, dueOffset, reps = 0, interval = 0) =>
  newCard(front, back, reps
    ? { repetitions: reps, intervalDays: interval, ease: 2.5, due: dayAt(dueOffset) }
    : { due: dayAt(dueOffset) });

export function createInitialState() {
  const subjects = [
    { id: 'bio', name: 'Biology', icon: 'leaf', color: 'sage' },
    { id: 'hist', name: 'History', icon: 'columns', color: 'sand' },
    { id: 'calc', name: 'Calculus', icon: 'function', color: 'sky' },
    { id: 'chem', name: 'Chemistry', icon: 'flask', color: 'lavender' },
    { id: 'lit', name: 'English Literature', icon: 'book', color: 'rose' },
  ];

  const decks = [
    {
      id: 'd-bio', name: 'Cell biology', subjectId: 'bio', cards: [
        card('Where does glycolysis take place?', 'In the cytoplasm.', -1),
        card('What is the net ATP yield of glycolysis?', '2 ATP per glucose, plus 2 NADH.', -2),
        card('What is the final electron acceptor in the electron transport chain?', 'Oxygen. It combines with electrons and protons to form water.', 0),
        card('What does one turn of the Krebs cycle produce?', '3 NADH, 1 FADH₂, 1 ATP and 2 CO₂.', 0),
        card('What is chemiosmosis?', 'Making ATP as protons flow back across a membrane through ATP synthase.', -1),
        card('Which organelle carries out photosynthesis?', 'The chloroplast.', 0),
        card('What are the products of the light-dependent reactions?', 'ATP, NADPH and oxygen.', 3, 2, 6),
        card('What does the cell membrane do?', 'Controls what enters and leaves the cell. It is a selectively permeable phospholipid bilayer.', 5, 3, 14),
        card('Active vs. passive transport?', 'Active transport uses energy (ATP) to move substances against their gradient. Passive transport does not.', 2, 2, 6),
        card('In which phase does DNA replicate?', 'The S (synthesis) phase of interphase.', 9, 3, 16),
      ],
    },
    {
      id: 'd-hist', name: 'The Cold War', subjectId: 'hist', cards: [
        card('What was the Truman Doctrine (1947)?', 'A US pledge to support countries resisting communism, starting with Greece and Turkey.', 0),
        card('What was the Marshall Plan?', 'US economic aid to rebuild Western Europe after the Second World War, 1948–1952.', -1),
        card('When was the Berlin Wall built, and when did it open?', 'Built in 1961; opened in November 1989.', 0),
        card('What was the Cuban Missile Crisis?', 'A 13-day stand-off in October 1962 over Soviet missiles in Cuba.', 4, 2, 6),
        card('What was NATO?', 'A military alliance of Western states for collective defence, founded in 1949.', 7, 3, 15),
        card('What was détente?', 'The easing of US–Soviet tensions in the late 1960s and 1970s.', 1, 1, 1),
      ],
    },
    {
      id: 'd-calc', name: 'Derivatives', subjectId: 'calc', cards: [
        card('d/dx of xⁿ', 'n·xⁿ⁻¹', 0),
        card('d/dx of sin x', 'cos x', -3),
        card('d/dx of eˣ', 'eˣ', 0),
        card('The chain rule', '(f ∘ g)′(x) = f′(g(x)) · g′(x)', -1),
        card('The product rule', '(fg)′ = f′g + fg′', 6, 2, 6),
        card('d/dx of ln x', '1/x, for x > 0', 3, 2, 6),
      ],
    },
    {
      id: 'd-chem', name: 'Functional groups', subjectId: 'chem', cards: [
        card('–OH', 'Hydroxyl group (alcohols)', 0),
        card('–COOH', 'Carboxyl group (carboxylic acids)', -1),
        card('–CHO', 'Aldehyde group', 4, 2, 6),
        card('–NH₂', 'Amino group (amines)', 8, 3, 13),
      ],
    },
  ];

  const tasks = [
    { id: uid(), title: 'Problem set 4: chain rule', subjectId: 'calc', due: dayAt(-1), priority: 'high', done: false },
    { id: uid(), title: 'Finish lab report on enzyme kinetics', subjectId: 'bio', due: dayAt(0), priority: 'high', done: false },
    { id: uid(), title: 'Read chapter 7: the Marshall Plan', subjectId: 'hist', due: dayAt(0), priority: 'medium', done: false },
    { id: uid(), title: 'Annotate Act 3 of Macbeth', subjectId: 'lit', due: dayAt(2), priority: 'medium', done: false },
    { id: uid(), title: 'Titration practice questions', subjectId: 'chem', due: dayAt(4), priority: 'low', done: false },
    { id: uid(), title: 'Essay outline: causes of the Cold War', subjectId: 'hist', due: dayAt(6), priority: 'medium', done: false },
    { id: uid(), title: 'Email lab partner about the data', subjectId: 'bio', due: null, priority: null, done: false },
    { id: uid(), title: 'Renew library books', subjectId: null, due: null, priority: 'low', done: false },
    { id: uid(), title: 'Summarise chapter 5 notes', subjectId: 'bio', due: dayAt(-2), priority: 'medium', done: true },
    { id: uid(), title: 'Derivatives worksheet', subjectId: 'calc', due: dayAt(-3), priority: null, done: true },
  ];

  const habitHistory = (pattern) => new Set(pattern.map((o) => dayKey(dayAt(o))));
  const habits = [
    { id: 'h1', name: 'Review flashcards', icon: 'cards', done: habitHistory([-1, -2, -3, -4, -5, -6, -8]) },
    { id: 'h2', name: 'Read for 20 minutes', icon: 'book', done: habitHistory([-1, -3, -4, -6]) },
    { id: 'h3', name: 'Plan tomorrow', icon: 'calendar', done: habitHistory([0, -1, -2, -5]) },
  ];

  const exams = [
    { id: uid(), title: 'Calculus quiz: derivatives', subjectId: 'calc', date: dayAt(5) },
    { id: uid(), title: 'Biology midterm', subjectId: 'bio', date: dayAt(12) },
    { id: uid(), title: 'Chemistry practical', subjectId: 'chem', date: dayAt(19) },
    { id: uid(), title: 'History final', subjectId: 'hist', date: dayAt(26) },
  ];

  const quizzes = [
    {
      id: 'q-bio', title: 'Cell respiration check', subjectId: 'bio', attempts: [60],
      questions: [
        { type: 'mc', prompt: 'Where does the Krebs cycle take place?', options: ['Cytoplasm', 'Mitochondrial matrix', 'Inner mitochondrial membrane', 'Nucleus'], answer: 1 },
        { type: 'tf', prompt: 'Glycolysis requires oxygen.', answer: false },
        { type: 'mc', prompt: 'Which stage produces the most ATP?', options: ['Glycolysis', 'Krebs cycle', 'Electron transport chain', 'Fermentation'], answer: 2 },
        { type: 'short', prompt: 'Which molecule is the final electron acceptor in the electron transport chain?', answer: 'Oxygen', accept: ['oxygen', 'o2', 'o₂', 'oxygen gas'] },
        { type: 'tf', prompt: 'Photosynthesis takes place in the chloroplast.', answer: true },
      ],
    },
  ];

  const pages = {
    bio: [
      { id: uid(), type: 'callout', tone: 'blue', html: 'Midterm covers chapters 4–7: cells, membranes, respiration and photosynthesis.' },
      { id: uid(), type: 'heading', level: 2, text: 'Cellular respiration' },
      { id: uid(), type: 'text', html: 'Respiration turns glucose into ATP in three stages: <b>glycolysis</b> in the cytoplasm, the <b>Krebs cycle</b> in the mitochondrial matrix, and the <b>electron transport chain</b> across the inner membrane.' },
      { id: uid(), type: 'text', html: 'Most of the ATP comes from oxidative phosphorylation. Oxygen is the final electron acceptor, which is why the chain stops without it.' },
      { id: uid(), type: 'flashcards', deckId: 'd-bio' },
      { id: uid(), type: 'checklist', items: [
        { id: uid(), text: 'Re-read chapter 4', done: true },
        { id: uid(), text: 'Redo practice questions 4.1–4.12', done: true },
        { id: uid(), text: 'Draw the Krebs cycle from memory', done: false },
        { id: uid(), text: 'Ask about chemiosmosis in office hours', done: false },
      ] },
      { id: uid(), type: 'tasks' },
      { id: uid(), type: 'pomodoro', width: 'half' },
      { id: uid(), type: 'statistics', width: 'half' },
      { id: uid(), type: 'quiz', quizId: 'q-bio' },
    ],
    hist: [
      { id: uid(), type: 'heading', level: 2, text: 'The Cold War, 1947–1991' },
      { id: uid(), type: 'text', html: 'A rivalry between the United States and the Soviet Union fought through alliances, arms races, proxy wars and propaganda rather than direct conflict.' },
      { id: uid(), type: 'callout', tone: 'yellow', html: 'Essay question: “To what extent was the Cold War caused by ideology?” Use at least three primary sources.' },
      { id: uid(), type: 'flashcards', deckId: 'd-hist' },
      { id: uid(), type: 'tasks' },
    ],
    calc: [
      { id: uid(), type: 'callout', tone: 'neutral', html: 'Quiz on derivatives soon. Focus on the chain rule and implicit differentiation.' },
      { id: uid(), type: 'heading', level: 2, text: 'Differentiation rules' },
      { id: uid(), type: 'text', html: 'The derivative measures how fast a function changes. Learn the core rules by heart, then practise combining them.' },
      { id: uid(), type: 'flashcards', deckId: 'd-calc' },
      { id: uid(), type: 'checklist', items: [
        { id: uid(), text: 'Watch the lecture on implicit differentiation', done: true },
        { id: uid(), text: 'Problem set 4, questions 1–10', done: false },
      ] },
      { id: uid(), type: 'tasks' },
    ],
    chem: [
      { id: uid(), type: 'heading', level: 2, text: 'Organic chemistry' },
      { id: uid(), type: 'text', html: 'Functional groups decide how a molecule reacts. Learn to spot them before memorising reactions.' },
      { id: uid(), type: 'flashcards', deckId: 'd-chem' },
      { id: uid(), type: 'tasks' },
    ],
    lit: [],
  };

  return {
    view: 'home',
    subjectId: null,
    sidebarOpen: true,
    focusMode: false,
    appearance: 'light',
    subjects, decks, tasks, habits, exams, quizzes, pages,
    stats: generateStats(subjects),
    timer: { phase: 'focus', remaining: 25 * 60, duration: 25 * 60, running: false, started: false, completedInCycle: 0, subjectId: 'bio' },
    prefs: { focus: 25, short: 5, long: 15, longEvery: 4, goal: 120 },
    sheet: null,
    popover: null,
    tasksFilter: 'open',
    tasksSubject: 'all',
    statsRange: 7,
    calCursor: (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })(),
    calSelected: dayKey(Date.now()),
  };
}

function generateStats(subjects) {
  const rand = rng(20251121);
  const stats = {};
  for (let o = -89; o <= 0; o += 1) {
    const t = dayAt(o);
    const weekday = new Date(t).getDay();
    // A realistic rhythm: busier on weekdays, a gap now and then, more recently.
    const skip = o === -10 || (o < -10 && rand() < (weekday === 6 ? 0.55 : 0.18));
    if (skip) continue;
    const recency = 0.65 + 0.35 * ((o + 89) / 89);
    let focus = Math.round((25 + rand() * 95) * recency / 5) * 5;
    let reviews = Math.round((8 + rand() * 40) * recency);
    if (o === 0) { focus = 50; reviews = 18; }
    const bySubject = {};
    let left = focus;
    const picks = subjects.slice(0, 4).sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 2));
    picks.forEach((s, i) => {
      const m = i === picks.length - 1 ? left : Math.round((left * (0.45 + rand() * 0.3)) / 5) * 5;
      if (m > 0) bySubject[s.id] = m;
      left -= m;
    });
    stats[dayKey(t)] = { focus, reviews, correct: Math.round(reviews * (0.72 + rand() * 0.2)), bySubject };
  }
  return stats;
}
