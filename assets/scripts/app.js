(() => {
  const SUPPORTED = ["en", "cs", "pt", "it", "ru"];
  const contentPage = "home";
  const basePath = ""; // root-relative fetches

  const initialLang = (() => {
    const parts = window.location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const candidate = parts[0];
    if (SUPPORTED.includes(candidate)) return candidate;
    const stored = localStorage.getItem("preferredLang");
    if (SUPPORTED.includes(stored)) return stored;
    const browser = navigator.language?.slice(0,2);
    return SUPPORTED.includes(browser) ? browser : "en";
  })();

  let shellReady = false;
  let pendingLang = null;
  const els = {};

  async function initShell() {
    const html = await fetch(`${basePath}/template.html`).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tpl = doc.querySelector("template#site-shell");
    const fragment = tpl.content.cloneNode(true);
    document.getElementById("app").appendChild(fragment);
    cacheElements();
    buildSwitch();
    shellReady = true;
    if (pendingLang) loadLang(pendingLang);
  }

  function cacheElements() {
    els.heroTitle = document.getElementById("hero-title");
    els.heroTagline = document.getElementById("hero-tagline");
    els.heroLede = document.getElementById("hero-lede");
    els.footer = document.getElementById("footer-note");
    els.langSwitch = document.getElementById("lang-switch");
    els.breadcrumbs = document.getElementById("breadcrumbs");
    els.contentSlot = document.getElementById("content-slot");
  }

  async function loadLang(lang) {
    if (!shellReady) { pendingLang = lang; return; }
    try {
      const res = await fetch(`${basePath}/locales/${lang}.json`);
      if (!res.ok) throw new Error("Failed to load locale");
      const data = await res.json();
      applyContent(data, lang);
      localStorage.setItem("preferredLang", lang);
      updateUrl(lang, data);
      activateSwitch(lang);
      await loadPageContent(lang, data);
    } catch (err) {
      console.error(err);
    }
  }

  function applyContent(data, lang) {
    document.documentElement.lang = data.meta?.lang || lang;
    document.documentElement.dir = data.meta?.dir || "ltr";
    document.title = data.hero?.title || "Rove Monteux";
    setText(els.heroTitle, data.hero?.title);
    setText(els.heroTagline, data.hero?.tagline);
    setText(els.heroLede, data.hero?.lede);
    setText(els.footer, data.footer?.note);
    renderBreadcrumbs(data, lang);
  }

  async function loadPageContent(lang, data) {
    const slug = data.slugs?.[contentPage] || contentPage;
    const file = `${basePath}/content/${contentPage}-${lang}.html`;
    try {
      const html = await fetch(file).then(r => r.text());
      els.contentSlot.innerHTML = html;
      setTextById("links-title", data.sections?.linksTitle);
      renderCards(data.sections?.cards || []);
    } catch (err) {
      console.error("Content load failed", err);
      els.contentSlot.innerHTML = "";
    }
  }

  function renderBreadcrumbs(data, lang) {
    const label = data.breadcrumbs?.[contentPage] || data.breadcrumbs?.home || "Home";
    const slug = data.slugs?.[contentPage] || contentPage;
    els.breadcrumbs.innerHTML = "";
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `${basePath}/${lang}/${slug}/`;
    a.textContent = label;
    li.appendChild(a);
    els.breadcrumbs.appendChild(li);
  }

  function setText(el, value) {
    if (el && value) el.textContent = value;
  }

  function setTextById(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function renderCards(cards) {
    const container = document.getElementById("cards");
    if (!container) return;
    container.innerHTML = "";
    cards.forEach(card => {
      const div = document.createElement("div");
      div.className = "card";
      const strong = document.createElement("strong");
      strong.textContent = card.title;
      div.appendChild(strong);
      const linkSpan = document.createElement("span");
      card.links?.forEach((l, idx) => {
        const a = document.createElement("a");
        a.href = l.href;
        a.textContent = l.label;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        linkSpan.appendChild(a);
        if (idx < card.links.length - 1) linkSpan.append(" · ");
      });
      div.appendChild(linkSpan);
      container.appendChild(div);
    });
  }

  function buildSwitch() {
    const switcher = els.langSwitch;
    switcher.innerHTML = "";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    switcher.appendChild(thumb);
    SUPPORTED.forEach(lang => {
      const btn = document.createElement("button");
      btn.dataset.lang = lang;
      btn.textContent = labelFor(lang);
      btn.addEventListener("click", () => loadLang(lang));
      switcher.appendChild(btn);
    });
    requestAnimationFrame(() => activateSwitch(initialLang));
  }

  function labelFor(lang) {
    const labels = { en: "EN", cs: "CS", pt: "PT", it: "IT", ru: "RU" };
    return labels[lang] || lang.toUpperCase();
  }

  function activateSwitch(lang) {
    const switcher = els.langSwitch;
    const buttons = Array.from(switcher.querySelectorAll("button"));
    const idx = buttons.findIndex(b => b.dataset.lang === lang);
    buttons.forEach((b, i) => b.classList.toggle("active", i === idx));
    const thumb = switcher.querySelector(".thumb");
    if (idx >= 0) {
      const target = buttons[idx];
      thumb.style.width = target.offsetWidth + "px";
      thumb.style.transform = `translateX(${target.offsetLeft - 6}px)`;
    }
  }

  function updateUrl(lang, data) {
    const slug = data.slugs?.[contentPage] || contentPage;
    const newPath = `/${lang}/${slug}/`.replace(/\/+/, "/");
    const newUrl = `${window.location.origin}${newPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState({ lang }, "", newUrl);
  }

  initShell();
  loadLang(initialLang);
})();
