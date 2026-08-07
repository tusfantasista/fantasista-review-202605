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

  function initContactTypeFromUrl() {
    const select = document.querySelector('select[name="inquiry_type"]');
    if (!select) return;

    const requestedType = new URLSearchParams(window.location.search).get("type");
    const availableValues = Array.from(select.options).map((option) => option.value);
    if (requestedType && availableValues.includes(requestedType)) {
      select.value = requestedType;
    }
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
      affiliation: "所属区分",
      dance_role: "当時の役割",
      email: "メールアドレス",
      phone: "電話番号",
      contact_permission: "事務局からの連絡可否",
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
        "",
        "---- 入力内容 ----",
      ];

      names.forEach((name) => {
        const value = getFieldValue(form, name);
        if (!value) return;
        lines.push((fieldLabels[name] || name) + ": " + value);
      });

      return lines.join("\n");
    }

    function ensurePreview(form) {
      let preview = form.parentElement.querySelector(".mailto-preview");
      if (preview) return preview;

      preview = document.createElement("section");
      preview.className = "mailto-preview";
      preview.id = "contact-confirm";
      preview.setAttribute("aria-labelledby", "contact-confirm-title");
      preview.hidden = true;
      preview.innerHTML =
        '<p class="panel__eyebrow">Confirm</p><h2 id="contact-confirm-title" tabindex="-1">入力内容の確認</h2><p class="mailto-preview__notice"><strong>まだ送信は完了していません。</strong><br>内容を確認し、メールソフトを開いて送信してください。</p><textarea class="mailto-preview__body" readonly aria-label="生成されたメール本文"></textarea><div class="mailto-preview__actions"><button class="button button--ghost mailto-preview__edit" type="button">入力内容を修正する</button><a class="button button--primary mailto-preview__open" href="#">メールソフトを開く</a><button class="button button--ghost mailto-preview__copy" type="button">本文をコピーする</button></div><p class="mailto-preview__fallback">メールソフトが開かない場合は、本文をコピーして通常のメールに貼り付けてください。</p><p class="mailto-preview__status" aria-live="polite"></p>';
      form.insertAdjacentElement("afterend", preview);
      return preview;
    }

    forms.forEach((form) => {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const recipient = form.dataset.mailtoRecipient || "tus.festa.office@gmail.com";
        const subjectPrefix = form.dataset.mailtoSubjectPrefix || "【FANTASISTA会】問い合わせ";
        const name = getFieldValue(form, "full_name");
        const subject = name ? subjectPrefix + " " + name : subjectPrefix;
        const body = buildBody(form);
        const href = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        const preview = ensurePreview(form);
        const textarea = preview.querySelector(".mailto-preview__body");
        const openLink = preview.querySelector(".mailto-preview__open");
        const editButton = preview.querySelector(".mailto-preview__edit");
        const copyButton = preview.querySelector(".mailto-preview__copy");
        const status = preview.querySelector(".mailto-preview__status");
        const title = preview.querySelector("#contact-confirm-title");

        textarea.value = body;
        openLink.href = href;
        form.hidden = true;
        preview.hidden = false;
        status.textContent = "";
        preview.scrollIntoView({ behavior: "smooth", block: "start" });
        title.focus();

        editButton.onclick = function () {
          preview.hidden = true;
          form.hidden = false;
          form.scrollIntoView({ behavior: "smooth", block: "start" });
          form.querySelector("[name='full_name']").focus();
        };

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
  initContactTypeFromUrl();
  initMailtoForms();
})();
