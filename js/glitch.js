(() => {
  "use strict";
  const canvas = document.querySelector("#transition");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let grain;
  let quality = navigator.deviceMemory <= 2 || navigator.hardwareConcurrency <= 4 ? 1 : 2;

  function texture() {
    if (grain) return grain;
    grain = document.createElement("canvas");
    grain.width = 192;
    grain.height = 112;
    const context = grain.getContext("2d");
    const image = context.createImageData(grain.width, grain.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const light = 16 + Math.random() * 32;
      image.data[i] = light + 7;
      image.data[i+1] = light;
      image.data[i+2] = light + 15;
      image.data[i+3] = 255;
    }
    context.putImageData(image, 0, 0);
    return grain;
  }

  window.hfTransition = function transition(swap, simple = false) {
    if (!canvas || document.hidden) { swap(); return Promise.resolve(); }
    let context = simple || reduced.matches || !quality ? null : canvas.getContext("2d");
    const duration = context ? 330 : 190;
    const peak = .46;
    let sprite;
    if (context) {
      canvas.width = quality === 2 ? 192 : 96;
      canvas.height = quality === 2 ? 112 : 56;
      sprite = texture();
      context.imageSmoothingEnabled = false;
      context.drawImage(sprite, 0, 0, canvas.width, canvas.height);
    }
    canvas.classList.toggle("is-fade", !context);
    canvas.style.opacity = "0";
    canvas.hidden = false;

    return new Promise((resolve,reject) => {
      let start, frame, last, samples = 0, total = 0, lastBand = -1;
      let swapped = false;
      function commit() {
        if (swapped) return;
        swapped = true;
        swap();
      }
      function finish(error) {
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", hidden);
        canvas.hidden = true;
        if (error) reject(error); else resolve();
      }
      function hidden() {
        if (!document.hidden) return;
        try { commit(); finish(); } catch (error) { finish(error); }
      }
      function tick(now) {
        start ??= now;
        if (last && samples < 6) {
          total += now-last;
          samples++;
          if ((samples === 6 || samples >= 3 && total >= 120) && total/samples > 24) {
            quality = total/samples > 40 ? 0 : 1;
            if (!quality) { context = null; canvas.classList.add("is-fade"); }
          }
        }
        last = now;
        const progress = Math.min((now-start)/duration,1);
        const opacity = progress < peak ? progress/peak : (1-progress)/(1-peak);
        canvas.style.opacity = String(opacity);
        const band = Math.floor(progress*10);
        if (context && quality === 2 && lastBand !== band) {
          lastBand = band;
          const y = band*11 % sprite.height;
          const x = band % 9;
          context.drawImage(sprite, x, y, sprite.width-x, 8, 0, y, canvas.width, 8);
        }
        try { if (progress >= peak) commit(); } catch (error) { finish(error); return; }
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
      }
      document.addEventListener("visibilitychange", hidden);
      frame = requestAnimationFrame(tick);
    });
  };
})();
