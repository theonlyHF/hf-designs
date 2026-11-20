(() => {
  "use strict";

  const designs = window.HF_DESIGNS;
  let liveAssetBase = "assets/designs/";
  let liveRefreshPending = false;
  const main = document.querySelector("main");
  const screen = document.querySelector(".screen-scroll");
  const rig = document.querySelector(".rig");
  const intro = rig.querySelector(".site-intro");
  const power = rig.querySelector(".console-power");
  const powerLabel = power.querySelector("[data-power-label]");
  const sound = rig.querySelector(".console-sound");
  const header = document.querySelector(".site-header");
  const ejectOverlay = document.querySelector(".eject-overlay");
  const navigation = document.querySelectorAll(".site-header nav a");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const dialog = document.querySelector(".lightbox");
  const viewerImage = dialog.querySelector("img");
  const closeButton = dialog.querySelector("[data-close]");
  const previousButton = dialog.querySelector("[data-prev]");
  const nextButton = dialog.querySelector("[data-next]");
  const viewerIndex = dialog.querySelector("[data-viewer-index]");
  const viewerTitle = dialog.querySelector("#viewer-title");
  const viewerDetails = dialog.querySelector("[data-viewer-details]");
  const viewerDescription = dialog.querySelector("[data-viewer-description]");
  const viewerContact = dialog.querySelector(".viewer-contact");
  const viewerExpand = dialog.querySelector("[data-expand]");
  const viewerVariants = dialog.querySelector("[data-variants]");
  const selections = new Set(["kurt-cobain-poster-01.png", "lewis-hamilton-poster.png", "michael-03.png",
    "smk-aurenox.png", "kobe-bryant-estampa.png", "johnny-banner-youtube-02.png"]);
  const selectedDesign = item => typeof item.destaque === "boolean" ? item.destaque : selections.has(item.arquivo);
  const isBanner = item => item.categoria.startsWith("Banner · ");
  const isPoster = item => item.categoria === "Pôster";
  const isPrint = item => item.categoria === "Estampa";
  const standardGalleries = {
    "/selecao": { title: "Seleção HF", accepts: selectedDesign, singular: "design", plural: "designs" },
    "/designs": {
      title: "Designs",
      accepts: item => !isBanner(item),
      singular: "design",
      plural: "designs",
    },
    "/banners": {
      title: "Banners",
      isBanner: true,
      accepts: isBanner,
      singular: "banner",
      plural: "banners",
    },
    "/posters": {
      title: "Pôsteres",
      accepts: isPoster,
      singular: "pôster",
      plural: "pôsteres",
    },
    "/estampas": {
      title: "Estampas",
      accepts: isPrint,
      singular: "estampa",
      plural: "estampas",
    },
    "/outros": {
      title: "Outros designs",
      accepts: item => !isBanner(item) && !isPoster(item) && !isPrint(item),
      singular: "design",
      plural: "designs",
    },
    "/canal": {
      title: "Meu canal",
      channel: true,
      summary: "Gameplays de jogos variados, com vídeos novos quando tenho tempo de gravar.",
      url: "https://www.youtube.com/@theonlyhf",
    },
  };
  const customCover = /^capa-[a-z0-9-]{1,60}$/;
  const color = /^#[a-f\d]{6}$/i;
  const coverColors = ["front", "accent", "back"];
  let covers = [];
  const imageFile = /^[^\\/:*?"<>|]+\.(png|jpe?g|webp|gif|avif)$/i;
  const soundFile = /^[^\\/:*?"<>|]+\.(mp3|ogg|wav|m4a)$/i;
  const frameStyles = ["classic", "arcade", "carbon", "optical"];
  const discStyles = ["silver", "arcade", "print", "optical"];
  const homeEffects = ["waves", "core", "orbit"];
  let galleries = { ...standardGalleries };
  let libraryRoutes = [];

  function validCrop(crop) {
    if (!crop || !Number.isInteger(crop.x) || !Number.isInteger(crop.y) || !Number.isInteger(crop.zoom)) return null;
    return crop.x >= 0 && crop.x <= 100 && crop.y >= 0 && crop.y <= 100 && crop.zoom >= 100 && crop.zoom <= 300
      ? { x: crop.x, y: crop.y, zoom: crop.zoom } : null;
  }

  function applyCoverCrop(cover, collection, file) {
    if (!file || collection.cropSource !== file) return;
    for (const [format, crop] of [["square", collection.cropSquare], ["vertical", collection.cropVertical]]) {
      if (!crop) continue;
      cover.classList.add("has-crop-" + format);
      cover.style.setProperty("--" + format + "-crop-position", crop.x + "% " + crop.y + "%");
      cover.style.setProperty("--" + format + "-crop-zoom", crop.zoom / 100);
    }
  }

  function loadCovers(input) {
    if (!Array.isArray(input)) return false;
    const seen = new Set();
    const next = [];
    for (const entry of input) {
      if (!entry || typeof entry.id !== "string" || seen.has(entry.id) || entry.id === "designs" ||
        typeof entry.title !== "string" || !entry.title.trim() || typeof entry.summary !== "string") return false;
      const standard = Object.hasOwn(standardGalleries, "/" + entry.id);
      if (!standard && (!customCover.test(entry.id) || typeof entry.category !== "string" || !entry.category.trim())) return false;
      seen.add(entry.id);
      next.push({
        id: entry.id, title: entry.title, summary: entry.summary,
        art: typeof entry.art === "string" && imageFile.test(entry.art) ? entry.art : "",
        artThumb: typeof entry.artThumb === "string" && imageFile.test(entry.artThumb) ? entry.artThumb : "",
        artMode: entry.artMode === "default" ? "default" : "",
        brandText: typeof entry.brandText === "string" ? entry.brandText.trim().slice(0, 36) : "",
        brandColor: typeof entry.brandColor === "string" && color.test(entry.brandColor) ? entry.brandColor : "",
        cropSource: typeof entry.cropSource === "string" && imageFile.test(entry.cropSource) ? entry.cropSource : "",
        cropSquare: validCrop(entry.cropSquare),
        cropVertical: validCrop(entry.cropVertical),
        frame: typeof entry.frame === "string" && imageFile.test(entry.frame) ? entry.frame : "",
        frameStyle: frameStyles.includes(entry.frameStyle) ? entry.frameStyle : "classic",
        discStyle: discStyles.includes(entry.discStyle) ? entry.discStyle : "silver",
        category: standard ? "" : entry.category,
        ...Object.fromEntries(coverColors.map(key => [key, typeof entry[key] === "string" && color.test(entry[key]) ? entry[key] : ""])),
      });
    }
    if (JSON.stringify(next) === JSON.stringify(covers)) return false;
    covers = next;
    galleries = { ...standardGalleries };
    for (const cover of covers) {
      const route = "/" + cover.id;
      galleries[route] = {
        ...(standardGalleries[route] ?? {
          accepts: item => item.categoria === cover.category,
          singular: "design",
          plural: "designs",
        }),
        ...cover,
      };
    }
    libraryRoutes = covers.map(cover => "/" + cover.id);
    return true;
  }

  loadCovers(window.HF_COVERS);
  const appearance = { style: "square", theme: "site", crt: "silver" };
  const appearanceOptions = { style: ["square", "vertical"], theme: ["site", "violet", "blue", "green", "core", "orbit"], crt: ["silver", "graphite", "ivory"] };
  let home = { color: "", image: "", sounds: {}, effect: "waves", bootPreset: "classic" };

  let activeRoute;
  let bootComplete = false;
  let requestedRoute;
  let transitioning = false;
  let coverPosition = 1;
  let handleHomeKeys;
  let syncHomeMotion;
  let stopCoverLoading;
  let fullCoverMotion = false;
  try {
    fullCoverMotion = localStorage.getItem("hf-cover-motion") === "full";
    for (const [key, options] of Object.entries(appearanceOptions)) {
      const option = localStorage.getItem("hf-cover-" + key);
      if (options.includes(option)) appearance[key] = option;
    }
  } catch {
    // A preferência ainda pode ser usada durante a visita.
  }
  let viewerItems = [];
  let viewerPosition = 0;
  let opener;

  const imagePath = design => liveAssetBase + encodeURIComponent(design.arquivo);
  const designKey = design => design.id || design.arquivo;
  const thumbnail = design => {
    const info = design.thumb ? [design.thumb, design.width, design.height] : window.HF_THUMBNAILS?.[design.arquivo];
    return info ? { src: liveAssetBase + "thumbs/" + encodeURIComponent(info[0]), width: info[1], height: info[2] }
      : { src: imagePath(design) };
  };
  const normalizeSearch = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const designFromHash = () => new URLSearchParams(location.hash.split("?")[1]).get("design");
  const routeLink = (route, design) => "#" + route + (design ? "?design=" + encodeURIComponent(designKey(design)) : "");
  function remembered(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch { /* A preferência continua disponível nesta visita. */ }
  }
  async function copyLink(hash, status, button) {
    const url = new URL(hash, location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Link copiado.";
      const original = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = original;
      button.textContent = "Link copiado";
      clearTimeout(button.copyTimer);
      button.copyTimer = setTimeout(() => { button.textContent = original; }, 1600);
    } catch {
      window.prompt("Copie este link", url);
    }
  }
  let analyticsStarted = false;
  let analyticsReady = false;
  const queuedGalleryViews = [];
  function trackGallery(path, title) {
    if (window.top !== window.self || location.origin !== "https://theonlyhf.github.io") return;
    const entry = { path: "/hf-designs/galeria" + path, title, event: true };
    if (analyticsReady) window.goatcounter.count(entry);
    else if (queuedGalleryViews.length < 50) queuedGalleryViews.push(entry);
  }

  function startAnalytics(code) {
    if (analyticsStarted || window.top !== window.self || location.origin !== "https://theonlyhf.github.io" ||
      !["/hf-designs/", "/hf-designs/index.html"].includes(location.pathname) ||
      !/^[a-z0-9][a-z0-9-]{0,59}$/.test(code ?? "")) return;
    analyticsStarted = true;
    window.goatcounter = { no_onload: true };
    const script = document.createElement("script");
    script.src = "https://gc.zgo.at/count.js";
    script.async = true;
    script.dataset.goatcounter = "https://" + code + ".goatcounter.com/count";
    script.addEventListener("load", () => {
      if (typeof window.goatcounter.count !== "function") return;
      analyticsReady = true;
      window.goatcounter.count({ path: "/hf-designs/", title: "HF Designs" });
      queuedGalleryViews.splice(0).forEach(entry => window.goatcounter.count(entry));
    });
    document.head.append(script);
  }
  function httpsLink(value, fallback) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch {}
    return fallback;
  }
  function applyHomeSettings(settings) {
    if (settings && typeof settings === "object") {
      home = {
        color: typeof settings.color === "string" && color.test(settings.color) ? settings.color : "",
        image: typeof settings.image === "string" && imageFile.test(settings.image) ? settings.image : "",
        effect: homeEffects.includes(settings.effect) ? settings.effect : "waves",
        bootPreset: ["classic", "crystal", "pulse", "silent"].includes(settings.bootPreset) ? settings.bootPreset : "classic",
        instagram: httpsLink(settings.instagram, "https://www.instagram.com/hf.designs01/"),
        discord: httpsLink(settings.discord, "https://discord.gg/fCq5MfF49"),
        youtube: httpsLink(settings.youtube, standardGalleries["/canal"].url),
        contactLabel: typeof settings.contactLabel === "string" ? settings.contactLabel.trim().slice(0, 60) : "",
        sounds: settings.sounds && typeof settings.sounds === "object"
          ? Object.fromEntries(Object.entries(settings.sounds).filter(([, file]) => typeof file === "string" && soundFile.test(file)))
          : {},
      };
      startAnalytics(settings.analyticsCode);
      viewerContact.href = home.instagram;
      viewerContact.textContent = home.contactLabel || "Quero um design assim";
      syncContactLinks(main);
      const currentChannel = main.querySelector(".channel-page a");
      if (currentChannel) currentChannel.href = home.youtube;
    }
    screen.classList.toggle("has-home-color", Boolean(home.color));
    screen.classList.toggle("has-home-image", Boolean(home.image));
    if (home.color) screen.style.setProperty("--studio-home-color", home.color);
    else screen.style.removeProperty("--studio-home-color");
    if (home.image) screen.style.setProperty("--studio-home-image", `url("${imagePath({ arquivo: home.image })}")`);
    else screen.style.removeProperty("--studio-home-image");
    applyHomeEffect();
  }
  applyHomeSettings(window.HF_HOME);
  function syncContactLinks(page) {
    const discord = page.querySelector('.contact-links a[aria-label="Discord"]');
    if (!discord) return;
    discord.href = home.discord || discord.href;
    const instagram = page.querySelector('.contact-links a[aria-label="Instagram"]');
    instagram.href = home.instagram || instagram.href;
  }
  function syncScene(path) {
    const gallery = Object.hasOwn(galleries, path);
    const fallback = gallery ? "gallery" : "home";
    const key = path.slice(1) || "home";
    const file = (Object.hasOwn(home.sounds, key) && home.sounds[key]) || (gallery && home.sounds.gallery);
    window.hfAudio.setScene(fallback, soundUrl(file));
  }
  function soundUrl(file) {
    return file ? new URL("../sounds/" + encodeURIComponent(file), new URL(liveAssetBase, document.baseURI)).href : "";
  }
  const yearLabel = design => design.ano ?? "Sem ano";
  const indexLabel = (position, total) =>
    String(position + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");

  function applyAppearance(flow) {
    if (flow) flow.dataset.caseStyle = appearance.style;
    screen.dataset.theme = appearance.theme;
    applyHomeEffect();
    rig.dataset.crt = appearance.crt;
  }

  function applyHomeEffect() {
    screen.dataset.homeEffect = appearance.theme === "site" ? home.effect :
      homeEffects.includes(appearance.theme) ? appearance.theme : "waves";
  }
  applyAppearance();

  const compare = dialog.querySelector(".viewer-compare");
  const zoomSurface = viewerImage.parentElement;
  const pointers = new Map();
  let zoom = 1, panX = 0, panY = 0;
  function updateZoom() {
    const bound = (value, limit) => Math.max(-limit, Math.min(limit, value));
    panX = bound(panX, viewerImage.clientWidth * (zoom - 1) / 2);
    panY = bound(panY, viewerImage.clientHeight * (zoom - 1) / 2);
    viewerImage.style.transform = zoom === 1 ? "" : "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")";
  }
  function resetZoom() {
    zoom = 1;
    panX = panY = 0;
    pointers.clear();
    updateZoom();
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  zoomSurface.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && zoom === 1) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    zoomSurface.setPointerCapture(event.pointerId);
  });
  zoomSurface.addEventListener("pointermove", event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      zoom = Math.min(5, Math.max(1, zoom * distance(current, other) / Math.max(1, distance(previous, other))));
    }
    panX += (current.x - previous.x) / (other ? 2 : 1);
    panY += (current.y - previous.y) / (other ? 2 : 1);
    pointers.set(event.pointerId, current);
    updateZoom();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    zoomSurface.addEventListener(name, event => pointers.delete(event.pointerId));
  viewerImage.draggable = false;
  dialog.querySelector("[data-copy]").addEventListener("click", event =>
    copyLink(routeLink(activeRoute, viewerItems[viewerPosition]), dialog.querySelector("[data-link-status]"), event.currentTarget));

  function showViewerItem(position, preserveZoom = false) {
    viewerPosition = (position + viewerItems.length) % viewerItems.length;
    const design = viewerItems[viewerPosition];
    viewerTitle.textContent = design.titulo;
    viewerDetails.textContent = design.categoria + " · " + yearLabel(design);
    viewerDescription.textContent = typeof design.descricao === "string" ? design.descricao.trim() : "";
    viewerDescription.hidden = !viewerDescription.textContent;
    for (const [key, label, selector] of [["papel", "Papel", "role"], ["objetivo", "Objetivo visual", "goal"]]) {
      const field = dialog.querySelector("[data-viewer-" + selector + "]");
      const content = design[key]?.trim();
      field.hidden = !content;
      field.textContent = content ? label + " · " + content : "";
    }
    if (!preserveZoom) resetZoom();
    compare.hidden = true;
    compare.replaceChildren();
    viewerIndex.textContent = indexLabel(viewerPosition, viewerItems.length);
    viewerImage.alt = design.titulo + " — " + design.categoria;
    if (viewerImage.getAttribute("src") !== imagePath(design)) viewerImage.src = imagePath(design);
    previousButton.disabled = nextButton.disabled = viewerItems.length < 2;
    const project = artworkProject(design);
    const variants = project ? designs.filter(item => item.arquivo !== design.arquivo && artworkProject(item) === project) : [];
    viewerVariants.parentElement.hidden = !variants.length;
    viewerVariants.replaceChildren(...variants.map(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.titulo;
      button.addEventListener("click", () => {
        let index = viewerItems.findIndex(entry => entry.arquivo === item.arquivo);
        if (index < 0) index = viewerItems.push(item) - 1;
        showViewerItem(index);
        viewerTitle.focus({ preventScroll: true });
      });
      const pair = document.createElement("span");
      const comparison = document.createElement("button");
      comparison.type = "button";
      comparison.textContent = "Comparar";
      comparison.setAttribute("aria-label", "Comparar com " + item.titulo);
      comparison.addEventListener("click", () => {
        compare.replaceChildren(...[design, item].map(version => {
          const figure = document.createElement("figure");
          const image = document.createElement("img");
          const caption = document.createElement("figcaption");
          image.src = imagePath(version);
          image.alt = caption.textContent = version.titulo;
          figure.append(image, caption);
          return figure;
        }));
        compare.hidden = false;
        compare.scrollIntoView({ block: "nearest" });
      });
      pair.append(button, comparison);
      return pair;
    }));
    if (dialog.open && activeRoute === getRoute()) history.replaceState(null, "", routeLink(activeRoute, design));
  }

  function artworkProject(design) {
    if (typeof design.projeto === "string") return design.projeto.trim().toLowerCase();
    const key = designKey(design);
    if (key.startsWith("johnny-banner")) return "banners do johnny";
    if (key.startsWith("michael-")) return "michael";
    if (key.startsWith("kurt-cobain-poster")) return "pôsteres de kurt cobain";
    return "";
  }

  function expandViewer(expanded) {
    dialog.classList.toggle("is-fullscreen", expanded);
    viewerExpand.setAttribute("aria-pressed", String(expanded));
    viewerExpand.setAttribute("aria-label", expanded ? "Sair da tela cheia" : "Ampliar para tela cheia");
  }
  viewerTitle.tabIndex = -1;
  viewerExpand.addEventListener("click", () => expandViewer(!dialog.classList.contains("is-fullscreen")));

  function openViewer(items, position, trigger) {
    viewerItems = [...items];
    opener = trigger;
    previousButton.disabled = nextButton.disabled = items.length < 2;
    if (!dialog.open) dialog.showModal();
    showViewerItem(position);
    document.body.classList.add("has-lightbox");
  }

  closeButton.addEventListener("click", () => dialog.close());
  previousButton.addEventListener("click", () => showViewerItem(viewerPosition - 1));
  nextButton.addEventListener("click", () => showViewerItem(viewerPosition + 1));
  dialog.addEventListener("close", () => {
    // Um fechamento disparado pela troca de rota pode chegar após outra abertura.
    if (dialog.open) return;
    document.body.classList.remove("has-lightbox");
    if (activeRoute === getRoute() && designFromHash()) history.replaceState(null, "", routeLink(activeRoute));
    viewerImage.removeAttribute("src");
    compare.replaceChildren();
    expandViewer(false);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    refreshLiveGallery();
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (dialog.classList.contains("is-fullscreen")) expandViewer(false);
      else dialog.close();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (viewerItems.length > 1) showViewerItem(viewerPosition + (event.key === "ArrowLeft" ? -1 : 1));
    }

    if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll("button:not([disabled]), a[href]")].filter(control => !control.closest("[hidden]"));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  function renderHome(page) {
    const flow = page.querySelector(".coverflow");
    const carousel = flow.querySelector(".carousel-nav");
    const steps = [...carousel.querySelectorAll("[data-step]")];
    const openGallery = flow.querySelector(".open-gallery");
    openGallery.addEventListener("click", () => window.hfAudio.cue("select"));
    const hint = flow.querySelector(".gesture-hint");
    hint.hidden = Boolean(remembered("hf-gesture-hint"));
    hint.querySelector("button").addEventListener("click", () => {
      remember("hf-gesture-hint", "dismissed");
      hint.hidden = true;
      (steps.find(button => !button.disabled) || flow.querySelector(".case-trigger"))?.focus();
    });
    const close = flow.querySelector(".case-close");
    const motionToggle = flow.querySelector(".motion-toggle");
    const backToggle = flow.querySelector(".case-turn-toggle");
    const controls = flow.querySelector(".case-controls");
    const panelButtons = [...controls.querySelectorAll("[data-panel]")];
    let openPanel;

    function closeOptions(restoreFocus = false) {
      if (!openPanel) return;
      const { button, panel } = openPanel;
      openPanel = null;
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (restoreFocus) button.focus({ preventScroll: true });
    }

    for (const button of controls.querySelectorAll("button[data-tooltip]")) button.title = button.dataset.tooltip;
    for (const button of panelButtons) {
      const panel = controls.querySelector("#" + button.dataset.panel);
      button.addEventListener("click", () => {
        if (openPanel?.button === button) {
          closeOptions(true);
          return;
        }
        closeOptions();
        openPanel = { button, panel };
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");
        panel.querySelector('button[aria-pressed="true"]').focus({ preventScroll: true });
      });
    }

    applyAppearance(flow);
    for (const key of Object.keys(appearance)) {
      const buttons = [...controls.querySelectorAll("[data-" + key + "]")];
      const updateSelection = () => buttons.forEach(button =>
        button.setAttribute("aria-pressed", String(button.dataset[key] === appearance[key])));
      updateSelection();
      for (const button of buttons) {
        button.addEventListener("click", () => {
          appearance[key] = button.dataset[key];
          applyAppearance(flow);
          updateSelection();
          if (key === "style") closeOptions(true);
          window.hfAudio.cue("select");
          try {
            localStorage.setItem("hf-cover-" + key, appearance[key]);
          } catch {
            // A escolha ainda vale enquanto o site estiver aberto.
          }
        });
      }
    }
    if (!libraryRoutes.length) {
      carousel.hidden = hint.hidden = true;
      const empty = document.createElement("p");
      empty.className = "empty-covers";
      empty.textContent = "Nenhuma capa disponível.";
      flow.append(empty);
      backToggle.disabled = true;
      return;
    }
    const template = document.querySelector("#cover-template");
    const entries = libraryRoutes.map(route => {
      const collection = galleries[route];
      const cover = template.content.firstElementChild.cloneNode(true);
      const artwork = resolveCoverArt(collection);
      const trigger = cover.querySelector(".case-trigger");
      const disc = cover.querySelector(".disc-link");

      cover.dataset.collection = route.slice(1);
      cover.classList.toggle("has-brand-cover", !artwork);
      if (!artwork) renderCoverCenter(cover, collection);
      applyCoverCrop(cover, collection, artwork?.arquivo);
      cover.dataset.frame = collection.frameStyle;
      disc.dataset.disc = collection.discStyle;
      cover.classList.toggle("cover-channel", Boolean(collection.channel));
      for (const key of coverColors) {
        if (!collection[key]) continue;
        cover.classList.add("has-cover-" + key);
        cover.style.setProperty("--art-" + key, collection[key]);
      }
      if (collection.frame && collection.frameStyle === "classic") {
        cover.classList.add("has-cover-frame");
        cover.dataset.frameSource = thumbnail({ arquivo: collection.frame }).src;
      }
      trigger.setAttribute("aria-label", "Abrir caixa: " + collection.title);
      disc.id = "disc-" + cover.dataset.collection;
      disc.href = "#" + route;
      disc.setAttribute("aria-label", "Abrir galeria: " + collection.title);
      trigger.setAttribute("aria-controls", disc.id);
      cover.querySelector(".cover-art strong").textContent = collection.title;
      cover.querySelector(".disc-title").textContent = collection.title;
      cover.querySelector(".case-back strong").textContent = collection.title;
      const summary = cover.querySelector(".case-summary");
      summary.id = "summary-" + cover.dataset.collection;
      summary.textContent = collection.summary;
      trigger.setAttribute("aria-describedby", summary.id);

      for (const image of cover.querySelectorAll(".cover-art img, .case-back-art")) {
        if (artwork) image.dataset.source = thumbnail(artwork).src;
        else image.remove();
      }
      if (collection.discStyle === "print" && artwork) {
        const print = disc.querySelector(".disc-art");
        print.dataset.source = thumbnail(artwork).src;
        print.hidden = false;
      }
      return { cover, trigger, disc, lid: cover.querySelector(".case-lid"), model: cover.querySelector(".case-model") };
    });

    let opened;
    let gesture;
    let dragged = false;
    let wheelDelta = 0;
    let lastWheel = 0;
    let nextWheelStep = 0;
    let coverFade;

    syncHomeMotion = () => {
      flow.classList.toggle("has-full-motion", fullCoverMotion);
      motionToggle.hidden = !reducedMotion.matches;
      motionToggle.setAttribute("aria-pressed", String(fullCoverMotion));
      if (!motionAllowed()) entries.forEach(entry => {
        entry.turn?.cancel();
        entry.flip?.cancel();
      });
    };
    syncHomeMotion();

    motionToggle.addEventListener("click", () => {
      fullCoverMotion = !fullCoverMotion;
      syncHomeMotion();
      try {
        localStorage.setItem("hf-cover-motion", fullCoverMotion ? "full" : "system");
      } catch {
        // Quando o navegador bloqueia o armazenamento, o controle vale nesta visita.
      }
    });

    function showBack(show, animate = false) {
      const entry = entries[coverPosition];
      if (!entry) return;
      const { cover, model } = entry;
      if (cover.classList.contains("is-back-facing") === show) return;
      const from = rotationAngle(entry);
      const target = show ? -162 : 0;
      entry.turn?.cancel();
      entry.flip?.cancel();
      cover.classList.toggle("is-back-facing", show);
      if (show) model.style.setProperty("--case-yaw", target + "deg");
      else model.style.removeProperty("--case-yaw");
      backToggle.setAttribute("aria-pressed", String(show));
      const label = show ? "Ver frente da capa" : "Ver verso da capa";
      backToggle.setAttribute("aria-label", label);
      backToggle.dataset.tooltip = label;

      if (animate && motionAllowed()) {
        const delta = ((target - from + 540) % 360) - 180;
        entry.flip = model.animate([{ "--case-yaw": from + "deg" }, { "--case-yaw": (from + delta) + "deg" }], {
          duration: 720,
          easing: "cubic-bezier(.33,.08,.2,1)",
        });
      }
    }

    function motionAllowed() {
      return !reducedMotion.matches || fullCoverMotion;
    }

    function rotationAngle({ model }) {
      const angle = parseFloat(getComputedStyle(model).getPropertyValue("--case-yaw")) || 0;
      return ((angle % 360) + 540) % 360 - 180;
    }

    function turnUnderPointer(entry) {
      if (!motionAllowed() || opened || (dragged && gesture) ||
        entry.flip?.playState === "running" || entry.cover.matches(".is-back-facing, .is-closing")) return;
      const from = rotationAngle(entry);
      entry.turn?.cancel();
      entry.turn = entry.model.animate([{ "--case-yaw": from + "deg" }, { "--case-yaw": (from + 360) + "deg" }], {
        duration: 13000,
        iterations: Infinity,
      });
    }

    function returnToFront(entry) {
      if (!entry.turn || entry.turn.playState === "idle" || entry.cover.matches(".is-open, .is-back-facing")) return;
      const from = rotationAngle(entry);
      entry.turn.cancel();
      if (!motionAllowed() || Math.abs(from) < .5) return;
      entry.turn = entry.model.animate([{ "--case-yaw": from + "deg" }, { "--case-yaw": "0deg" }], {
        duration: 350 + Math.abs(from) * 2.3,
        easing: "cubic-bezier(.22,.65,.32,1)",
      });
    }

    backToggle.addEventListener("click", () => {
      const show = backToggle.getAttribute("aria-pressed") === "false";
      showBack(show, true);
      fadeReducedMotion();
      window.hfAudio.cue("select");
    });

    function fadeReducedMotion() {
      if (!reducedMotion.matches || fullCoverMotion) return;
      coverFade?.cancel();
      coverFade = flow.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    }

    function afterMotion(elements, callback) {
      const animations = elements.flatMap(element => element.getAnimations());
      if (!animations.length) {
        callback();
        return;
      }
      Promise.allSettled(animations.map(animation => animation.finished)).then(callback);
    }

    function loadCoverMedia(cover) {
      for (const image of cover.querySelectorAll("img[data-source]")) {
        image.src = image.dataset.source;
        delete image.dataset.source;
      }
      if (cover.dataset.frameSource) {
        cover.style.setProperty("--cover-frame-image", 'url("' + cover.dataset.frameSource + '")');
        delete cover.dataset.frameSource;
      }
    }

    function centerCover(position, playSound = true) {
      const nextPosition = Math.max(0, Math.min(position, entries.length - 1));
      if (nextPosition !== coverPosition) {
        showBack(false);
        fadeReducedMotion();
        if (playSound) window.hfAudio.cue("hover");
      }
      coverPosition = nextPosition;
      carousel.querySelector("output").textContent = indexLabel(coverPosition, entries.length);
      steps[0].disabled = coverPosition === 0;
      steps[1].disabled = coverPosition === entries.length - 1;
      entries.forEach(({ cover }, index) => {
        const distance = index - coverPosition;
        const side = Math.sign(distance);
        const offset = side * (1 + Math.max(0, Math.abs(distance) - 1) * .61);
        cover.style.setProperty("--offset", offset);
        cover.style.setProperty("--turn", (-side * 38) + "deg");
        cover.style.setProperty("--layer", entries.length - Math.abs(distance));
        cover.style.setProperty("--label-alignment", side < 0 ? "left" : "right");
        cover.classList.toggle("is-centered", distance === 0);
        cover.classList.toggle("is-distant", Math.abs(distance) > 1);
      });
      // A capa em foco é solicitada antes das vizinhas.
      for (const index of [coverPosition, coverPosition - 1, coverPosition + 1]) {
        const cover = entries[index]?.cover;
        if (cover) loadCoverMedia(cover);
      }
    }

    function closeCase(restoreFocus = true) {
      if (!opened) return;
      const { entry } = opened;
      const { cover, trigger, disc, lid, model } = entry;
      opened = null;
      cover.classList.add("is-closing");
      cover.classList.remove("is-open", "is-disc-ready");
      flow.classList.remove("has-open-case");
      close.hidden = true;
      openGallery.hidden = true;
      carousel.hidden = false;
      hint.hidden = Boolean(remembered("hf-gesture-hint"));
      fadeReducedMotion();
      trigger.setAttribute("aria-expanded", "false");
      disc.setAttribute("aria-hidden", "true");
      disc.tabIndex = -1;
      entries.forEach(entry => { entry.trigger.tabIndex = 0; });
      if (restoreFocus) trigger.focus({ preventScroll: true });
      const closing = {};
      entry.closing = closing;
      afterMotion([cover, lid], () => {
        if (entry.closing !== closing) return;
        model.style.removeProperty("--case-yaw");
        cover.classList.remove("is-closing");
        if (entry.hovered) turnUnderPointer(entry);
        refreshLiveGallery();
      });
    }

    function openCase(index) {
      if (opened) closeCase(false);
      centerCover(index, false);
      const entry = entries[index];
      const { cover, trigger, disc, lid, model } = entry;
      const from = rotationAngle(entry);
      entry.turn?.cancel();
      entry.flip?.cancel();
      showBack(false);
      model.style.setProperty("--case-yaw", from + "deg");
      const opening = { entry };
      opened = opening;
      entry.closing = null;
      cover.classList.remove("is-closing");
      cover.classList.add("is-open");
      flow.classList.add("has-open-case");
      close.hidden = false;
      carousel.hidden = hint.hidden = true;
      window.hfAudio.cue("select");
      fadeReducedMotion();
      entries.forEach(entry => { entry.trigger.tabIndex = -1; });
      trigger.setAttribute("aria-expanded", "true");
      close.focus({ preventScroll: true });
      afterMotion([cover, lid], () => {
        if (opened !== opening || !cover.isConnected) return;
        cover.classList.add("is-disc-ready");
        disc.removeAttribute("aria-hidden");
        disc.tabIndex = 0;
        openGallery.href = disc.getAttribute("href");
        openGallery.hidden = false;
        if (document.activeElement === close) disc.focus({ preventScroll: true });
      });
    }

    centerCover(coverPosition);
    flow.append(...entries.map(entry => entry.cover));
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(changes => {
        for (const change of changes) {
          if (!change.isIntersecting) continue;
          loadCoverMedia(change.target);
          observer.unobserve(change.target);
        }
      }, { root: flow, threshold: .15 });
      entries.forEach(entry => observer.observe(entry.cover));
      stopCoverLoading = () => observer.disconnect();
    }
    steps.forEach(button => button.addEventListener("click", () => {
      centerCover(coverPosition + Number(button.dataset.step));
      if (button.disabled) steps.find(step => !step.disabled)?.focus({ preventScroll: true });
    }));

    entries.forEach(entry => {
      entry.cover.addEventListener("pointerenter", event => {
        if (event.pointerType === "touch" || opened || (dragged && gesture)) return;
        entry.hovered = true;
        window.hfAudio.cue("hover");
        turnUnderPointer(entry);
      });
      entry.cover.addEventListener("pointerleave", () => {
        entry.hovered = false;
        returnToFront(entry);
      });
    });

    flow.addEventListener("focusin", event => {
      const index = entries.findIndex(entry => entry.trigger === event.target);
      if (!opened && index >= 0 && event.target.matches(":focus-visible")) centerCover(index);
    });

    handleHomeKeys = event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.key === "Escape" && openPanel) {
        event.preventDefault();
        closeOptions(true);
        return;
      }
      if (openPanel && controls.contains(event.target)) return;
      if (event.key === "Escape" && opened) {
        event.preventDefault();
        closeCase();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      closeCase(false);
      centerCover(coverPosition + (event.key === "ArrowLeft" ? -1 : 1));
      entries[coverPosition].trigger.focus({ preventScroll: true });
    };

    flow.addEventListener("wheel", event => {
      if (opened || event.ctrlKey) return;
      const copy = event.target.closest(".case-back-copy");
      if (copy && copy.scrollHeight > copy.clientHeight) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();

      const now = performance.now();
      if (now - lastWheel > 170) wheelDelta = 0;
      lastWheel = now;
      if (now < nextWheelStep) return;
      wheelDelta += delta * (event.deltaMode === 0 ? 1 : 32);
      if (Math.abs(wheelDelta) < 32) return;

      centerCover(coverPosition + Math.sign(wheelDelta));
      if (flow.contains(document.activeElement)) entries[coverPosition].trigger.focus({ preventScroll: true });
      wheelDelta = 0;
      nextWheelStep = now + 240;
    }, { passive: false });

    flow.addEventListener("pointerdown", event => {
      if (opened || event.target.closest(".case-controls, .carousel-nav, .gesture-hint") || !event.isPrimary || event.button !== 0) return;
      dragged = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, limit: flow.clientWidth * .27 };
    });
    flow.addEventListener("pointermove", event => {
      if (gesture?.id !== event.pointerId) return;
      const x = event.clientX - gesture.x;
      const y = event.clientY - gesture.y;

      if (!dragged) {
        if (Math.abs(x) < 9 || Math.abs(x) <= Math.abs(y)) return;
        dragged = true;
        flow.classList.add("is-dragging");
        entries.forEach(returnToFront);
        flow.setPointerCapture(event.pointerId);
      }
      const atEdge = (x > 0 && coverPosition === 0) || (x < 0 && coverPosition === entries.length - 1);
      const distance = x * (atEdge ? .22 : .76);
      flow.style.setProperty("--drag-x", Math.max(-gesture.limit, Math.min(distance, gesture.limit)) + "px");
    });

    function resetGesture(event) {
      if (gesture?.id !== event.pointerId) return;
      gesture = null;
      flow.classList.remove("is-dragging");
      flow.style.removeProperty("--drag-x");
    }

    flow.addEventListener("pointercancel", resetGesture);
    flow.addEventListener("pointerup", event => {
      if (gesture?.id !== event.pointerId) return;
      const x = event.clientX - gesture.x;
      const y = event.clientY - gesture.y;
      resetGesture(event);
      if (Math.abs(x) < 36 || Math.abs(x) <= Math.abs(y)) return;
      dragged = true;
      centerCover(coverPosition - Math.sign(x));
    });
    flow.addEventListener("click", event => {
      if (event.target.closest(".case-controls, .carousel-nav, .gesture-hint, .open-gallery")) return;
      const copy = event.target.closest(".case-back-copy");
      if (copy && copy.scrollHeight > copy.clientHeight) return;
      closeOptions();
      if (dragged && event.detail > 0) {
        event.preventDefault();
        return;
      }
      const disc = event.target.closest(".disc-link");
      if (disc) {
        if (!disc.closest(".is-disc-ready")) event.preventDefault();
        else window.hfAudio.cue("select");
        return;
      }
      if (opened) {
        closeCase();
        return;
      }
      const trigger = event.target.closest(".case-trigger");
      const cover = event.target.closest(".case-back, .case-hit")?.closest(".game-cover");
      const index = entries.findIndex(entry => entry.trigger === trigger || entry.cover === cover);
      if (index >= 0) openCase(index);
    });
  }

  function resolveCoverArt(collection) {
    if (collection.artMode === "default") return null;
    if (collection.art) return designs.find(design => design.arquivo === collection.art) ||
      { arquivo: collection.art, thumb: collection.artThumb };
    return collection.accepts ? designs.find(collection.accepts) : null;
  }

  function renderCoverCenter(cover, collection) {
    const center = cover.querySelector(".cover-center");
    const text = collection.brandText;
    center.hidden = false;
    center.classList.toggle("is-logo", !text);
    center.querySelector(".cover-center-text").textContent = text;
    if (text) center.style.setProperty("--brand-length", Math.max(7, Array.from(text.toUpperCase()).length));
    if (collection.brandColor) center.style.setProperty("--brand-color", collection.brandColor);
  }

  function makeCard(design, index, items) {
    const button = document.createElement("button");
    button.className = "work-card";
    button.type = "button";
    button.setAttribute("aria-label", "Ampliar " + design.titulo + ", " + yearLabel(design));
    button.innerHTML = `
      <span class="card-inner">
        <span class="card-media"><img loading="lazy" decoding="async" alt=""><span class="scanline" aria-hidden="true"></span></span>
        <span class="card-caption">
          <strong></strong>
          <span class="card-meta eyebrow"><span></span><span aria-hidden="true"></span></span>
        </span>
      </span>`;

    const image = button.querySelector("img");
    button.dataset.designKey = designKey(design);
    image.alt = design.titulo + " — " + design.categoria;
    const preview = thumbnail(design);
    if (preview.width > 0 && preview.height > 0) {
      image.width = preview.width;
      image.height = preview.height;
      image.style.aspectRatio = "auto " + preview.width + " / " + preview.height;
    }
    image.src = preview.src;
    image.addEventListener("error", () => { image.dataset.failed = ""; }, { once: true });
    button.querySelector("strong").textContent = design.titulo;
    const [metadata, number] = button.querySelector(".card-meta").children;
    metadata.textContent = design.categoria.replace(/^Banner · /, "") + " · " + yearLabel(design);
    number.textContent = indexLabel(index, items.length);
    button.addEventListener("click", () => openViewer(items, index, button));
    return button;
  }

  function renderGallery(page, config, selectedYear = "all", query = "") {
    const gallery = page.querySelector(".gallery");
    const filters = page.querySelector(".filters");
    const count = page.querySelector(".result-count");
    const search = page.querySelector("input[type=search]");
    search.value = query;
    const items = designs.filter(config.accepts);
    const years = [...new Set(items.map(item => item.ano).filter(Number.isInteger))].sort((a, b) => b - a);
    let currentYear = years.includes(selectedYear) ? selectedYear : "all";
    let timer;

    page.querySelector("h1").textContent = config.title;
    page.querySelector(".gallery-page").classList.toggle("banner-page", Boolean(config.isBanner));
    gallery.classList.toggle("banner-gallery", Boolean(config.isBanner));
    page.querySelector(".eject-button").addEventListener("click", ejectGallery);

    function showItems(year) {
      const terms = normalizeSearch(search.value.trim()).split(/\s+/);
      const visible = items.filter(item => (year === "all" || item.ano === year) &&
        terms.every(term => normalizeSearch([item.titulo, item.categoria, yearLabel(item)].join(" ")).includes(term)));
      gallery.replaceChildren(...visible.map(makeCard));
      count.textContent = visible.length + " " + (visible.length === 1 ? config.singular : config.plural);
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "empty-gallery";
        empty.textContent = "Nenhum trabalho por aqui ainda.";
        gallery.append(empty);
      }
    }
    search.addEventListener("input", () => showItems(currentYear));
    page.querySelector("[data-clear]").addEventListener("click", () => {
      search.value = "";
      filters.firstElementChild.click();
      showItems(currentYear);
      search.focus();
    });
    const share = page.querySelector("[data-share]");
    share.addEventListener("click", () => copyLink(routeLink(activeRoute), share.nextElementSibling, share));

    function selectYear(year, button) {
      if (year === currentYear) return;
      currentYear = year;
      filters.querySelector('[aria-pressed="true"]').setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", "true");
      clearTimeout(timer);
      gallery.classList.remove("is-entering");

      if (reducedMotion.matches) {
        gallery.classList.remove("is-exiting");
        showItems(year);
        return;
      }

      gallery.classList.add("is-exiting");
      timer = setTimeout(() => {
        if (!gallery.isConnected) return;
        showItems(year);
        gallery.classList.remove("is-exiting");
        gallery.classList.add("is-entering");
      }, 100);
    }

    for (const year of ["all", ...years]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = year === "all" ? "Todos" : year;
      button.setAttribute("aria-pressed", String(year === currentYear));
      button.addEventListener("click", () => selectYear(year, button));
      filters.append(button);
    }

    filters.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...filters.children];
      const index = buttons.indexOf(event.target);
      let target = index + (event.key === "ArrowLeft" ? -1 : 1);
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = buttons.length - 1;
      event.preventDefault();
      buttons[(target + buttons.length) % buttons.length].focus();
    });

    showItems(currentYear);
  }

  function refreshLiveGallery() {
    if (!liveRefreshPending || transitioning) return;
    liveRefreshPending = false;
    if (activeRoute === "/") {
      const focusedCover = main.querySelector(".game-cover:focus-within")?.dataset.collection;
      const centered = main.querySelector(".game-cover.is-centered")?.dataset.collection;
      const position = libraryRoutes.indexOf("/" + centered);
      if (position >= 0) coverPosition = position;
      renderRoute("/");
      if (focusedCover) main.querySelector(`[data-collection="${focusedCover}"] .case-trigger`)?.focus({ preventScroll: true });
      return;
    }
    if (activeRoute === "/contato") return;
    const gallery = galleries[activeRoute];
    if (!gallery) {
      location.hash = "/";
      return;
    }
    if (gallery.channel) {
      renderRoute(activeRoute);
      return;
    }
    const activeFilter = Number(main.querySelector('.filters [aria-pressed="true"]')?.textContent);
    const search = main.querySelector("input[type=search]");
    const scroll = screen.scrollTop;
    const searchFocused = search === document.activeElement;
    const focused = dialog.open || main.contains(document.activeElement);
    const viewed = dialog.open ? viewerItems[viewerPosition] : null;
    const current = viewed && designs.find(item => designKey(item) === designKey(viewed));
    if (viewed && !current) dialog.close();
    const page = document.querySelector("#gallery-template").content.cloneNode(true);
    renderGallery(page, gallery, activeFilter, search?.value);
    main.replaceChildren(page);
    screen.scrollTop = scroll;
    if (current) {
      viewerItems = designs.filter(gallery.accepts);
      let index = viewerItems.indexOf(current);
      if (index < 0) index = viewerItems.push(current) - 1;
      opener = [...main.querySelectorAll(".work-card")].find(card => card.dataset.designKey === designKey(current));
      showViewerItem(index, current.arquivo === viewed.arquivo);
    } else if (focused) {
      main.querySelector(searchFocused ? "input[type=search]" : '.filters [aria-pressed="true"]').focus({ preventScroll: true });
    }
    if (!viewed && bootComplete && designFromHash()) openLinkedDesign();
  }

  function getRoute() {
    const path = location.hash.slice(1).split("?")[0];
    return Object.hasOwn(galleries, path) || path === "/contato" ? path : "/";
  }

  function openLinkedDesign() {
    const config = galleries[activeRoute];
    const id = designFromHash();
    if (!id || !config || config.channel) return;
    const items = designs.filter(config.accepts);
    const item = designs.find(design => designKey(design) === id);
    if (!item) return;
    let index = items.indexOf(item);
    if (index < 0) index = items.push(item) - 1;
    const trigger = [...main.querySelectorAll(".work-card")].find(card => card.dataset.designKey === id);
    openViewer(items, index, trigger);
  }

  function renderRoute(path, moveFocus = false) {
    liveRefreshPending = false;
    const gallery = galleries[path];
    let template = path === "/contato" ? "contact" : "home";
    if (gallery) template = gallery.channel ? "channel" : "gallery";
    const page = document.querySelector("#" + template + "-template").content.cloneNode(true);
    stopCoverLoading?.();
    stopCoverLoading = null;
    handleHomeKeys = null;
    syncHomeMotion = null;
    if (gallery?.channel) {
      page.querySelector("h1").textContent = gallery.title;
      page.querySelector(".channel-page p").textContent = gallery.summary;
      if (gallery.art) page.querySelector(".channel-page img").src = thumbnail(resolveCoverArt({ ...gallery, artMode: "" })).src;
      const link = page.querySelector(".channel-page a");
      link.href = home.youtube || gallery.url;
      link.hidden = false;
      page.querySelector(".eject-button").addEventListener("click", ejectGallery);
    } else if (gallery) renderGallery(page, gallery);
    if (path === "/contato") syncContactLinks(page);
    if (path === "/") renderHome(page);

    if (dialog.open) dialog.close();
    main.replaceChildren(page);
    if (bootComplete && gallery && !gallery.channel && (activeRoute !== path || !moveFocus)) trackGallery(path, gallery.title);
    activeRoute = path;
    if (bootComplete) syncScene(path);
    header.hidden = Boolean(gallery);
    screen.classList.toggle("is-home", path === "/");
    for (const link of navigation) {
      if (link.getAttribute("href") === "#" + path) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }

    const pageName = gallery?.title ?? "Contato";
    document.title = path === "/" ? "HF Designs — Portfólio de design" : pageName + " — HF Designs";
    if (moveFocus) {
      screen.scrollTop = 0;
      main.querySelector("h1").focus({ preventScroll: true });
    }
    if (bootComplete) openLinkedDesign();
  }

  async function ejectGallery() {
    if (transitioning) return;
    transitioning = true;
    const departure = location.hash;
    const previousCover = activeRoute;
    if (dialog.open) dialog.close();
    window.hfAudio.setScene(null);
    window.hfAudio.cue("eject");
    ejectOverlay.querySelector(".eject-disc").dataset.disc = galleries[activeRoute]?.discStyle ?? "silver";
    screen.inert = true;
    ejectOverlay.hidden = false;

    try {
      const animation = ejectOverlay.getAnimations().find(motion => motion.animationName === "eject-sequence");
      if (animation) await animation.finished.catch(() => {});
      else {
        const duration = parseFloat(getComputedStyle(ejectOverlay).getPropertyValue("--eject-duration"));
        await new Promise(resolve => setTimeout(resolve, duration || 850));
      }
    } finally {
      ejectOverlay.hidden = true;
      screen.inert = false;
      if (location.hash === departure) location.hash = "/";
      requestedRoute = getRoute();
      const previousPosition = libraryRoutes.indexOf(previousCover);
      if (requestedRoute === "/" && previousPosition >= 0) coverPosition = previousPosition;
      renderRoute(requestedRoute, true);
      if (requestedRoute === "/" && previousPosition >= 0)
        main.querySelector(".game-cover.is-centered .case-trigger")?.focus({ preventScroll: true });
      transitioning = false;
    }
  }

  // A rota mais recente vence durante a transição, inclusive ao usar Voltar/Avançar.
  async function navigate() {
    requestedRoute = getRoute();
    if (!bootComplete || transitioning) return;
    if (requestedRoute === activeRoute) {
      if (designFromHash()) openLinkedDesign();
      else if (dialog.open) dialog.close();
      return;
    }
    transitioning = true;
    if (dialog.open) dialog.close();

    try {
      await window.hfTransition(() => {
        if (requestedRoute !== activeRoute) renderRoute(requestedRoute, true);
      });
    } finally {
      transitioning = false;
      refreshLiveGallery();
      if (requestedRoute !== activeRoute) navigate();
      else syncScene(activeRoute);
    }
  }

  document.querySelector(".skip-link").addEventListener("click", event => {
    event.preventDefault();
    main.focus();
    screen.scrollTop = main.offsetTop - screen.offsetTop;
  });

  function drawCables() {
    const origin = rig.getBoundingClientRect();
    const sockets = rig.querySelectorAll(".av-inputs i");
    const jacks = rig.querySelectorAll(".console-jacks i");
    const cables = rig.querySelectorAll(".signal-cables path");

    cables.forEach((cable, index) => {
      const a = sockets[index].getBoundingClientRect();
      const b = jacks[index].getBoundingClientRect();
      const x1 = a.x + a.width / 2 - origin.x;
      const y1 = a.y + a.height / 2 - origin.y;
      const x2 = b.x + b.width / 2 - origin.x;
      const y2 = b.y + b.height / 2 - origin.y;
      const slack = Math.max(y1 + 22, y2 + 21) + index * 4;
      const approach = x2 - Math.min(76, Math.abs(x2 - x1) * .36 + 13);
      cable.setAttribute("d", `M ${x1} ${y1} C ${x1} ${slack}, ${approach} ${slack}, ${x2} ${y2}`);
    });
  }

  const rigLayout = new ResizeObserver(drawCables);
  rigLayout.observe(rig);
  rigLayout.observe(rig.querySelector(".monitor"));
  rigLayout.observe(rig.querySelector(".console"));

  power.addEventListener("click", async event => {
    power.disabled = true;
    powerLabel.textContent = "Iniciando…";
    rig.classList.add("is-powered");
    const brief = getRoute() !== "/" || remembered("hf-console-booted");
    if (brief || reducedMotion.matches) intro.style.setProperty("--boot-duration", reducedMotion.matches ? ".48s" : "1.25s");
    intro.hidden = false;
    window.hfAudio.powerOn(brief || reducedMotion.matches ? "pulse" : home.bootPreset,
      brief || reducedMotion.matches ? "" : soundUrl(home.sounds.boot));

    const animation = intro.getAnimations().find(motion => ["boot-reveal", "boot-fade"].includes(motion.animationName));
    if (animation) await animation.finished.catch(() => {});

    window.hfAudio.finishBoot();
    intro.hidden = true;
    screen.inert = false;
    sound.hidden = false;
    rig.querySelector(".console-volume").hidden = false;
    remember("hf-console-booted", "yes");
    powerLabel.textContent = "Ligado";
    bootComplete = true;
    renderRoute(getRoute(), event.detail === 0);
  });

  function showMute(muted) {
    sound.setAttribute("aria-pressed", String(muted));
    sound.setAttribute("aria-label", muted ? "Ativar som" : "Silenciar som");
  }
  const audioPreferences = window.hfAudio.preferences();
  showMute(audioPreferences.muted);
  for (const volume of rig.querySelectorAll("[data-volume]")) {
    const key = volume.dataset.volume;
    volume.value = Math.round(audioPreferences[key] * 100);
    volume.addEventListener("input", () => window.hfAudio.setVolume(key, Number(volume.value) / 100));
  }
  sound.addEventListener("click", () => showMute(window.hfAudio.toggleMute()));

  document.addEventListener("keydown", event => {
    if (!bootComplete || dialog.open) return;
    if (event.key === "Escape" && Object.hasOwn(galleries, activeRoute)) {
      event.preventDefault();
      ejectGallery();
      return;
    }
    handleHomeKeys?.(event);
  });
  reducedMotion.addEventListener("change", () => syncHomeMotion?.());
  renderRoute(getRoute());
  window.addEventListener("hashchange", navigate);
  power.disabled = false;
  window.watchHfCatalog?.((items, assetBase, coverData, homeData) => {
    const designsChanged = JSON.stringify(designs) !== JSON.stringify(items);
    if (designsChanged) designs.splice(0, designs.length, ...items);
    liveAssetBase = assetBase;
    applyHomeSettings(homeData);
    const coversChanged = loadCovers(coverData);
    if (bootComplete && !transitioning) syncScene(activeRoute);
    if (designsChanged || coversChanged) liveRefreshPending = true;
    refreshLiveGallery();
  });
})();
