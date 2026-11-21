(() => {
  "use strict";

  const repository = "theonlyHF/hf-designs";
  const raw = "https://raw.githubusercontent.com/" + repository + "/";
  const github = new URL("refs/heads/main/", raw);
  const local = new URL("../", document.currentScript.src);
  const isPortfolio = local.hostname === "theonlyhf.github.io" && local.pathname === "/hf-designs/";
  const interval = isPortfolio ? 10000 : 5000;
  const headInterval = 90000;
  const allowedImage = /^[^\\/:*?"<>|]+\.(?:png|jpe?g|webp|gif|avif)$/i;

  window.watchHfCatalog = function watch(update) {
    if (location.protocol === "file:") return;
    let newest = 0;
    let pending = false;
    let failures = 0;
    let timer;
    let nextHeadCheck = 0;
    let lastHead;

    async function json(url) {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 3500);
      try {
        const response = await fetch(url, { cache: "no-cache", signal: abort.signal });
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    async function read(base, version) {
      const url = new URL("data/catalog.json", base);
      if (version) url.searchParams.set("v", version);
      const data = await json(url);
      if (!data || (data.schemaVersion != null && data.schemaVersion !== 1) ||
        !Number.isSafeInteger(data.updatedAt) || !Array.isArray(data.designs)) return null;
      const items = data.designs.filter(item => item && typeof item.arquivo === "string" &&
        allowedImage.test(item.arquivo) && typeof item.titulo === "string" &&
        typeof item.categoria === "string");
      if (items.length !== data.designs.length) console.debug("HF Designs ignorou registros inválidos.");
      if (!items.length && data.designs.length) return null;
      return { timestamp: data.updatedAt, items, covers: data.covers, home: data.home, base };
    }

    async function readHead(now) {
      nextHeadCheck = now + headInterval;
      const url = new URL("https://api.github.com/repos/" + repository + "/git/ref/heads/main");
      url.searchParams.set("v", String(Math.floor(now / headInterval)));
      const reference = await json(url);
      const sha = reference?.object?.sha;
      if (!/^[a-f0-9]{40}$/.test(sha) || sha === lastHead) return null;
      // Um SHA fixo aponta para o catálogo e as imagens do mesmo commit.
      const revision = await read(new URL(sha + "/", raw));
      if (revision) lastHead = sha;
      return revision;
    }

    function apply(revision) {
      if (!revision || revision.timestamp <= newest) return;
      update(revision.items, new URL("assets/designs/", revision.base).href, revision.covers, revision.home);
      newest = revision.timestamp;
    }

    async function refresh() {
      clearTimeout(timer);
      if (pending || document.hidden || navigator.onLine === false) return;
      pending = true;
      try {
        const now = Date.now();
        const version = String(Math.floor(now / interval));
        const deployed = await read(local);
        let recent = deployed;
        if (isPortfolio && (!deployed || now >= nextHeadCheck)) {
          const fallback = await readHead(now) || await read(github, version);
          if (fallback && (!recent || fallback.timestamp > recent.timestamp)) recent = fallback;
        }
        failures = recent ? 0 : Math.min(4, failures + 1);
        if (recent?.timestamp > newest) {
          apply(recent);
        }
      } finally {
        pending = false;
        if (!document.hidden) timer = setTimeout(refresh, interval * 2 ** failures);
      }
    }

    timer = setTimeout(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
  };
})();
