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
  const isBanner = item => item.categoria.startsWith("Banner · ");
  const isPoster = item => item.categoria === "Pôster";
  const isPrint = item => item.categoria === "Estampa";
  const standardGalleries = {
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
  let home = { color: "", image: "", sounds: {}, effect: "waves" };

  let activeRoute;
  let bootComplete = false;
  let requestedRoute;
  let transitioning = false;
  let coverPosition = 1;
  let handleHomeKeys;
  let syncHomeMotion;
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
  function applyHomeSettings(settings) {
    if (settings && typeof settings === "object") {
      home = {
        color: typeof settings.color === "string" && color.test(settings.color) ? settings.color : "",
        image: typeof settings.image === "string" && imageFile.test(settings.image) ? settings.image : "",
        effect: homeEffects.includes(settings.effect) ? settings.effect : "waves",
        sounds: settings.sounds && typeof settings.sounds === "object"
          ? Object.fromEntries(Object.entries(settings.sounds).filter(([, file]) => typeof file === "string" && soundFile.test(file)))
          : {},
      };
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
  function syncScene(path) {
    const gallery = Object.hasOwn(galleries, path);
    const fallback = gallery ? "gallery" : "home";
    const key = path.slice(1) || "home";
    const file = (Object.hasOwn(home.sounds, key) && home.sounds[key]) || (gallery && home.sounds.gallery);
    const url = file ? new URL("../sounds/" + encodeURIComponent(file), new URL(liveAssetBase, document.baseURI)).href : "";
    window.hfAudio.setScene(fallback, url);
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

  function showViewerItem(position) {
    viewerPosition = (position + viewerItems.length) % viewerItems.length;
    const design = viewerItems[viewerPosition];
    viewerTitle.textContent = design.titulo;
    viewerDetails.textContent = design.categoria + " · " + yearLabel(design);
    viewerIndex.textContent = indexLabel(viewerPosition, viewerItems.length);
    viewerImage.alt = design.titulo + " — " + design.categoria;
    viewerImage.src = imagePath(design);
  }

  function openViewer(items, position, trigger) {
    viewerItems = items;
    opener = trigger;
    previousButton.disabled = nextButton.disabled = items.length < 2;
    showViewerItem(position);
    dialog.showModal();
    document.body.classList.add("has-lightbox");
  }

  closeButton.addEventListener("click", () => dialog.close());
  previousButton.addEventListener("click", () => showViewerItem(viewerPosition - 1));
  nextButton.addEventListener("click", () => showViewerItem(viewerPosition + 1));
  dialog.addEventListener("close", () => {
    // Um fechamento disparado pela troca de rota pode chegar após outra abertura.
    if (dialog.open) return;
    document.body.classList.remove("has-lightbox");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    refreshLiveGallery();
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (viewerItems.length > 1) showViewerItem(viewerPosition + (event.key === "ArrowLeft" ? -1 : 1));
    }

    if (event.key === "Tab") {
      const last = nextButton.disabled ? closeButton : nextButton;
      if (event.shiftKey && document.activeElement === closeButton) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        closeButton.focus();
      }
    }
  });

  function renderHome(page) {
    const flow = page.querySelector(".coverflow");
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
      const artwork = collection.art ? { arquivo: collection.art } : collection.accepts && designs.find(collection.accepts);
      const trigger = cover.querySelector(".case-trigger");
      const disc = cover.querySelector(".disc-link");

      cover.dataset.collection = route.slice(1);
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
        cover.style.setProperty("--cover-frame-image", `url("${imagePath({ arquivo: collection.frame })}")`);
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
        if (artwork) image.src = imagePath(artwork);
        else image.remove();
      }
      if (collection.discStyle === "print" && artwork) {
        const print = disc.querySelector(".disc-art");
        print.src = imagePath(artwork);
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

    function centerCover(position, playSound = true) {
      const nextPosition = Math.max(0, Math.min(position, entries.length - 1));
      if (nextPosition !== coverPosition) {
        showBack(false);
        fadeReducedMotion();
        if (playSound) window.hfAudio.cue("hover");
      }
      coverPosition = nextPosition;
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
        if (document.activeElement === close) disc.focus({ preventScroll: true });
      });
    }

    centerCover(coverPosition);
    flow.append(...entries.map(entry => entry.cover));

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
      if (opened || event.target.closest(".case-controls") || !event.isPrimary || event.button !== 0) return;
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
      if (event.target.closest(".case-controls")) return;
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
    image.alt = design.titulo + " — " + design.categoria;
    image.src = imagePath(design);
    image.addEventListener("error", () => { image.dataset.failed = ""; }, { once: true });
    button.querySelector("strong").textContent = design.titulo;
    const [metadata, number] = button.querySelector(".card-meta").children;
    metadata.textContent = design.categoria.replace(/^Banner · /, "") + " · " + yearLabel(design);
    number.textContent = indexLabel(index, items.length);
    button.addEventListener("click", () => openViewer(items, index, button));
    return button;
  }

  function renderGallery(page, config, selectedYear = "all") {
    const gallery = page.querySelector(".gallery");
    const filters = page.querySelector(".filters");
    const count = page.querySelector(".result-count");
    const items = designs.filter(config.accepts);
    const years = [...new Set(items.map(item => item.ano).filter(Number.isInteger))].sort((a, b) => b - a);
    let currentYear = years.includes(selectedYear) ? selectedYear : "all";
    let timer;

    page.querySelector("h1").textContent = config.title;
    page.querySelector(".gallery-page").classList.toggle("banner-page", Boolean(config.isBanner));
    gallery.classList.toggle("banner-gallery", Boolean(config.isBanner));
    page.querySelector(".eject-button").addEventListener("click", ejectGallery);

    function showItems(year) {
      const visible = year === "all" ? items : items.filter(item => item.ano === year);
      gallery.replaceChildren(...visible.map(makeCard));
      count.textContent = visible.length + " " + (visible.length === 1 ? config.singular : config.plural);
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "empty-gallery";
        empty.textContent = "Nenhum trabalho por aqui ainda.";
        gallery.append(empty);
      }
    }

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
    const scroll = screen.scrollTop;
    const focused = dialog.open || main.contains(document.activeElement);
    if (dialog.open) dialog.close();
    const page = document.querySelector("#gallery-template").content.cloneNode(true);
    renderGallery(page, gallery, activeFilter);
    main.replaceChildren(page);
    screen.scrollTop = scroll;
    if (focused) main.querySelector('.filters [aria-pressed="true"]').focus({ preventScroll: true });
  }

  function getRoute() {
    const path = location.hash.slice(1);
    return Object.hasOwn(galleries, path) || path === "/contato" ? path : "/";
  }

  function renderRoute(path, moveFocus = false) {
    liveRefreshPending = false;
    const gallery = galleries[path];
    let template = path === "/contato" ? "contact" : "home";
    if (gallery) template = gallery.channel ? "channel" : "gallery";
    const page = document.querySelector("#" + template + "-template").content.cloneNode(true);
    handleHomeKeys = null;
    syncHomeMotion = null;
    if (gallery?.channel) {
      page.querySelector("h1").textContent = gallery.title;
      page.querySelector(".channel-page p").textContent = gallery.summary;
      if (gallery.art) page.querySelector(".channel-page img").src = imagePath({ arquivo: gallery.art });
      const link = page.querySelector(".channel-page a");
      link.href = gallery.url;
      link.hidden = false;
      page.querySelector(".eject-button").addEventListener("click", ejectGallery);
    } else if (gallery) renderGallery(page, gallery);
    if (path === "/") renderHome(page);

    if (dialog.open) dialog.close();
    main.replaceChildren(page);
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
  }

  async function ejectGallery() {
    if (transitioning) return;
    transitioning = true;
    const departure = location.hash;
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
      renderRoute(requestedRoute, true);
      transitioning = false;
    }
  }

  // A rota mais recente vence durante a transição, inclusive ao usar Voltar/Avançar.
  async function navigate() {
    requestedRoute = getRoute();
    if (!bootComplete || transitioning || requestedRoute === activeRoute) return;
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
    intro.hidden = false;
    window.hfAudio.powerOn();

    const animation = intro.getAnimations().find(motion => motion.animationName === "boot-reveal");
    if (animation) await animation.finished.catch(() => {});

    intro.hidden = true;
    screen.inert = false;
    sound.hidden = false;
    powerLabel.textContent = "Ligado";
    bootComplete = true;
    renderRoute(getRoute(), event.detail === 0);
  });

  sound.addEventListener("click", () => {
    const muted = window.hfAudio.toggleMute();
    sound.setAttribute("aria-pressed", String(muted));
    sound.setAttribute("aria-label", muted ? "Ativar som" : "Silenciar som");
  });

  document.addEventListener("keydown", event => {
    if (!bootComplete) return;
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
