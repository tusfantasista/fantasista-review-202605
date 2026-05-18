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
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
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

  function initMailtoForms() {
    const forms = Array.from(document.querySelectorAll("[data-mailto-form]"));
    if (!forms.length) return;

    const fieldLabels = {
      inquiry_type: "問い合わせ種別",
      full_name: "氏名",
      maiden_name: "旧姓・現姓",
      furigana: "ふりがな",
      graduation_year: "卒部年度",
      graduation_year_or_generation: "卒部年度または期",
      generation: "期",
      school_lineage: "所属校・系統",
      school_name: "所属校・団体名",
      school_or_group: "所属していた大学・団体",
      specialty: "専攻",
      affiliation: "所属区分",
      dance_role: "当時の役割",
      email: "メールアドレス",
      phone: "電話番号",
      contact_permission: "事務局からの連絡可否",
      festa60_info_permission: "60周年FESTA案内の受信可否",
      preferred_contact_method: "主な連絡希望手段",
      attendance_intent: "参加意向",
      companion_status: "同伴者の有無",
      guest_count: "同伴者人数",
      dance_time_intent: "ダンスタイム参加意向",
      photo_permission: "写真掲載・撮影に関する確認",
      volunteer_interest: "手伝い可否",
      sponsorship_interest: "協賛・寄付への関心",
      message: "本文・連絡事項",
      privacy_consent: "個人情報の取り扱いへの同意",
    };

    const hiddenFields = new Set(["form-name"]);

    function getFieldValue(form, name) {
      const fields = Array.from(form.elements).filter((field) => field.name === name);
      if (!fields.length) return "";

      if (fields[0].type === "radio") {
        const selected = fields.find((field) => field.checked);
        return selected ? getChoiceText(selected) : "";
      }

      if (fields[0].type === "checkbox") {
        const selected = fields.filter((field) => field.checked).map(getChoiceText);
        return selected.join("、");
      }

      const field = fields[0];
      if (field.tagName === "SELECT") {
        const option = field.options[field.selectedIndex];
        return option && option.value ? option.textContent.trim() : "";
      }

      return field.value ? field.value.trim() : "";
    }

    function getChoiceText(field) {
      const label = field.closest("label");
      return label ? label.textContent.trim() : field.value;
    }

    function getOrderedNames(form) {
      const names = [];
      Array.from(form.elements).forEach((field) => {
        if (!field.name || hiddenFields.has(field.name) || names.includes(field.name)) return;
        names.push(field.name);
      });
      return names;
    }

    function buildBody(form) {
      const names = getOrderedNames(form);
      const lines = [
        "FANTASISTA会 事務局 御中",
        "",
        "以下の内容で連絡します。",
        "このメール本文はFANTASISTA会サイト上で生成されたものです。個人情報はGitHub Pages上には保存されません。",
        "",
        "---- 入力内容 ----",
      ];

      names.forEach((name) => {
        const value = getFieldValue(form, name);
        if (!value) return;
        lines.push((fieldLabels[name] || name) + ": " + value);
      });

      lines.push("", "---- 管理メモ ----");
      lines.push("CSV/CRM移行時は、上記のname属性に対応する項目として取り込んでください。");
      return lines.join("\n");
    }

    function ensurePreview(form) {
      let preview = form.querySelector(".mailto-preview");
      if (preview) return preview;

      preview = document.createElement("div");
      preview.className = "mailto-preview";
      preview.setAttribute("role", "status");
      preview.setAttribute("aria-live", "polite");
      preview.hidden = true;
      preview.innerHTML =
        '<h3>送信内容の確認</h3><p>内容を確認し、メールソフトを開いて送信してください。開けない場合は本文をコピーして通常のメールに貼り付けられます。</p><textarea class="mailto-preview__body" readonly aria-label="生成されたメール本文"></textarea><div class="mailto-preview__actions"><a class="button button--primary mailto-preview__open" href="#">メールソフトを開く</a><button class="button button--ghost mailto-preview__copy" type="button">本文をコピーする</button></div><p class="mailto-preview__status" aria-live="polite"></p>';
      form.appendChild(preview);
      return preview;
    }

    forms.forEach((form) => {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const recipient = form.dataset.mailtoRecipient || "tus.fantasista@gmail.com";
        const subjectPrefix = form.dataset.mailtoSubjectPrefix || "【FANTASISTA会】問い合わせ";
        const name = getFieldValue(form, "full_name");
        const subject = name ? subjectPrefix + " " + name : subjectPrefix;
        const body = buildBody(form);
        const href = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        const preview = ensurePreview(form);
        const textarea = preview.querySelector(".mailto-preview__body");
        const openLink = preview.querySelector(".mailto-preview__open");
        const copyButton = preview.querySelector(".mailto-preview__copy");
        const status = preview.querySelector(".mailto-preview__status");

        textarea.value = body;
        openLink.href = href;
        preview.hidden = false;
        status.textContent = "";
        preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
        openLink.focus();

        copyButton.onclick = function () {
          const copy = navigator.clipboard
            ? navigator.clipboard.writeText(body)
            : Promise.reject(new Error("clipboard unavailable"));
          copy
            .then(() => {
              status.textContent = "本文をコピーしました。";
            })
            .catch(() => {
              textarea.focus();
              textarea.select();
              document.execCommand("copy");
              status.textContent = "本文を選択しました。コピーしてメールに貼り付けてください。";
            });
        };
      });
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
  initMailtoForms();
})();
