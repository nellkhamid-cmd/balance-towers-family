/* =========================================================================
   «Баланс Тауэрс» — лендинг «Семейные квартиры бизнес-класса»
   Без библиотек: мягкое появление блоков, шапка и мобильная кнопка,
   квиз Marquiz в окне по кнопкам «Подобрать квартиру», одна форма «Получить каталог», видео по клику.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- Настройки внедрения ---------- */
  const CONFIG = {
    FORM_ENDPOINT: "",              // URL обработчика заявок (CRM / вебхук). Пусто: заявка никуда не уходит, показывается только экран успеха
    YM_COUNTER: null,               // номер счётчика Яндекс Метрики (на /family стоит 111595291)
    GOAL: "family_catalog",
    QUIZ_ID: "6aed6ebedb3d61000ff6911d",
    OFFER: "Семейные квартиры от 210 000 ₽/м² (offer=semya210)"
  };

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const root = document.documentElement;
  if (/[?&]check\b/.test(location.search)) root.classList.add("check-mode");

  /* ---------- Мягкое появление при прокрутке ---------- */
  const items = $$("[data-fade]");
  // небольшая задержка по порядку внутри одного родителя: карточки и пункты идут друг за другом
  items.forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(n => n.hasAttribute("data-fade"));
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 5));
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add("is-in"));
  }

  /* ---------- Шапка и мобильная кнопка после первого экрана ---------- */
  const bar = $("#bar"), dock = $("#dock");
  if ("IntersectionObserver" in window) {
    let pastHero = false, inQuiz = false;
    const sync = () => { bar.classList.toggle("is-on", pastHero); dock.classList.toggle("is-on", pastHero && !inQuiz); };
    new IntersectionObserver(e => { pastHero = !e[0].isIntersecting; sync(); }, { threshold: .05 }).observe($(".hero"));
    new IntersectionObserver(e => { inQuiz = e[0].isIntersecting; sync(); }, { threshold: .2 }).observe($("#quiz"));
  }

  /* ---------- Квиз: кнопки «Подобрать квартиру» открывают его в окне ---------- */
  const QUIZ_PAGE = "https://mrqz.me/" + CONFIG.QUIZ_ID;
  // страница открыта из папки (file://): Marquiz строит адреса квиза без протокола, и они не грузятся
  const isFile = location.protocol === "file:";
  // делегирование: работает и для ссылки «Открыть квиз», которая появляется позже
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-quiz]");
    if (!a) return;
    if (!window.Marquiz || isFile) {
      // скрипт Marquiz не загрузился (блокировщик, сеть) — открываем квиз отдельной страницей
      e.preventDefault();
      window.open(QUIZ_PAGE, "_blank", "noopener");
    } else if (typeof window.Marquiz.showModal === "function") {
      e.preventDefault();
      window.Marquiz.showModal(CONFIG.QUIZ_ID);
    }
    // иначе срабатывает ссылка #popup:marquiz_… — Marquiz перехватывает её сам
  });

  /* ---------- Встроенный квиз: прячем «загрузку», когда появился iframe ---------- */
  const frame = $("#quizFrame");
  // запасной вариант: вставляем квиз сами, по https
  const directQuiz = () => {
    // Marquiz мог успеть заменить свой блок — убираем всё, кроме заглушки, и вставляем iframe
    Array.from(frame.children).forEach(n => { if (!n.classList.contains("quiz__wait")) n.remove(); });
    const src = "https://quiz.marquiz.ru/" + CONFIG.QUIZ_ID + "?mode=inline" + (isFile ? "" : "&href=" + encodeURIComponent(location.href));
    frame.insertAdjacentHTML("afterbegin", '<iframe class="quiz__direct" src="' + src + '" title="Подбор квартиры" loading="lazy" allow="clipboard-write"></iframe>');
    frame.classList.add("is-ready");
  };
  if (frame && isFile) directQuiz();
  else if (frame && "MutationObserver" in window) {
    const mo = new MutationObserver(() => { if (frame.querySelector("iframe")) { mo.disconnect(); frame.classList.add("is-ready"); } });
    mo.observe(frame, { childList: true, subtree: true });
    // Marquiz не вставил квиз за 6 секунд — вставляем сами
    setTimeout(() => { if (!frame.classList.contains("is-ready")) { mo.disconnect(); directQuiz(); } }, 6000);
  }

  /* ---------- Видео: само стартует без звука, когда блок на экране; на телефоне лёгкая версия ---------- */
  const video = $("#video");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (video && !calm && "IntersectionObserver" in window) {
    video.muted = true; // без этого браузеры не дают автозапуск
    const load = () => { if (!video.src) { video.src = Math.min(innerWidth, innerHeight) < 800 ? video.dataset.srcSd : video.dataset.srcHd; video.preload = "auto"; } };
    // начинаем грузить заранее, за экран до блока
    new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: "100% 0px" }).observe(video);
    // играем, пока видно, и ставим на паузу, когда ушли
    new IntersectionObserver(e => {
      if (e[0].isIntersecting) { load(); video.play().catch(() => {}); } else video.pause();
    }, { threshold: .25 }).observe(video);
  }

  /* ---------- Окно «Получить каталог» ---------- */
  const dlg = $("#modal"), form = $("#leadForm"), success = $("#success");
  const openModal = () => {
    form.hidden = false; success.hidden = true;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(() => $("#f-name").focus({ preventScroll: true }), 50);
  };
  const closeModal = () => { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); };
  $$("[data-catalog]").forEach(b => b.addEventListener("click", openModal));
  $$("[data-close]", dlg).forEach(b => b.addEventListener("click", closeModal));
  dlg.addEventListener("click", e => { if (e.target === dlg) closeModal(); });

  /* ---------- Форма ---------- */
  const params = new URLSearchParams(location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => { if (params.get(k)) form.elements[k].value = params.get(k); });
  const { name, phone, consent, ads_consent: ads } = form.elements;
  const status = $(".form__status", form);
  const digits = v => v.replace(/\D/g, "");
  const fmt = v => {
    let n = digits(v);
    if (v.trim().startsWith("+7")) n = n.slice(1);
    else if (n.length >= 11 && /^[78]/.test(n)) n = n.slice(1);
    n = n.slice(0, 10);
    let out = "+7";
    if (n.length) out += " (" + n.slice(0, 3);
    if (n.length >= 3) out += ")";
    if (n.length > 3) out += " " + n.slice(3, 6);
    if (n.length > 6) out += "-" + n.slice(6, 8);
    if (n.length > 8) out += "-" + n.slice(8, 10);
    return out;
  };
  let tried = false;
  phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+7 "; });
  phone.addEventListener("blur", () => { if (digits(phone.value).length <= 1) phone.value = ""; });
  phone.addEventListener("input", () => {
    const end = phone.selectionStart === phone.value.length;
    phone.value = fmt(phone.value);
    if (end) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (tried) validate();
  });
  [name, consent, ads].forEach(el => { el.addEventListener("input", () => { if (tried) validate(); }); el.addEventListener("change", () => { if (tried) validate(); }); });

  function setErr(input, bad) {
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    const err = $("#" + input.id + "-err");
    if (err) err.hidden = !bad;
  }
  function validate() {
    const checks = [
      [name, name.value.trim().length >= 2],
      [phone, digits(phone.value).replace(/^7/, "").length === 10],
      [consent, consent.checked],
      [ads, ads.checked]
    ];
    let first = null;
    checks.forEach(([el, ok]) => { setErr(el, !ok); if (!ok && !first) first = el; });
    return first;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    tried = true;
    const bad = validate();
    if (bad) { bad.focus(); return; }
    const btn = $('[type="submit"]', form);
    if (btn.getAttribute("aria-busy") === "true") return; // защита от двойной отправки
    btn.setAttribute("aria-busy", "true");
    status.textContent = "Отправляем…";
    const data = Object.fromEntries(new FormData(form).entries());
    Object.assign(data, { consent: true, ads_consent: true, request: "Каталог", offer: CONFIG.OFFER, page: location.href, submitted_at: new Date().toISOString() });
    try {
      if (CONFIG.FORM_ENDPOINT) {
        const res = await fetch(CONFIG.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error("HTTP " + res.status);
      } else {
        await new Promise(r => setTimeout(r, 400));
        console.warn("[Баланс] FORM_ENDPOINT не задан: заявка никуда не отправлена", data);
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: CONFIG.GOAL });
      if (window.ym && CONFIG.YM_COUNTER) window.ym(CONFIG.YM_COUNTER, "reachGoal", CONFIG.GOAL);
      status.textContent = "";
      form.reset(); tried = false;
      $$("[aria-invalid]", form).forEach(el => el.setAttribute("aria-invalid", "false"));
      form.hidden = true; success.hidden = false;
      success.focus({ preventScroll: true });
    } catch (err) {
      status.textContent = "Не получилось отправить. Проверьте интернет и попробуйте ещё раз.";
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });
})();
