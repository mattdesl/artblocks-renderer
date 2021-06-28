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
      dispatch("progress", 0);
      if (encoder) {
        iframe.postMessage({ event: "start" }, "*");
      } else {
        dispatch("finish");
      }
    } else if (data.event === "frame") {
      const frame = data.frame;
      const pixels = data.pixels;
      dispatch("progress", frame / totalFrames);
      await encoder.encode(pixels, frame);

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
      dispatch("progress", 1);
      if (buf) {
        downloadBlob(buf, `${id}${encoder.extension}`, encoder.type);
      }
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
    let opts = { width, height, fps, totalFrames };
    if (format === "mp4") encoder = await createMP4Encoder(opts);
    else if (format === "png") encoder = await createPNGEncoder(opts);
    else if (format === "frames")
      encoder = await createFrameSequenceEncoder(opts);
    else encoder = await createGIFEncoder(opts);

    // aborted
    if (!encoder) {
      dispatch("finish");
      return null;
    }

    const data = await fetchData(id);
    return renderHTML(data, {
      fps,
      width,
      height,
      totalFrames,
    });
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
      <canvas bind:this={visualizer} style="display:none" />
      <iframe
        width="{width}px"
        height="{height}px"
        scrolling="no"
        title=""
        srcdoc={html}
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
  .hidden {
    visibility: hidden;
  }
</style>
