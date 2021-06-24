<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fetchProject, fetchToken } from "./query";
  import escape from "escape-html";
  import renderHTML from "./render";
  import { GIFEncoder, quantize, applyPalette } from "gifenc";

  const dispatch = createEventDispatcher();

  export let id = "0";
  export let fps = 30;
  export let width = 1080;
  export let height = 1080;
  export let format = "mp4";
  export let totalFrames = 30;
  const maxDim = 256;

  let aspect, canvasWidth, canvasHeight, pixelRatio;
  $: {
    aspect = width / height;
    pixelRatio = window.devicePixelRatio;
    canvasWidth = maxDim;
    canvasHeight = canvasWidth / aspect;
  }

  let encoder;
  let promise, visualizer;
  $: promise = start(id);

  async function receive(evt) {
    // console.log(evt, evt.data);
    const iframe = evt.source;
    const data = evt.data;
    if (data.event === "start") {
      let opts = { width, height, fps };
      dispatch("progress", 0);
      encoder = await (format === "mp4"
        ? createMP4Encoder(opts)
        : createGIFEncoder(opts));
      iframe.postMessage({ event: "start" }, "*");
    } else if (data.event === "frame") {
      const frame = data.frame;
      const pixels = data.pixels;
      dispatch("progress", frame / totalFrames);
      await encoder.encode(pixels);

      if (visualizer) {
        visualizer.width = canvasWidth * pixelRatio;
        visualizer.height = canvasHeight * pixelRatio;
        visualizer.style.width = `${canvasWidth}px`;
        visualizer.style.height = `${canvasHeight}px`;
        const ctx = visualizer.getContext("2d");
        ctx.drawImage(pixels, 0, 0, visualizer.width, visualizer.height);
      }

      iframe.postMessage(
        {
          event: "frame",
          frame,
        },
        "*"
      );
    } else if (data.event === "finish") {
      const buf = await encoder.finish();
      dispatch("prgoress", 1);
      downloadBlob(buf, `${id}${encoder.extension}`, encoder.type);
      dispatch("finish");
    }
  }

  onMount(() => {
    window.addEventListener("message", receive, false);
    return () => {
      window.removeEventListener("message", receive);
    };
  });

  async function start(id) {
    const data = await fetchData(id);
    return renderHTML(data, {
      fps,
      width,
      height,
      totalFrames,
    });
  }

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

  async function createGIFEncoder(opts = {}) {
    const { fps = 30, width, height } = opts;
    const gif = GIFEncoder();
    const tmpCanvas = document.createElement("canvas");
    const tmpContext = tmpCanvas.getContext("2d");
    return {
      type: "image/gif",
      extension: ".gif",
      async encode(bitmap) {
        tmpCanvas.width = width;
        tmpCanvas.height = height;
        tmpContext.drawImage(bitmap, 0, 0, width, height);
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

  async function fetchData(id) {
    id = String(id);
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      throw new Error("id query parameter is not a number");
    }
    const C = 1000000;
    const projNumber = Math.floor(idNum / C);
    const project = await fetchProject(projNumber);
    const token = await fetchToken(id);
    return {
      id,
      project,
      token,
    };
  }
</script>

<div
  class="container"
  style="width: {canvasWidth}px; height: {canvasHeight}px;"
>
  {#await promise}
    <div class="loading">loading...</div>
  {:then html}
    <canvas bind:this={visualizer} />
    <iframe
      width="{width}px"
      height="{height}px"
      scrolling="no"
      title=""
      srcdoc={html}
    />
  {/await}
</div>

<style>
  .container {
    margin-top: 10px;
    overflow: hidden;
  }
  .loading {
    font-size: 12px;
  }
  iframe {
    pointer-events: none;
    border: none;
    /* visibility: hidden; */
  }
</style>
