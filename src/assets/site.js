const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
const services = nav.querySelector('.service-menu');
const mobile = window.matchMedia('(max-width: 84rem)');
const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const heroCarousel = document.querySelector('[data-hero-slider]');
const heroControls = heroCarousel?.querySelector('.hero-slider');

if (heroControls) {
  const slides = [...heroCarousel.querySelectorAll('[data-hero-slide]')];
  const links = [...heroControls.querySelectorAll('[data-hero-slide-link]')];
  const dots = [...heroControls.querySelectorAll('[data-hero-index]')];
  const rotation = heroControls.querySelector('.hero-rotation');
  const slideTitle = heroControls.querySelector('.hero-slide-title');
  let current = 0;
  let playing = motion.matches;
  let timer;
  heroControls.hidden = false;

  function showSlide(position) {
    current = (position + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      links[i].hidden = i !== current;
      dots[i].setAttribute('aria-pressed', String(i === current));
    });
  }

  function updateRotation() {
    clearTimeout(timer);
    rotation.setAttribute('aria-pressed', String(playing));
    const rotating = playing && !document.hidden && !heroControls.matches(':hover, :focus-within');
    slideTitle.setAttribute('aria-live', rotating ? 'off' : 'polite');
    if (rotating) timer = setTimeout(() => {
      showSlide(current + 1);
      updateRotation();
    }, 3000);
  }

  for (const event of ['mouseenter', 'mouseleave', 'focusin', 'focusout']) {
    heroControls.addEventListener(event, () => queueMicrotask(updateRotation));
  }
  document.addEventListener('visibilitychange', updateRotation);
  motion.addEventListener('change', () => {
    if (!motion.matches) playing = false;
    updateRotation();
  });

  heroControls.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button === rotation) playing = !playing;
    else showSlide(button.hasAttribute('data-hero-step') ? current + Number(button.dataset.heroStep) : Number(button.dataset.heroIndex));
    updateRotation();
  });
  heroControls.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    showSlide(current + (event.key === 'ArrowRight' ? 1 : -1));
    dots[current].focus();
  });
  updateRotation();
}

themeToggle.hidden = false;
themeToggle.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
themeToggle.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(dark));
  try {
    localStorage.setItem('ride-theme', root.dataset.theme);
  } catch {
    // The current page can still switch themes when storage is unavailable.
  }
});

function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  if (!open) services.open = false;
}

function updateMenu() {
  menu.hidden = !mobile.matches;
  setMenu(false);
}

document.documentElement.classList.add('menu-ready');
updateMenu();
mobile.addEventListener('change', updateMenu);
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') === 'false';
  setMenu(open);
  if (open) nav.querySelector('a')?.focus();
});
nav.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (services.open && services.contains(event.target)) {
    services.open = false;
    services.querySelector('summary').focus();
  } else if (menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});
nav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link && services.contains(link)) services.open = false;
  if (link && mobile.matches) {
    setMenu(false);
    if (link.pathname === location.pathname) document.querySelector('main').focus({ preventScroll: true });
  }
});
document.addEventListener('click', event => {
  if (services.open && !services.contains(event.target)) services.open = false;
});

const languageMenu = document.querySelector('.language-menu');
const languageSummary = languageMenu.querySelector('summary');
const languageStatus = languageMenu.querySelector('.language-status');
const languageButtons = [...languageMenu.querySelectorAll('[data-language]')];
const translations = new Map();
const languageCodes = new Set(languageButtons.map(button => button.dataset.language));
const textNodes = new Map();
const attributes = new Map();
let translating = false;
languageMenu.hidden = false;

languageMenu.addEventListener('keydown', event => {
  if (event.key === 'Escape' && languageMenu.open) {
    languageMenu.open = false;
    languageSummary.focus();
  }
});
document.addEventListener('click', event => {
  if (!languageMenu.contains(event.target)) languageMenu.open = false;
});

function rememberOriginals() {
  if (textNodes.size) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (parent && /\p{L}/u.test(node.data) && !parent.closest('[translate="no"], script, noscript')) {
      textNodes.set(node, node.data);
    }
  }
  for (const element of document.querySelectorAll('[alt], [aria-label], [title]')) {
    if (element.closest('[translate="no"]')) continue;
    for (const attr of element.attributes) {
      if (['alt', 'aria-label', 'title'].includes(attr.name) && attr.value) attributes.set(attr, attr.value);
    }
  }
}

async function selectLanguage(language, closeMenu = false) {
  if (!languageCodes.has(language) || translating) return;
  translating = true;
  try {
    rememberOriginals();
    let dictionary;
    if (language !== 'de' && !translations.has(language)) {
      languageStatus.textContent = 'Übersetzung wird geladen …';
      const response = await fetch('/assets/translations/' + language + '.json');
      if (!response.ok) throw new Error('Translation file unavailable');
      translations.set(language, await response.json());
    }
    dictionary = translations.get(language);
    const translate = source => {
      const key = source.trim();
      return dictionary && Object.hasOwn(dictionary, key) ? source.replace(key, () => dictionary[key]) : source;
    };
    for (const [node, source] of textNodes) node.data = translate(source);
    for (const [attr, source] of attributes) attr.value = translate(source);
    document.documentElement.lang = language;
    for (const button of languageButtons) button.setAttribute('aria-pressed', String(button.dataset.language === language));
    languageStatus.textContent = '';
    if (closeMenu) {
      languageMenu.open = false;
      languageSummary.focus();
    }
    try { localStorage.setItem('ride-language', language); } catch {}
  } catch {
    languageStatus.textContent = 'Übersetzung konnte nicht geladen werden. Bitte versuchen Sie es erneut.';
  } finally {
    translating = false;
  }
}

languageMenu.addEventListener('click', event => {
  const language = event.target.closest('[data-language]')?.dataset.language;
  if (language) void selectLanguage(language, true);
});
try {
  const savedLanguage = localStorage.getItem('ride-language');
  if (savedLanguage && savedLanguage !== 'de') void selectLanguage(savedLanguage);
} catch {}

const form = document.querySelector('form[data-mail]');
if (form) form.hidden = false;
form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const date = data.get('date').split('-').reverse().join('.');
  const body = [
    'Guten Tag,', '', 'ich möchte eine Fahrt anfragen.', '',
    'Termin: ' + date + ' um ' + data.get('time') + ' Uhr',
    'Abholort: ' + data.get('pickup').trim(),
    'Zielort: ' + data.get('destination').trim(),
    'Rückfahrt: ' + (data.has('return') ? 'Ja' : 'Nein'),
    'Rückrufnummer: ' + data.get('callback').trim(), '',
    'Vielen Dank',
  ].join('\r\n');
  form.querySelector('.form-status').hidden = false;
  window.location.href = form.dataset.mail + '?subject=' + encodeURIComponent('Fahrtanfrage Köln') + '&body=' + encodeURIComponent(body);
});

if ('IntersectionObserver' in window) {
  const targets = document.querySelectorAll('.quick, .ride-intro > div, .showcase-card, .process-steps li, .home-guide .split > *, .home-faq-layout > *, .home-booking-banner');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('motion-pending');
      entry.target.classList.add('motion-seen');
      observer.unobserve(entry.target);
    }
  });

  function updateMotion() {
    observer.disconnect();
    for (const target of targets) {
      const animate = motion.matches && !target.classList.contains('motion-seen') && target.getBoundingClientRect().top >= window.innerHeight;
      target.classList.toggle('motion-pending', animate);
      if (animate) observer.observe(target);
      else target.classList.add('motion-seen');
    }
  }

  updateMotion();
  motion.addEventListener('change', updateMotion);
}
