// Open Study website: navigation state, scroll reveals, the interactive demo
// and the feature vignettes.

import { mountDemo } from './demo/app.js';
import { blocksVignette, cardsVignette, focusVignette, pdfVignette } from './features.js';

window.__osReady = true;

// Navigation gets a hairline once the page scrolls.
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Fade sections in as they arrive. Everything is visible without JS or with reduced motion.
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

// Interactive demo.
const demoRoot = document.getElementById('demo-root');
if (demoRoot) {
  const demo = mountDemo(demoRoot);
  document.getElementById('demo-reset')?.addEventListener('click', () => demo.reset());
}

// Feature vignettes.
const vignettes = { 'fx-blocks': blocksVignette, 'fx-cards': cardsVignette, 'fx-focus': focusVignette, 'fx-pdf': pdfVignette };
Object.entries(vignettes).forEach(([id, init]) => {
  const el = document.getElementById(id);
  if (el) init(el);
});
