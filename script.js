const root = document.querySelector('#snap-root');
const sections = [...document.querySelectorAll('.snap-section')];
const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.site-header nav');
const hero = document.querySelector('.hero');
const introBrand = document.querySelector('.intro-brand');
const SCENE_TRANSITION_MS = 1250;
let activeIndex = -1;
let counterFrame;
let introTimers = [];
let sceneLocked = false;
let touchStartY = 0;

function playCounters() {
  cancelAnimationFrame(counterFrame);
  const counters = [...document.querySelectorAll('[data-counter-value]')].map((element) => {
    const raw = element.dataset.counterValue || element.textContent.trim();
    const match = raw.match(/[\d,.]+/);
    if (!match) return null;
    const normalized = match[0].replaceAll(',', '');
    return {
      element,
      target: Number(normalized),
      decimals: normalized.includes('.') ? normalized.split('.')[1].length : 0,
      prefix: raw.slice(0, match.index),
      suffix: raw.slice((match.index || 0) + match[0].length),
    };
  }).filter(Boolean);
  const startedAt = performance.now();

  function update(now) {
    const progress = Math.min(1, (now - startedAt) / 780);
    const eased = 1 - Math.pow(1 - progress, 3);
    counters.forEach(({ element, target, decimals, prefix, suffix }) => {
      const value = target * (0.88 + 0.12 * eased);
      element.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    });
    if (progress < 1) counterFrame = requestAnimationFrame(update);
  }

  window.setTimeout(() => { counterFrame = requestAnimationFrame(update); }, 1500);
}

function runHeroIntro() {
  introTimers.forEach((timer) => window.clearTimeout(timer));
  introTimers = [];
  hero.classList.add('intro-mode', 'brand-switching');
  hero.classList.remove('brand-docked', 'final-beat');
  introBrand.classList.remove('show', 'dock', 'done');
  void introBrand.offsetWidth;

  introTimers.push(window.setTimeout(() => introBrand.classList.add('show'), 100));
  introTimers.push(window.setTimeout(() => introBrand.classList.add('dock'), 1400));
  introTimers.push(window.setTimeout(() => {
    hero.classList.remove('intro-mode');
    hero.classList.remove('scene-entering');
    void hero.offsetWidth;
    hero.classList.add('scene-entering');
    playCounters();
  }, 1760));
  introTimers.push(window.setTimeout(() => {
    introBrand.classList.add('done');
    hero.classList.remove('brand-switching');
    hero.classList.add('brand-docked');
  }, 1860));
  introTimers.push(window.setTimeout(() => hero.classList.add('final-beat'), 3200));
}

function showScene(index, firstRun = false) {
  const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
  if (!firstRun && nextIndex === activeIndex) return;
  const next = sections[nextIndex];
  const previous = activeIndex >= 0 ? sections[activeIndex] : null;
  const direction = activeIndex < 0 || nextIndex > activeIndex ? 1 : -1;

  if (nextIndex === 0 && (firstRun || direction > 0)) hero.classList.add('intro-mode');

  if (previous && previous !== next) {
    previous.classList.add(direction > 0 ? 'exit-up' : 'exit-down');
    window.setTimeout(() => {
      previous.classList.remove('active', 'exit-up', 'exit-down', 'scene-entering');
    }, SCENE_TRANSITION_MS);
  }

  next.classList.remove('exit-up', 'exit-down');
  next.classList.remove('scene-entering');
  next.classList.toggle('enter-from-top', direction < 0);
  void next.offsetWidth;
  if (firstRun) next.classList.add('instant');
  next.classList.add('active', 'scene-entering');
  window.setTimeout(() => next.classList.remove('enter-from-top'), SCENE_TRANSITION_MS);
  if (firstRun) window.setTimeout(() => next.classList.remove('instant'), 0);
  activeIndex = nextIndex;

  if (nextIndex === 0) {
    if (firstRun || direction > 0) {
      runHeroIntro();
    } else {
      introTimers.forEach((timer) => window.clearTimeout(timer));
      introTimers = [];
      hero.classList.remove('intro-mode', 'brand-switching');
      introBrand.classList.remove('show', 'dock');
      introBrand.classList.add('done');
      hero.classList.add('brand-docked', 'final-beat');
    }
  }
}

// Prepare every heading for word-by-word zoom and every primary visual for a staggered entrance.
sections.forEach((section) => {
  section.querySelectorAll('h1, h2, h3').forEach((heading) => {
    if (heading.classList.contains('zoom-heading')) return;
    heading.classList.add('zoom-heading');
    let wordIndex = 0;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
    }
    textNodes.forEach((textNode) => {
      const parts = textNode.textContent.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part.trim()) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        const word = document.createElement('span');
        word.className = 'zoom-word';
        word.style.setProperty('--word-index', wordIndex++);
        word.textContent = part;
        fragment.appendChild(word);
      });
      textNode.replaceWith(fragment);
    });
    heading.style.setProperty('--word-count', wordIndex);
    heading.style.setProperty('--heading-zoom-delay', '.32s');
  });

  const media = section.querySelectorAll([
    '.service-card',
    '.identify-portrait > img',
    '.community-flower',
  ].join(','));
  media.forEach((element, index) => {
    element.classList.add('scene-zoom-media');
    element.style.setProperty('--media-index', index);
  });
});

showScene(0, true);

// Move exactly one scene per wheel or trackpad gesture in either direction.
root.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (sceneLocked || Math.abs(event.deltaY) < 18) return;
  sceneLocked = true;
  showScene(activeIndex + (event.deltaY > 0 ? 1 : -1));
  window.setTimeout(() => { sceneLocked = false; }, SCENE_TRANSITION_MS);
}, { passive: false });

root.addEventListener('touchstart', (event) => {
  touchStartY = event.touches[0]?.clientY || 0;
}, { passive: true });

root.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });

root.addEventListener('touchend', (event) => {
  if (sceneLocked) return;
  const endY = event.changedTouches[0]?.clientY || touchStartY;
  const distance = touchStartY - endY;
  if (Math.abs(distance) < 45) return;
  sceneLocked = true;
  showScene(activeIndex + (distance > 0 ? 1 : -1));
  window.setTimeout(() => { sceneLocked = false; }, SCENE_TRANSITION_MS);
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.repeat || sceneLocked) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    sceneLocked = true;
    showScene(activeIndex + 1);
    window.setTimeout(() => { sceneLocked = false; }, SCENE_TRANSITION_MS);
  }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    sceneLocked = true;
    showScene(activeIndex - 1);
    window.setTimeout(() => { sceneLocked = false; }, SCENE_TRANSITION_MS);
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    const targetSection = target?.closest('.snap-section');
    if (!targetSection) return;
    event.preventDefault();
    nav?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
    showScene(sections.indexOf(targetSection));
  });
});

if (menu && nav) menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');
let ringX = 0;
let ringY = 0;
let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
  cursorDot.style.left = `${mouseX}px`;
  cursorDot.style.top = `${mouseY}px`;
});

function animateCursor() {
  ringX += (mouseX - ringX) * 0.14;
  ringY += (mouseY - ringY) * 0.14;
  cursorRing.style.left = `${ringX}px`;
  cursorRing.style.top = `${ringY}px`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button').forEach((item) => {
  item.addEventListener('mouseenter', () => {
    cursorRing.style.width = '54px';
    cursorRing.style.height = '54px';
  });
  item.addEventListener('mouseleave', () => {
    cursorRing.style.width = '34px';
    cursorRing.style.height = '34px';
  });
});

document.querySelectorAll('.plant-image button').forEach((button) => {
  button.addEventListener('click', () => {
    const liked = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!liked));
  });
});
