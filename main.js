// Comportamiento del sitio: tema claro/oscuro, encabezado, menú móvil, carrusel del banner y aparición de secciones.
document.documentElement.classList.add('js');

const root = document.documentElement;
const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');

/* ---- Tema claro / oscuro (el valor inicial lo fija el script del <head>) ---- */
const themeSwitch = document.querySelector('.theme-switch');
themeSwitch.setAttribute('aria-checked', String(root.dataset.theme === 'dark')); // estado inicial para lectores de pantalla
themeSwitch.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  themeSwitch.setAttribute('aria-checked', String(next === 'dark'));
  try { localStorage.setItem('tema', next); } catch (e) { /* sin almacenamiento: no se recuerda */ }
});

/* ---- Encabezado: toma los colores del tema al bajar ---- */
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---- Menú móvil ---- */
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', e => {
  if (e.target.closest('a')) {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---- Carrusel del banner ----
   Cada escena dura data-ms (por defecto SLIDE_MS). Si tiene data-video se reproduce (mudo, en bucle)
   solo mientras está activa. Con data-fit="contain" (videos verticales) se muestra completo sobre
   una copia desenfocada de sí mismo. Se frena con la pestaña oculta o si el sistema pide menos movimiento. */
const SLIDE_MS = 5000;
const hero = document.querySelector('.hero');
const slides = [...hero.querySelectorAll('.hero-slide')];
const dots = [...hero.querySelectorAll('.hero-dots button')];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 0;
let timer = null;
const durationOf = i => Number(slides[i].dataset.ms) || SLIDE_MS;

function makeVideo(src, cls) {
  const v = document.createElement('video');
  v.className = cls;
  v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('playsinline', '');
  v.src = src;
  v.addEventListener('playing', () => v.classList.add('ready'), { once: true }); // aparece con fundido al empezar
  return v;
}

// Crea los <video> de una escena la primera vez que hacen falta (y el de fondo desenfocado si es vertical)
function ensureVideo(slide) {
  const src = slide.dataset.video;
  if (!src) return null;
  let main = slide.querySelector('video.main');
  if (!main) {
    if (slide.dataset.fit === 'contain') slide.appendChild(makeVideo(src, 'bg'));
    main = makeVideo(src, 'main');
    slide.appendChild(main);
  }
  return main;
}
const playAll = (slide, on) => slide.querySelectorAll('video').forEach(v => {
  // data-start: segundo desde el que arranca el video de la escena (por defecto 0)
  if (on) { v.currentTime = Number(slide.dataset.start) || 0; v.play().catch(() => {}); } else v.pause();
});

function show(i) {
  current = (i + slides.length) % slides.length;
  slides.forEach((s, n) => {
    const on = n === current;
    s.classList.toggle('active', on);
    if (on) ensureVideo(s);
    playAll(s, on);
  });
  ensureVideo(slides[(current + 1) % slides.length]); // precarga la siguiente para que no haya salto
  dots.forEach((d, n) => {
    d.classList.remove('active');
    if (n === current) {
      d.style.setProperty('--slide-ms', `${durationOf(current)}ms`);
      void d.offsetWidth; // reinicia la barra de progreso
      d.classList.add('active');
    }
  });
}

function stop() { clearTimeout(timer); timer = null; }
function start() {
  stop();
  if (reduceMotion || slides.length < 2) { hero.classList.add('paused'); return; }
  hero.classList.remove('paused');
  timer = setTimeout(() => { show(current + 1); start(); }, durationOf(current));
}

dots.forEach((d, n) => d.addEventListener('click', () => { show(n); start(); }));
document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
show(0);
start();

/* ---- Tarjetas expandibles (Clases y Nosotros): se abren al pasar el mouse (escritorio) o al tocar/Enter (resto) ----
   Con mouse el hover alcanza; el clic se ignora para que no cierre lo que el hover acaba de abrir.
   Cada grupo .people funciona por separado. */
const hoverDevice = matchMedia('(hover: hover) and (min-width: 961px)');

document.querySelectorAll('.people').forEach(group => {
  const cards = [...group.querySelectorAll('.person')];

  const setActive = card => {
    cards.forEach(c => {
      const on = c === card;
      c.classList.toggle('active', on);
      c.setAttribute('aria-expanded', String(on));
    });
    group.classList.toggle('has-active', Boolean(card));
  };
  const toggleCard = card => setActive(card.classList.contains('active') ? null : card);

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => { if (hoverDevice.matches) setActive(card); });
    card.addEventListener('click', () => { if (!hoverDevice.matches) toggleCard(card); });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
      if (e.key === 'Escape') setActive(null);
    });
  });
  group.addEventListener('mouseleave', () => { if (hoverDevice.matches) setActive(null); });
  hoverDevice.addEventListener('change', () => setActive(null)); // al cambiar de modo (girar tablet, etc.) se resetea
});

/* ---- Botón flotante: se muestra cuando el banner principal ya no ocupa la mayor parte de la pantalla ---- */
const fab = document.querySelector('.fab');
new IntersectionObserver(([e]) => fab.classList.toggle('show', e.intersectionRatio < 0.5), { threshold: [0, 0.25, 0.5, 0.75, 1] })
  .observe(hero);

/* ---- Cada bloque .reveal aparece una sola vez al entrar en pantalla ---- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`; // escalonado leve en grillas
  io.observe(el);
});
