(() => {
  "use strict";

  const github = "https://raw.githubusercontent.com/hiagoferreira070-source/hf-designs/main/";
  const local = new URL("../", document.currentScript.src);
  const interval = 20000;
  const allowedImage = /^[^\\/:*?"<>|]+\.(?:png|jpe?g|webp|gif|avif)$/i;

  window.watchHfCatalog = function watch(update) {
    if (location.protocol === "file:") return;
    let newest = 0;
    let pending = false;

    async function read(base) {
      try {
        const url = new URL("data/catalog.json", base);
        url.searchParams.set("v", String(Math.floor(Date.now() / interval)));
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6500) });
        if (!response.ok) return null;
        const data = await response.json();
        if (!Number.isSafeInteger(data.updatedAt) || !Array.isArray(data.designs)) return null;
        if (!data.designs.every(item => item && typeof item.arquivo === "string" &&
          allowedImage.test(item.arquivo) && typeof item.titulo === "string" &&
          typeof item.categoria === "string" && (item.ano === null || Number.isInteger(item.ano)))) return null;
        return { timestamp: data.updatedAt, items: data.designs, base };
      } catch {
        return null;
      }
    }

    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        // A CDN do GitHub e o Pages podem servir revisões diferentes por alguns instantes.
        const [published, remote] = await Promise.all([read(local), read(github)]);
        const recent = remote && (!published || remote.timestamp > published.timestamp) ? remote : published;
        if (!recent || recent.timestamp <= newest) return;
        newest = recent.timestamp;
        update(recent.items, new URL("assets/designs/", recent.base).href);
      } finally {
        pending = false;
      }
    }

    refresh();
    setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
  };
})();
