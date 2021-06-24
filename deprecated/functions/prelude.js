import * as time from "./prelude/time.js";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

console.log("Waiting...");
time.attach();
const onload = () => {
  window.removeEventListener("load", onload);
  console.log("Starting...");
  if ("__MP4__" in window) {
    window.__MP4__.then((mp4) => {
      console.log("MP4 Ready");
      start(mp4);
    });
  } else {
    console.log("No MP4");
    start();
  }
};
window.addEventListener("load", onload);

// const download = (url, filename) => {
//   const anchor = document.createElement("a");
//   anchor.href = url;
//   anchor.download = filename || "download";
//   anchor.click();
// };

function downloadBlob(buf, filename, type) {
  const blob = buf instanceof Blob ? buf : new Blob([buf], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

async function createMP4Encoder(opts = {}) {
  const { width, height, mp4, fps = 30 } = opts;
  const MP4 = await mp4.loadMP4Module();
  const encoder = MP4.createWebCodecsEncoder({ width, height, fps });
  return {
    type: "video/mp4",
    extension: ".mp4",
    async encode(canvas) {
      const bitmap = await createImageBitmap(canvas);
      await encoder.addFrame(bitmap);
    },
    async finish() {
      const buf = await encoder.end();
      return buf;
    },
  };
}

async function createGIFEncoder(opts = {}) {
  const { fps = 30 } = opts;
  const gif = GIFEncoder();
  const tmpCanvas = document.createElement("canvas");
  const tmpContext = tmpCanvas.getContext("2d");
  return {
    type: "image/gif",
    extension: ".gif",
    async encode(canvas) {
      const width = canvas.width;
      const height = canvas.height;
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      tmpContext.drawImage(canvas, 0, 0, width, height);
      const pixels = tmpContext.getImageData(0, 0, width, height).data;
      const palette = quantize(pixels, 256);
      const index = applyPalette(pixels, palette);
      const fpsInterval = 1 / fps;
      const delay = fpsInterval * 1000;
      gif.writeFrame(index, width, height, {
        palette,
        delay,
      });
    },
    async finish() {
      gif.finish();
      return gif.bytes();
    },
  };
}

async function start(mp4) {
  const fps = 30;
  const format = "mp4";

  // Create an encoding stream
  const duration = 1;
  const totalFrames = Math.ceil(fps * duration);
  const frameList = Array(totalFrames)
    .fill()
    .map((_, i) => i);

  const canvas = findCanvas();
  if (!canvas) return console.warn("no canvas");

  const { width, height } = canvas;

  const encoder = await createMP4Encoder({ mp4, fps, width, height });
  // const encoder = await createGIFEncoder({ fps, width, height });

  for (let i of frameList) {
    const dt = (1 / fps) * 1000;
    time.step(dt);
    if (i % fps === 0) console.log("Frame", i);
    await encoder.encode(canvas);
    await time.sleep(dt);
  }

  console.log("Downloading");
  const bytes = await encoder.finish();
  downloadBlob(bytes, `download${encoder.extension}`, encoder.type);

  function findCanvas() {
    const canvases = [...document.querySelectorAll("canvas")];
    const canvas = canvases[canvases.length - 1];
    return canvas;
  }
}
