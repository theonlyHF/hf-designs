(() => {
  "use strict";

  const canvas = document.querySelector("#transition");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function createNoise(context, width, height) {
    const frame = context.createImageData(width, height);
    const pixels = frame.data;

    return function drawNoise(strength) {
      const bandHeight = 2 + Math.floor(Math.random() * 7);
      for (let y = 0; y < height; y++) {
        const interrupted = y % 23 < bandHeight;
        const line = y % 3 === 0 ? .55 : 1;
        const shift = interrupted ? Math.round(Math.random() * 26 - 13) * strength : 0;
        const base = interrupted ? 39 : 8;
        let blue = 0;

        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const grain = base + Math.random() * 130 * line;
          const red = interrupted && (x + shift) % 36 < 9 ? 26 * strength : 0;
          pixels[index] = grain + red;
          pixels[index + 1] = grain;
          pixels[index + 2] = interrupted ? blue + 27 * strength : grain;
          pixels[index + 3] = 255;
          blue = grain;
        }
      }

      context.putImageData(frame, 0, 0);
    };
  }

  // Redesenha o ruído a ~30 FPS em uma resolução limitada e encerra o loop ao final.
  window.hfTransition = function runTransition(atPeak) {
    const context = reducedMotion.matches ? null : canvas.getContext("2d");
    const fade = !context;
    const duration = fade ? 240 : 570;
    const peak = fade ? .5 : .46;
    let drawNoise;

    if (context) {
      const { clientWidth, clientHeight } = canvas.parentElement;
      const scale = Math.min(320 / clientWidth, 200 / clientHeight, 1);
      canvas.width = Math.max(1, Math.round(clientWidth * scale));
      canvas.height = Math.max(1, Math.round(clientHeight * scale));
      drawNoise = createNoise(context, canvas.width, canvas.height);
    } else {
      canvas.width = canvas.height = 1;
    }

    canvas.classList.toggle("is-fade", fade);
    canvas.style.opacity = "0";
    canvas.hidden = false;

    return new Promise(resolve => {
      let start;
      let lastNoise = -Infinity;
      let swapped = false;

      function tick(now) {
        start ??= now;
        const progress = Math.min((now - start) / duration, 1);
        const strength = progress < peak ? progress / peak : (1 - progress) / (1 - peak);

        canvas.style.opacity = fade ? strength : Math.min(1, strength * 1.17);
        if (drawNoise && now - lastNoise >= 30) {
          drawNoise(strength);
          lastNoise = now;
        }
        if (!swapped && progress >= peak) {
          swapped = true;
          atPeak();
        }
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          canvas.hidden = true;
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  };
})();
