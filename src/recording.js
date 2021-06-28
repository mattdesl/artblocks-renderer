import { GIFEncoder, quantize, applyPalette } from "gifenc";

let tmpCanvas = document.createElement("canvas");
let tmpContext = tmpCanvas.getContext("2d");

function detectWebM() {
  var elem = document.createElement("canvas");
  if (!!(elem.getContext && elem.getContext("2d"))) {
    // was able or not to get WebP representation
    return elem.toDataURL("image/webp").indexOf("data:image/webp") == 0;
  } else {
    // very old browser like IE 8, canvas not supported
    return false;
  }
}

let _isWebM = detectWebM();

export function isWebMSupported() {
  return _isWebM;
}

export function isFrameSequenceSupported() {
  return typeof window.showDirectoryPicker === "function";
}

export function downloadBlob(buf, filename, type) {
  const blob = buf instanceof Blob ? buf : new Blob([buf], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

export async function createMP4Encoder(opts = {}) {
  const { width, height, mp4, fps = 30 } = opts;
  const { loadMP4Module } = await window.MP4Encoder;
  const MP4 = await loadMP4Module();
  const encoder = MP4.createWebCodecsEncoder({ width, height, fps });
  return {
    type: "video/mp4",
    extension: ".mp4",
    async encode(bitmap) {
      await encoder.addFrame(bitmap);
    },
    async finish() {
      const buf = await encoder.end();
      return buf;
    },
  };
}

function getBitmapRGBA(bitmap, width = bitmap.width, height = bitmap.height) {
  tmpCanvas.width = width;
  tmpCanvas.height = height;
  tmpContext.clearRect(0, 0, width, height);
  tmpContext.drawImage(bitmap, 0, 0, width, height);
  return tmpContext.getImageData(0, 0, width, height).data;
}

function getBitmapBlob(
  bitmap,
  width = bitmap.width,
  height = bitmap.height,
  type = "image/png",
  encoderOptions = 0.9
) {
  tmpCanvas.width = width;
  tmpCanvas.height = height;
  tmpContext.clearRect(0, 0, width, height);
  tmpContext.drawImage(bitmap, 0, 0, width, height);
  const url = tmpCanvas.toDataURL(type, encoderOptions);
  return createBlobFromDataURL(url);
}

export async function createFrameSequenceEncoder(opts = {}) {
  const {
    width,
    height,
    type = "image/png",
    prefix = "",
    encoderOptions = 0.9,
    totalFrames = 1000,
  } = opts;

  const extension = {
    "image/png": ".png",
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
  }[type];
  if (!extension) throw new Error(`Invalid image mime type ${type}`);

  let dir;
  try {
    dir = await window.showDirectoryPicker();
  } catch (err) {
    if (err.code === 20 || err.name === "AbortError") {
      // don't warn on abort
      return null;
    } else {
      throw err;
    }
  }

  return {
    type: "image/png",
    extension: ".png",
    async encode(bitmap, frameIndex) {
      const frameDigitCount = String(totalFrames).length;
      const curFrameName = String(frameIndex).padStart(frameDigitCount, "0");
      const curFrameFile = `${prefix}${curFrameName}${extension}`;

      const fh = await dir.getFileHandle(curFrameFile, { create: true });
      const fw = await fh.createWritable();

      const blob = getBitmapBlob(bitmap, width, height, type, encoderOptions);
      await fw.write(blob);
      await fw.close();
    },
    async finish() {},
  };
}

export async function createGIFEncoder(opts = {}) {
  const { fps = 30, width, height } = opts;
  const gif = GIFEncoder();
  return {
    type: "image/gif",
    extension: ".gif",
    async encode(bitmap) {
      const pixels = getBitmapRGBA(bitmap, width, height);
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

function createBlobFromDataURL(dataURL) {
  const splitIndex = dataURL.indexOf(",");
  if (splitIndex === -1) {
    return new Blob();
  }
  const base64 = dataURL.slice(splitIndex + 1);
  const byteString = atob(base64);
  const type = dataURL.slice(0, splitIndex);
  const mimeMatch = /data:([^;]+)/.exec(type);
  const mime = (mimeMatch ? mimeMatch[1] : "") || undefined;
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}
