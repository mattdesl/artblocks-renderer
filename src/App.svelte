<script>
  import Generator from "./Generator.svelte";
  import Progress from "./Progress.svelte";

  let id = "9000025";
  let fps = 30;
  let fpsPresets = [24, 25, 30, 50, 60];
  let duration = 4;
  let width = 512;
  let height = 512;
  let format = "gif";

  let rendering = false;
  let totalFrames;
  let progress = 0;
  $: totalFrames = Math.ceil(duration * fps);

  function startRender() {
    progress = 0;
    rendering = true;
  }

  function stopRender() {
    rendering = false;
  }

  async function canUseMP4() {
    const { isWebCodecsSupported } = await window.MP4Encoder;
    return isWebCodecsSupported();
  }
</script>

<main>
  <div class="info">
    <h1>ArtBlocks Recorder</h1>
    <p>
      Enter your configuration and click the <strong>Render</strong> button to export
      the high quality media.
    </p>
    <p>
      Made by
      <a target="_blank" href="https://twitter.com/mattdesl">@mattdesl</a>.
    </p>
  </div>
  {#if rendering}
    <div class="row">
      <button on:click={stopRender} class="button">Cancel</button>
      <Progress {progress} />
    </div>
    <Generator
      on:progress={({ detail }) => {
        progress = detail;
      }}
      on:finish={stopRender}
      {fps}
      {totalFrames}
      {width}
      {height}
      {format}
      {id}
    />
  {:else}
    <div class="settings">
      <div class="field token-id-container">
        <caption class="tab">Token ID</caption>
        <input class="token-id" type="text" bind:value={id} />
      </div>
      <div class="field fps-container">
        <caption>Framerate</caption>
        <input
          class="fps"
          min="1"
          step="1"
          max="60"
          type="number"
          bind:value={fps}
        />
        {#each fpsPresets as preset}
          <button
            on:click={() => {
              fps = preset;
            }}>{preset}</button
          >
        {/each}
      </div>
      <div class="field duration-container">
        <caption>Duration</caption>
        <input
          class="duration"
          min="0"
          step="0.1"
          type="number"
          bind:value={duration}
        />
        <span class="unit">seconds</span>
      </div>
      <div class="field dimensions-container">
        <caption>Dimensions</caption>
        <input
          class="dimensions"
          min="0"
          step="1"
          max="4096"
          type="number"
          bind:value={width}
        />
        <span class="x-separator">x</span>
        <input
          class="dimensions"
          min="0"
          step="1"
          max="4096"
          type="number"
          bind:value={height}
        />
        <span class="unit">px</span>
      </div>
      <div class="field dimensions-container">
        <caption>Format</caption>
        <select bind:value={format}>
          <option value="gif">gif</option>
          {#await canUseMP4() then canUse}
            {#if canUse}
              <option value="mp4">mp4</option>
            {/if}
          {/await}
        </select>
      </div>

      {#await canUseMP4() then canUse}
        {#if !canUse}
          <p class="mp4-support">
            Note: MP4 support disabled, please use Chrome with "Experimental Web
            Platform Features" enabled in chrome://flags.
          </p>
        {/if}
      {/await}

      <button on:click={startRender} class="render button">Render</button>
    </div>
  {/if}
</main>

<style>
  :root {
    font-family: "Source Code Pro", "Courier New", monospace;
    font-size: 12px;
  }
  :global(body) {
    margin: 20px;
  }

  .info h1 {
    font-weight: 700;
    padding: 0;
    margin-top: 0;
    margin-bottom: 10px;
  }
  .info p {
    margin-top: 0;
    margin-bottom: 10px;
    line-height: 1.5;
  }
  .info {
    margin-bottom: 30px;
    max-width: 720px;
  }

  .row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .mp4-support {
    font-size: 10px;
    color: red;
    max-width: 450px;
    display: block;
  }
  input,
  button,
  select {
    font: inherit;
  }

  input[type="text"],
  input[type="number"],
  select {
    padding: 5px;
  }

  .button {
    font: inherit;
    padding: 5px;
    cursor: pointer;
    margin: 0;
    /* background: hsl(0, 0%, 90%); */
    /* border-radius: 5px; */
    /* border: 1px solid hsl(0, 0%, 70%); */
  }
  .render.button {
    margin-top: 20px;
  }
  .unit,
  .x-separator {
    font-size: 10px;
    margin-left: 5px;
    color: hsl(0, 0%, 50%);
  }
  .x-separator {
    margin-right: 5px;
  }

  a,
  a:active,
  a:visited {
    font-weight: 700;
    color: blue;
  }

  .fps-container button {
    appearance: none;
    border: none;
    padding: 5px;
    background: hsl(0, 0%, 90%);
    border-radius: 5px;
    font-size: 10px;
    height: 24px;
    width: 24px;
    cursor: pointer;
    margin-left: 5px;
  }
  .fps-container button:hover {
    background: hsl(0, 0%, 80%);
  }

  .token-id {
    width: 100px;
  }
  .fps,
  .duration,
  .dimensions {
    width: 60px;
  }

  .field {
    margin-top: 10px;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
  }

  .field caption {
    display: inline-block;
    text-align: left;
    margin: 0;
    /* margin-right: 20px; */
    padding: 0;
    width: 90px;
  }

  .field:first-child {
    margin-top: 0;
  }
</style>
