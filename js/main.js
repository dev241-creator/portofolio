/* =========================================================
   Mark Davis — Portfolio interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Preloader / intro ---------- */
  const start = performance.now();
  const MIN_LOADER = reduceMotion ? 0 : 1100;
  let ready = false;

  function setReady() {
    if (ready) return;
    ready = true;
    const wait = Math.max(0, MIN_LOADER - (performance.now() - start));
    setTimeout(() => {
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      updateIndicator();
      // hero counter starts with the intro
      $$(".hero [data-count]").forEach((el) => setTimeout(() => countUp(el), 1300));
    }, wait);
  }
  if (document.readyState === "complete") setReady();
  else window.addEventListener("load", setReady);
  setTimeout(setReady, 3000); // safety net if an asset hangs

  /* ---------- Stagger helpers ---------- */
  $$(".side-nav a").forEach((a, i) => a.style.setProperty("--i", i));
  $$("[data-stagger]").forEach((group) => {
    $$(":scope > [data-reveal]", group).forEach((el, i) => el.style.setProperty("--rd", `${i * 0.1}s`));
  });

  // SVG strokes that "draw" in the hero
  $$(".hero__deco .draw").forEach((p) => p.setAttribute("pathLength", "1"));

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-in");
        revealIO.unobserve(el);
        // drop the stagger delay once revealed so hover effects stay snappy
        const delay = parseFloat(getComputedStyle(el).getPropertyValue("--rd")) || 0;
        setTimeout(() => el.style.setProperty("--rd", "0s"), (delay + 1.2) * 1000);
        $$("[data-count]", el).forEach((c) => countUp(c));
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ---------- Counters ---------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    const dur = 1800;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll: progress, topbar, scroll-spy ---------- */
  const topbar = $(".topbar");
  const progress = $(".scroll-progress span");
  const sections = $$("main section[id]");
  const spyLinks = $$("[data-spy]");
  const sideNav = $(".side-nav");
  const indicator = $(".side-nav__indicator");
  let currentId = "home";

  function setActive(id) {
    if (id === currentId) return;
    currentId = id;
    spyLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === id));
    updateIndicator();
  }

  function updateIndicator() {
    if (!indicator || !sideNav) return;
    const active = $(`.side-nav a[data-spy="${currentId}"]`);
    if (!active) { indicator.style.opacity = "0"; return; }
    indicator.style.opacity = "1";
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.setProperty("--y", `${active.offsetTop}px`);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.parentElement.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
      if (topbar) topbar.classList.toggle("is-scrolled", y > 24);

      const line = window.innerHeight * 0.4;
      let id = sections[0] ? sections[0].id : "home";
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= line) id = s.id;
      }
      if (y >= max - 4 && sections.length) id = sections[sections.length - 1].id;
      setActive(id);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { updateIndicator(); onScroll(); });
  onScroll();

  /* ---------- Mobile drawer ---------- */
  const openNav = () => body.classList.add("nav-open");
  const closeNav = () => body.classList.remove("nav-open");
  $$("[data-nav-open]").forEach((b) => b.addEventListener("click", openNav));
  $$("[data-nav-close]").forEach((b) => b.addEventListener("click", () => body.classList.contains("nav-open") && closeNav()));

  /* ---------- Cursor glow ---------- */
  const glow = $(".cursor-glow");
  if (glow && finePointer && !reduceMotion) {
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy, glowRaf = null;
    const loop = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      glowRaf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.3 ? requestAnimationFrame(loop) : null;
    };
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      body.classList.add("has-pointer");
      if (!glowRaf) glowRaf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener("pointerleave", () => body.classList.remove("has-pointer"));
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Spotlight cards ---------- */
  $$(".spot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- 3D tilt on project cards ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 11).toFixed(2)}deg) translateY(-6px)`;
        el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
        el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Hero parallax ---------- */
  const hero = $(".hero");
  const layers = $$("[data-depth]");
  if (hero && layers.length && finePointer && !reduceMotion) {
    let px = 0, py = 0, cx = 0, cy = 0, raf = null;
    const render = () => {
      cx += (px - cx) * 0.08;
      cy += (py - cy) * 0.08;
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth) || 0;
        l.style.translate = `${(cx * d).toFixed(2)}px ${(cy * d).toFixed(2)}px`;
      });
      raf = Math.abs(px - cx) + Math.abs(py - cy) > 0.001 ? requestAnimationFrame(render) : null;
    };
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(render);
    });
    hero.addEventListener("pointerleave", () => {
      px = 0; py = 0;
      if (!raf) raf = requestAnimationFrame(render);
    });
  }

  /* ---------- Testimonials carousel ---------- */
  const carousel = $(".carousel");
  if (carousel) {
    const viewport = $(".carousel__viewport", carousel);
    const track = $(".carousel__track", carousel);
    const slides = $$(".testimonial", track);
    const dotsWrap = $(".carousel__dots", carousel);
    let index = 0;
    let per = 3;
    let timer = null;
    let hovering = false;
    let inView = false;

    const getPer = () => parseInt(getComputedStyle(carousel).getPropertyValue("--per"), 10) || 1;
    const maxIndex = () => Math.max(0, slides.length - per);
    const step = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return slides[0].offsetWidth + gap; // offsetWidth ignores the scale() on hidden slides
    };

    function buildDots() {
      const count = maxIndex() + 1;
      if (dotsWrap.children.length === count) return;
      dotsWrap.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", `Aller au témoignage ${i + 1}`);
        b.addEventListener("click", () => { go(i); restart(); });
        dotsWrap.appendChild(b);
      }
    }

    function render() {
      track.style.transform = `translate3d(${-index * step()}px, 0, 0)`;
      slides.forEach((s, i) => {
        const visible = i >= index && i < index + per;
        s.classList.toggle("is-visible", visible);
        s.setAttribute("aria-hidden", visible ? "false" : "true");
      });
      Array.from(dotsWrap.children).forEach((d, i) => {
        d.classList.toggle("is-active", i === index);
        d.setAttribute("aria-selected", i === index ? "true" : "false");
      });
    }

    function go(i) {
      const m = maxIndex();
      index = i > m ? 0 : i < 0 ? m : i;
      render();
    }

    function restart() {
      clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(() => { if (!hovering && inView && !document.hidden) go(index + 1); }, 5000);
    }

    $(".carousel__btn--prev", carousel).addEventListener("click", () => { go(index - 1); restart(); });
    $(".carousel__btn--next", carousel).addEventListener("click", () => { go(index + 1); restart(); });
    carousel.addEventListener("mouseenter", () => (hovering = true));
    carousel.addEventListener("mouseleave", () => (hovering = false));
    carousel.addEventListener("focusin", () => (hovering = true));
    carousel.addEventListener("focusout", () => (hovering = false));

    new IntersectionObserver((e) => { inView = e[0].isIntersecting; }, { threshold: 0.3 }).observe(carousel);

    // swipe / drag
    let startX = 0, dx = 0, dragging = false, base = 0;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true; startX = e.clientX; dx = 0; base = -index * step();
      track.classList.add("no-anim");
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      track.style.transform = `translate3d(${base + dx}px, 0, 0)`;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("no-anim");
      viewport.classList.remove("is-dragging");
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      else render();
      restart();
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { go(index + 1); restart(); }
      if (e.key === "ArrowLeft") { go(index - 1); restart(); }
    });

    const setup = () => {
      per = getPer();
      buildDots();
      go(Math.min(index, maxIndex()));
    };
    window.addEventListener("resize", setup);
    setup();
    restart();
  }

  /* ---------- Contact form ---------- */
  const form = $(".contact__form");
  const toast = $(".toast");
  if (form) {
    const status = $(".form-status", form);
    const btn = $(".send-btn", form);
    const label = $(".send-btn__label", form);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    $$("input, textarea", form).forEach((f) =>
      f.addEventListener("input", () => f.closest(".field").classList.remove("is-invalid"))
    );

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let firstBad = null;
      $$(".field", form).forEach((field) => {
        const input = $("input, textarea", field);
        const value = input.value.trim();
        const bad = !value || (input.type === "email" && !emailRe.test(value));
        field.classList.remove("is-invalid");
        if (bad) {
          void field.offsetWidth; // restart shake animation
          field.classList.add("is-invalid");
          firstBad = firstBad || input;
        }
      });
      if (firstBad) {
        status.textContent = "Merci de remplir tous les champs avec un email valide.";
        firstBad.focus();
        return;
      }
      status.textContent = "";
      btn.classList.add("is-sending");
      label.textContent = "Envoi en cours…";

      // No backend here: simulate the request. Plug your service (Formspree, EmailJS, API…) in place of this timeout.
      setTimeout(() => {
        btn.classList.remove("is-sending");
        btn.classList.add("is-sent");
        label.textContent = "Message envoyé !";
        form.reset();
        showToast();
        setTimeout(() => {
          btn.classList.remove("is-sent");
          label.textContent = "Envoyer le message";
        }, 3200);
      }, 1300);
    });
  }

  let toastTimer;
  function showToast() {
    if (!toast) return;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
  }

  /* ---------- Intro modal ---------- */
  const modal = $("#modal-intro");
  let lastFocus = null;
  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    body.classList.add("modal-open");
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
    setTimeout(() => $(".modal__close", modal).focus(), 50);
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    body.classList.remove("modal-open");
    setTimeout(() => { modal.hidden = true; }, reduceMotion ? 0 : 500);
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-modal-open]").forEach((b) => b.addEventListener("click", openModal));
  $$("[data-modal-close]").forEach((b) => b.addEventListener("click", closeModal));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeModal();
    closeNav();
  });

  /* ---------- Footer year ---------- */
  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Topographic lines (sidebar) ---------- */
  const topo = $(".sidebar__topo");
  if (topo && topo.getContext) {
    const ctx = topo.getContext("2d");
    const sidebar = $(".sidebar");
    let w = 0, h = 0, grad = null, running = false, visible = true, last = 0;
    const fields = [
      { x: 0.3, y: 0.86, rings: 15, base: 0.03, gap: 0.03, seed: 1.7, sy: 0.82 },
      { x: 1.05, y: 0.66, rings: 9, base: 0.04, gap: 0.035, seed: 4.2, sy: 0.9 },
      { x: -0.05, y: 1.08, rings: 8, base: 0.05, gap: 0.04, seed: 2.9, sy: 0.75 },
    ];

    function resize() {
      const r = topo.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      if (!w || !h) return;
      topo.width = Math.round(w * dpr);
      topo.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grad = ctx.createLinearGradient(0, h * 0.4, w, h);
      grad.addColorStop(0, "#5b6cff");
      grad.addColorStop(0.5, "#a855f7");
      grad.addColorStop(1, "#f0609b");
    }

    function draw(t) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const S = Math.max(w, h);
      ctx.strokeStyle = grad;
      for (const f of fields) {
        for (let k = 0; k < f.rings; k++) {
          const r0 = (f.base + k * f.gap) * S;
          ctx.beginPath();
          const steps = 96;
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const n =
              Math.sin(a * 3 + f.seed + k * 0.33 + t * 0.00022) * 0.15 +
              Math.sin(a * 5 - f.seed * 2 + k * 0.21 - t * 0.00017) * 0.06 +
              Math.sin(a * 2 + k * 0.47 + t * 0.00012) * 0.09;
            const r = r0 * (1 + n);
            const x = f.x * w + Math.cos(a) * r;
            const y = f.y * h + Math.sin(a) * r * f.sy;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.globalAlpha = k % 5 === 0 ? 0.55 : 0.26;
          ctx.lineWidth = k % 5 === 0 ? 1.2 : 0.9;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (!running) return;
      if (now - last > 33) { draw(now); last = now; } // ~30fps is plenty for slow drift
      requestAnimationFrame(loop);
    }
    function startLoop() {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      requestAnimationFrame(loop);
    }
    const stopLoop = () => { running = false; };

    resize();
    draw(0);
    new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(sidebar);
    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      visible ? startLoop() : stopLoop();
    }).observe(sidebar);
    document.addEventListener("visibilitychange", () => (document.hidden ? stopLoop() : startLoop()));
    startLoop();
  }
})();
