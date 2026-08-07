(function () {
  const containers = Array.from(document.querySelectorAll("[data-photo-library]"));
  if (!containers.length) return;

  const albumLabels = {
    "1966-1976": "1966-1976",
    "1977-1986": "1977-1986",
    "1987-1996": "1987-1996",
    "1997-2006": "1997-2006",
    "2007-2016": "2007-2016",
    "2017-2026": "2017-2026",
  };

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
      container.replaceChildren.apply(container, visiblePhotos.map(function (photo) {
        return createPhotoCard(photo, siteRootUrl);
      }));
      if (status) status.textContent = visiblePhotos.length + "枚の写真を表示しています。";
      setupFilters(container, status);
    } catch (error) {
      if (status) status.textContent = "写真候補を読み込めませんでした。ローカルサーバーからご確認ください。";
    }
  }

  containers.forEach(render);
})();
