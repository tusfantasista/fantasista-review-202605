(function () {
  const assetLink = document.querySelector('link[href*="assets/css/"]');
  const assetPrefix = assetLink ? assetLink.getAttribute("href").split("assets/css/")[0] : "./";

  function initMobileMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const header = document.querySelector(".site-header, .header");
    const nav = document.getElementById(toggle ? toggle.getAttribute("aria-controls") : "site-nav");

    if (!header || !toggle || !nav) return;

    function setMenuOpen(open) {
      header.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", function () {
      setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenuOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 861px)").matches) setMenuOpen(false);
    });
  }

  function initTopButton() {
    const button = document.createElement("button");
    button.className = "top-button";
    button.type = "button";
    button.textContent = "↑";
    button.setAttribute("aria-label", "トップへ戻る");
    document.body.appendChild(button);

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    function update() {
      button.classList.toggle("is-visible", window.scrollY > 520);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initSmoothScroll() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initActiveSectionNav() {
    const links = Array.from(document.querySelectorAll('.site-nav a[href*="#"], .nav a[href^="#"]'));
    if (!links.length) return;

    const pairs = links
      .map((link) => {
        const hash = link.hash || link.getAttribute("href");
        return { link, section: hash ? document.querySelector(hash) : null };
      })
      .filter((item) => item.section);

    if (!pairs.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          pairs.forEach((item) => item.link.classList.toggle("is-section-active", item.section === entry.target));
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
    );

    pairs.forEach((item) => observer.observe(item.section));
  }

  function setupFilter(toolbarSelector, itemSelector, getValue) {
    const toolbar = document.querySelector(toolbarSelector);
    const items = Array.from(document.querySelectorAll(itemSelector));
    if (!toolbar || !items.length) return;

    toolbar.addEventListener("click", function (event) {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      const value = button.dataset.filter;
      toolbar.querySelectorAll("[data-filter]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      items.forEach((item) => {
        const match = value === "all" || getValue(item) === value;
        item.classList.toggle("is-filter-hidden", !match);
      });
    });
  }

  function initFilters() {
    document.querySelectorAll(".archive-item").forEach((item) => {
      const time = item.querySelector("time");
      if (time && !item.dataset.year) item.dataset.year = time.dateTime.slice(0, 4);
    });

    setupFilter("[data-archive-filter]", ".archive-item", (item) => item.dataset.year);
    setupFilter("[data-doc-filter]", "[data-doc-category]", (item) => item.dataset.docCategory);
  }

  function initLightbox() {
    const links = Array.from(document.querySelectorAll('.gallery-thumb-card[href$=".jpg"], .gallery-photo-card a[href$=".jpg"]'));
    if (!links.length) return;

    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.hidden = true;
    lightbox.innerHTML = '<button class="lightbox__close" type="button" aria-label="閉じる">×</button><div class="lightbox__dialog" role="dialog" aria-modal="true"><img class="lightbox__image" alt="" /><p class="lightbox__caption"></p></div>';
    document.body.appendChild(lightbox);

    const image = lightbox.querySelector(".lightbox__image");
    const caption = lightbox.querySelector(".lightbox__caption");
    const close = lightbox.querySelector(".lightbox__close");

    function hide() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
    }

    links.forEach((link) => {
      link.addEventListener("click", function (event) {
        const img = link.querySelector("img");
        event.preventDefault();
        image.src = link.href;
        image.alt = img ? img.alt : "";
        caption.textContent = img ? img.alt : "";
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        close.focus();
      });
    });

    close.addEventListener("click", hide);
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) hide();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !lightbox.hidden) hide();
    });
  }

  function initFestaQuickLink() {
    if (location.pathname.includes("/festa-60th/")) return;
    const link = document.createElement("a");
    link.className = "festa-quick-link";
    link.href = assetPrefix + "festa-60th/";
    link.textContent = "60周年FESTA 特設ページ";
    document.body.appendChild(link);
  }

  function initSampleData() {
    const target = document.querySelector("[data-sample-data]");
    if (!target || !window.fetch) return;

    fetch("../assets/data/site-metrics.json")
      .then((response) => response.json())
      .then((data) => {
        const festa = data.festaAttendance || [];
        const max = Math.max.apply(null, festa.map((item) => item.participants));
        const chart = festa.map((item) => {
          const width = Math.round((item.participants / max) * 100);
          return '<div class="data-chart__row"><strong>' + item.year + '</strong><div class="data-chart__bar"><span style="width:' + width + '%"></span></div><span>' + item.participants + '名</span></div>';
        }).join("");

        const rows = (data.annualEvents || []).map((item) => {
          return "<tr><td>" + item.year + "</td><td>" + item.name + "</td><td>" + item.category + "</td><td>" + item.status + "</td></tr>";
        }).join("");

        target.innerHTML =
          '<div class="data-source-panel"><article class="data-source-card"><h3>FESTA参加者数の推移</h3><div class="data-chart">' +
          chart +
          '</div></article><article class="data-source-card"><h3>年度別イベント一覧</h3><div class="data-table-wrap"><table class="data-table"><thead><tr><th>年度</th><th>名称</th><th>カテゴリ</th><th>状態</th></tr></thead><tbody>' +
          rows +
          "</tbody></table></div></article></div>";
      })
      .catch(() => {
        target.innerHTML = '<p class="form-note">サンプルデータを読み込めませんでした。ローカルで確認する場合はHTTPサーバー経由で開いてください。</p>';
      });
  }

  initMobileMenu();
  initTopButton();
  initSmoothScroll();
  initActiveSectionNav();
  initFilters();
  initLightbox();
  initFestaQuickLink();
  initSampleData();
})();
