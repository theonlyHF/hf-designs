(() => {
  "use strict";

  const repository = "theonlyHF/hf-designs";
  const raw = "https://raw.githubusercontent.com/" + repository + "/";
  const github = new URL("refs/heads/main/", raw);
  const local = new URL("../", document.currentScript.src);
  const isPortfolio = local.hostname === "theonlyhf.github.io" && local.pathname === "/hf-designs/";
  const interval = 5000;
  const deploymentInterval = 20000;
  const headInterval = 90000;
  const allowedImage = /^[^\\/:*?"<>|]+\.(?:png|jpe?g|webp|gif|avif)$/i;

  window.watchHfCatalog = function watch(update) {
    if (location.protocol === "file:") return;
    let newest = 0;
    let pending = false;
    let nextDeploymentCheck = 0;
    let nextHeadCheck = 0;
    let lastHead;

    async function json(url) {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 3500);
      try {
        const response = await fetch(url, { cache: "no-store", signal: abort.signal });
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
      if (!data || !Number.isSafeInteger(data.updatedAt) || !Array.isArray(data.designs)) return null;
      if (!data.designs.every(item => item && typeof item.arquivo === "string" &&
        allowedImage.test(item.arquivo) && typeof item.titulo === "string" &&
        typeof item.categoria === "string" && (item.ano === null || Number.isInteger(item.ano)))) return null;
      return { timestamp: data.updatedAt, items: data.designs, covers: data.covers, home: data.home, base };
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
      if (pending || document.hidden) return;
      pending = true;
      try {
        const now = Date.now();
        const version = String(Math.floor(now / interval));
        if (!isPortfolio) {
          apply(await read(local, version));
          return;
        }
        const sources = [read(github, version)];
        if (now >= nextDeploymentCheck) {
          nextDeploymentCheck = now + deploymentInterval;
          sources.unshift(read(local, version));
        }
        const revisions = (await Promise.all(sources)).filter(Boolean);
        const recent = revisions.sort((a, b) => b.timestamp - a.timestamp)[0];
        if (recent?.timestamp > newest) {
          apply(recent);
        } else if (now >= nextHeadCheck) {
          apply(await readHead(now));
        }
      } finally {
        pending = false;
      }
    }

    refresh();
    setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
  };
})();
