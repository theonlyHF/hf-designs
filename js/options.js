(() => {
  "use strict";
  const image = /^[^\\/:*?"<>|\u0000-\u001f]+\.(?:png|jpe?g|webp|gif|avif)$/i;
  const sound = /^[^\\/:*?"<>|\u0000-\u001f]+\.(?:mp3|ogg|wav|m4a)$/i;
  const color = /^#[\da-f]{6}$/i;
  const scope = /^(all|home|contact|gallery|cover:[a-z0-9-]{1,65})$/;
  const events = ["move","confirm","back","open","close","hover","powerOn","powerOff","glitch","copy"];
  const str = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";
  const matching = (value, pattern) => typeof value === "string" && pattern.test(value) ? value : "";
  const num = (value, min, max, fallback = null) => Number.isFinite(value) && value >= min && value <= max ? value : fallback;

  function designs(items) {
    if (!Array.isArray(items)) return [];
    const keys = new Set();
    const files = new Set();
    return items.flatMap(item => {
      if (!item || !matching(item.arquivo, image) || !str(item.titulo, 250) || !str(item.categoria, 120)) return [];
      const id = str(item.id, 200);
      const key = id || item.arquivo;
      if (keys.has(key) || files.has(item.arquivo)) return [];
      keys.add(key);
      files.add(item.arquivo);
      return [{ ...item, id: id || null, titulo: str(item.titulo, 250), categoria: str(item.categoria, 120),
        ano: Number.isInteger(item.ano) ? item.ano : null,
        thumb: matching(item.thumb, image) || null, width: num(item.width, 1, 65535), height: num(item.height, 1, 65535),
        descricao: str(item.descricao, 3000), papel: str(item.papel, 500), objetivo: str(item.objetivo, 1000),
        altText: str(item.altText, 500), dominantColor: matching(item.dominantColor, color) }];
    });
  }

  function audio(value) {
    if (!value || typeof value !== "object") return null;
    const ids = new Set();
    const tracks = Array.isArray(value.tracks) ? value.tracks.slice(0, 100).flatMap(item => {
      if (!item || !matching(item.file, sound) || !str(item.id, 80) || ids.has(item.id)) return [];
      ids.add(item.id);
      const track = { id: item.id, title: str(item.title, 120), file: item.file, enabled: item.enabled !== false,
        mobile: item.mobile !== false, scope: matching(item.scope, scope) || "all",
        volume: num(item.volume, 0, 1, 1), fadeInMs: num(item.fadeInMs, 0, 15000, 0), fadeOutMs: num(item.fadeOutMs, 0, 15000, 0),
        loop: item.loop !== false, playbackRate: num(item.playbackRate, .5, 2, 1), order: num(item.order, 0, 1000, 0),
        gapMs: num(item.gapMs, 0, 60000, 0), delayMs: num(item.delayMs, 0, 60000, 0),
        crossfadeMs: num(item.crossfadeMs, 0, 15000, 0),
        trimStart: num(item.trimStart, 0, 86400, 0), trimEnd: num(item.trimEnd, 0, 86400),
        loopStart: num(item.loopStart, 0, 86400), loopEnd: num(item.loopEnd, 0, 86400) };
      if (track.trimEnd <= track.trimStart) track.trimEnd = null;
      if (track.loopStart === null || track.loopEnd <= track.loopStart) track.loopStart = track.loopEnd = null;
      return [track];
    }).sort((a,b) => a.order-b.order) : [];
    const sfx = {};
    for (const event of events) {
      const item = value.sfx?.[event];
      if (!item || typeof item !== "object") continue;
      sfx[event] = { file: matching(item.file, sound), enabled: item.enabled !== false,
        volume: num(item.volume, 0, 1, 1), cooldownMs: num(item.cooldownMs, 0, 5000, 110),
        maxVoices: num(item.maxVoices, 1, 8, 2), pitchVariancePct: num(item.pitchVariancePct, 0, 25, 0) };
    }
    return { master: {volume: num(value.master?.volume, 0, 1, 1), startMuted: value.master?.startMuted === true, muteOnMobile: value.master?.muteOnMobile === true},
      tracks, sfx, mode: value.mode === "shuffle" ? "shuffle" : "sequential",
      ducking: {enabled: value.ducking?.enabled === true, amountDb: num(value.ducking?.amountDb, -30, 0, -8),
        attackMs: num(value.ducking?.attackMs, 10, 2000, 35), releaseMs: num(value.ducking?.releaseMs, 10, 4000, 140)},
      modalLowpass: {enabled: value.modalLowpass?.enabled === true, hz: num(value.modalLowpass?.hz, 100, 20000, 1200)} };
  }

  function cover(entry) {
    const types = ["jewel","digipak","sleeve","dvd","cartridge","custom"];
    return { caseType: types.includes(entry.caseType) ? entry.caseType : "",
      frameOptions: {color: matching(entry.frameOptions?.color, color), width: num(entry.frameOptions?.width, 0, 20), radius: num(entry.frameOptions?.radius, 0, 40)},
      texture: {kind: ["none","fabric","paper","plastic"].includes(entry.texture?.kind) ? entry.texture.kind : "", intensity: num(entry.texture?.intensity, 0, 1)},
      gloss: {intensity:num(entry.gloss?.intensity, 0, 1),angle:num(entry.gloss?.angle, 0, 360)},
      shadow: {blur:num(entry.shadow?.blur, 0, 100), opacity:num(entry.shadow?.opacity, 0, 1), offsetY:num(entry.shadow?.offsetY, 0, 60),color:matching(entry.shadow?.color,color)},
      spine: {text:str(entry.spine?.text, 80),color:matching(entry.spine?.color,color),art:matching(entry.spine?.art,image)},
      backArt: matching(entry.backArt,image),
      disc: {art:matching(entry.disc?.art,image), holeRatio:num(entry.disc?.holeRatio,.05,.40), tint:matching(entry.disc?.tint,color),
        gloss:num(entry.disc?.gloss,0,1),labelText:str(entry.disc?.labelText,80),spin: {
          onHover:entry.disc?.spin?.onHover===true,onSelect:entry.disc?.spin?.onSelect===true,rpm:num(entry.disc?.spin?.rpm,1,180,30),
          direction:entry.disc?.spin?.direction==="reverse"?"reverse":"normal" }},
      motion: {hover:["none","tilt","lift","glow","float"].includes(entry.motion?.hover)?entry.motion.hover:"",
        flipOnSelect:entry.motion?.flipOnSelect===true, durationMs:num(entry.motion?.durationMs,80,2000), intensity:num(entry.motion?.intensity,0,1)},
      sound: Object.fromEntries(["hover","select","flip"].flatMap(key=>events.includes(entry.sound?.[key])?[[key,entry.sound[key]]]:[])),
      visible: entry.visible !== false, featured:entry.featured===true, defaultSelected:entry.defaultSelected===true,
      collection:str(entry.collection,100), linkedCategory:str(entry.linkedCategory,120),
      linkedDesignIds:Array.isArray(entry.linkedDesignIds)?[...new Set(entry.linkedDesignIds.filter(id=>typeof id==="string" && id.length<=200))].slice(0,300):[],
      altText:str(entry.altText, 500) };
  }

  window.hfOptions = { designs, audio, cover, matching, image };
})();
