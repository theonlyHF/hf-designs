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

    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        for (const base of [github, local]) {
          try {
            const url = new URL("data/catalog.json", base);
            url.searchParams.set("v", String(Math.floor(Date.now() / interval)));
            const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6500) });
            if (!response.ok) continue;
            const data = await response.json();
            if (!Number.isSafeInteger(data.updatedAt) || !Array.isArray(data.designs)) continue;
            if (data.updatedAt <= newest) continue;
            const items = data.designs;
            if (!items.every(item => item && typeof item.arquivo === "string" &&
              allowedImage.test(item.arquivo) && typeof item.titulo === "string" &&
              typeof item.categoria === "string" && (item.ano === null || Number.isInteger(item.ano)))) continue;

            newest = data.updatedAt;
            update(items, new URL("assets/designs/", base).href);
            break;
          } catch {
            // O catálogo incluído na publicação continua disponível.
          }
        }
      } finally {
        pending = false;
      }
    }

    refresh();
    setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
  };
})();
