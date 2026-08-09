(function () {
  const containers = Array.from(document.querySelectorAll("[data-photo-library]"));
  if (!containers.length) return;

  const albumMeta = {
    "1966-1976": { period: "1〜10年", years: "1966〜1976" },
    "1977-1986": { period: "11〜20年", years: "1977〜1986" },
    "1987-1996": { period: "21〜30年", years: "1987〜1996" },
    "1997-2006": { period: "31〜40年", years: "1997〜2006" },
    "2007-2016": { period: "41〜50年", years: "2007〜2016" },
    "2017-2026": { period: "51〜60年", years: "2017〜2026" },
  };

  const albumLabels = Object.fromEntries(Object.entries(albumMeta).map(function (entry) {
    return [entry[0], entry[1].years];
  }));

  function resolvePhotoUrl(path, siteRootUrl) {
    const siteRelativePath = path.replace(/^\.\.\/assets\//, "assets/");
    return new URL(siteRelativePath, siteRootUrl).href;
  }

  function createPhotoCard(photo, siteRootUrl) {
    const link = document.createElement("a");
    link.className = "archive-photo-card";
    link.href = resolvePhotoUrl(photo.image, siteRootUrl);
    link.dataset.album = photo.album_slug;
    link.setAttribute("aria-label", photo.alt + "を拡大表示");

    const image = document.createElement("img");
    image.src = resolvePhotoUrl(photo.thumbnail, siteRootUrl);
    image.alt = photo.alt;
    image.loading = "lazy";
    image.decoding = "async";

    const copy = document.createElement("span");
    copy.className = "archive-photo-card__copy";
    const era = document.createElement("span");
    era.className = "archive-photo-card__era";
    era.textContent = albumLabels[photo.album_slug] || photo.album_name;
    const caption = document.createElement("span");
    caption.className = "archive-photo-card__caption";
    caption.textContent = photo.caption;
    copy.append(era, caption);
    link.append(image, copy);
    return link;
  }

  function setupFilters(container, status) {
    const toolbar = container.parentElement.querySelector("[data-photo-library-filters]");
    if (!toolbar) return;
    toolbar.addEventListener("click", function (event) {
      const button = event.target.closest("[data-album-filter]");
      if (!button) return;
      const value = button.dataset.albumFilter;
      toolbar.querySelectorAll("[data-album-filter]").forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      let visibleCount = 0;
      container.querySelectorAll(".archive-photo-card").forEach(function (card) {
        card.hidden = value !== "all" && card.dataset.album !== value;
        if (!card.hidden) visibleCount += 1;
      });
      if (status) status.textContent = visibleCount + "枚の写真を表示しています。";
    });
  }

  function createShelf(albumSlug, photos, siteRootUrl) {
    const meta = albumMeta[albumSlug] || { period: "Archive", years: albumSlug };
    const section = document.createElement("section");
    section.className = "photo-decade-shelf";
    section.setAttribute("aria-labelledby", "photo-decade-" + albumSlug);

    const header = document.createElement("div");
    header.className = "photo-decade-shelf__header";
    const headingGroup = document.createElement("div");
    const period = document.createElement("p");
    period.className = "photo-decade-shelf__period";
    period.textContent = meta.period;
    const heading = document.createElement("h3");
    heading.id = "photo-decade-" + albumSlug;
    heading.textContent = meta.years;
    const count = document.createElement("span");
    count.className = "photo-decade-shelf__count";
    count.textContent = photos.length + "枚";
    headingGroup.append(period, heading, count);

    const controls = document.createElement("div");
    controls.className = "photo-decade-shelf__controls";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "photo-decade-shelf__button";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", meta.years + "の前の写真を見る");
    previous.title = "前の写真";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "photo-decade-shelf__button";
    next.textContent = "›";
    next.setAttribute("aria-label", meta.years + "の次の写真を見る");
    next.title = "次の写真";
    controls.append(previous, next);
    header.append(headingGroup, controls);

    const rail = document.createElement("div");
    rail.className = "photo-decade-rail";
    rail.tabIndex = 0;
    rail.setAttribute("aria-label", meta.period + "（" + meta.years + "）の写真一覧");
    rail.append.apply(rail, photos.map(function (photo) {
      return createPhotoCard(photo, siteRootUrl);
    }));

    function move(direction) {
      rail.scrollBy({ left: direction * Math.max(280, rail.clientWidth * 0.8), behavior: "smooth" });
    }
    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    section.append(header, rail);
    return section;
  }

  function renderShelves(container, photos, siteRootUrl) {
    const grouped = new Map();
    photos.forEach(function (photo) {
      if (!grouped.has(photo.album_slug)) grouped.set(photo.album_slug, []);
      grouped.get(photo.album_slug).push(photo);
    });
    const shelves = Object.keys(albumMeta).map(function (albumSlug) {
      const albumPhotos = grouped.get(albumSlug) || [];
      return albumPhotos.length ? createShelf(albumSlug, albumPhotos, siteRootUrl) : null;
    }).filter(Boolean);
    container.replaceChildren.apply(container, shelves);
  }

  async function render(container) {
    const source = container.dataset.source;
    const role = container.dataset.role || "gallery";
    const limit = Number(container.dataset.limit || 0);
    const status = container.parentElement.querySelector("[data-photo-library-status]");

    try {
      const sourceUrl = new URL(source, window.location.href);
      const siteRootUrl = new URL("../../", sourceUrl);
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error("Photo library could not be loaded.");
      const data = await response.json();
      const roleIds = data[role + "_photo_ids"] || data.gallery_photo_ids || [];
      const photoMap = new Map(data.photos.map(function (photo) { return [photo.photo_id, photo]; }));
      const photos = roleIds.map(function (id) { return photoMap.get(id); }).filter(Boolean);
      const visiblePhotos = limit ? photos.slice(0, limit) : photos;
      if (container.dataset.layout === "shelves") {
        renderShelves(container, visiblePhotos, siteRootUrl);
      } else {
        container.replaceChildren.apply(container, visiblePhotos.map(function (photo) {
          return createPhotoCard(photo, siteRootUrl);
        }));
      }
      if (status) status.textContent = visiblePhotos.length + "枚の写真を表示しています。";
      const countLabel = container.parentElement.querySelector("[data-photo-library-count]");
      if (countLabel) countLabel.textContent = visiblePhotos.length + "枚掲載";
      if (container.dataset.layout !== "shelves") setupFilters(container, status);
    } catch (error) {
      if (status) status.textContent = "写真候補を読み込めませんでした。ローカルサーバーからご確認ください。";
    }
  }

  containers.forEach(render);
})();
