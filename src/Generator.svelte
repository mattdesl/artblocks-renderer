<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fetchProject, fetchToken } from "./query";
  import renderHTML from "./render";
  import {
    createMP4Encoder,
    createGIFEncoder,
    createPNGEncoder,
    downloadBlob,
    createFrameSequenceEncoder,
  } from "./recording";

  const dispatch = createEventDispatcher();

  export let id = "0";
  export let fps = 30;
  export let width = 1080;
  export let height = 1080;
  export let format = "mp4";
  export let totalFrames = 30;
  export let dithering = false;

  const maxDim = 256;

  let aspect, canvasWidth, canvasHeight, pixelRatio;
  $: {
    aspect = width / height;
    pixelRatio = window.devicePixelRatio;
    canvasWidth = maxDim;
    canvasHeight = canvasWidth / aspect;
  }

  let hasProgress = format !== 'inline';
  $: hasProgress = format !== 'inline';

  let encoder;
  let promise, visualizer;
  $: promise = start(id);

  async function receive(evt) {
    // console.log(evt, evt.data);
    const iframe = evt.source;
    const data = evt.data;
    if (data.event === "start") {
      if (hasProgress) dispatch("progress", 0);
      if (encoder) {
        iframe.postMessage({ event: "start" }, "*");
      } else {
        if (hasProgress) dispatch("finish");
      }
    } else if (data.event === "frame") {
      const frame = data.frame;
      const pixels = data.pixels;

      if (hasProgress) {
        dispatch("progress", frame / totalFrames);
        await encoder.encode(pixels, frame);
      }

      if (visualizer) {
        visualizer.width = canvasWidth * pixelRatio;
        visualizer.height = canvasHeight * pixelRatio;
        visualizer.style.width = `${canvasWidth}px`;
        visualizer.style.height = `${canvasHeight}px`;
        visualizer.style.display = "";
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
      if (hasProgress) {
        dispatch("progress", 1);
        if (buf) {
          downloadBlob(buf, `${id}${encoder.extension}`, encoder.type);
        }
        dispatch("finish");
      }
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

    const autoWidth = !width;
    const autoHeight = !height;
    if (autoWidth || autoHeight) {
      let aspect = 1;
      const defaultSize = 1024;
      if (data && data.project && data.project.scriptJSON) {
        if (typeof data.project.scriptJSON.aspectRatio === 'number') {
          aspect = data.project.scriptJSON.aspectRatio;
        }
      }
      if (autoWidth && autoHeight) { // use default size
        height = defaultSize;
        width = Math.round(height * aspect);
      } else if (autoWidth) { // decide width based on aspect
        width = Math.round(height * aspect);
      } else { // decide height based on aspect
        height = Math.round(width / aspect);
      }
    }

    let opts = { width, height, fps, totalFrames, dithering };
    if (format === "mp4") encoder = await createMP4Encoder(opts);
    else if (format === "png") encoder = await createPNGEncoder(opts);
    else if (format === "frames")
      encoder = await createFrameSequenceEncoder(opts);
    else if (format === 'gif') encoder = await createGIFEncoder(opts);
    else encoder = createInlineEncoder(opts);

    // aborted
    if (!encoder) {
      dispatch("finish");
      return null;
    }

    return renderHTML(data, {
      inline: format === 'inline',
      fps,
      width,
      height,
      totalFrames,
    });
  }

  function createInlineEncoder (opts) {
    return {
      type: "image/png",
      extension: ".png",
      async encode(bitmap) {
        // blob = getBitmapBlob(bitmap, width, height, "image/png");
      },
      async finish() {
        return null;
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
  class:hidden={format === "png"}
  style="width: {canvasWidth}px; height: {canvasHeight}px;"
>
  {#await promise}
    <div class="loading">loading...</div>
  {:then html}
    {#if html}
      {#if format !== 'inline'}
        <canvas bind:this={visualizer} style="display:none" />
      {/if}
      <iframe
        width="{width}px"
        height="{height}px"
        scrolling="no"
        title=""
        srcdoc={html}
        class:visible={format === 'inline'}
      />
    {/if}
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
    visibility: hidden;
  }
  .visible {
    visibility: visible;
    pointer-events: initial;
  }
  .hidden {
    visibility: hidden;
  }
</style>
