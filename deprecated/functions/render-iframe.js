const fs = require("fs/promises");
const path = require("path");
const escape = require("escape-html");
const esbuild = require("esbuild");

const maxstache = require("maxstache");
const prelude = /*js*/ `
  /* prelude */
  ;(function () {
    let started = false;
    let frame = 0;
    let stopping = false;
    const fps = 30;
    let totalFrames = 3;


    // Mode A (default, p5js)
    // submit rendering to encoder
    // requestAnimationFrame is triggered
    // we capture the frame here
    // increment frame index
    // and continue onward

    // Mode B - skip first frame

    const capturer = new CCapture({
      format: 'png',
      framerate: fps,
    });

    const cooldown = () => {
      console.log('rAF Finished');
      // save();
    };

    // const triggerFrame = (time, fn) => {
    //   frame++;
    //   debugger;
    //   return fn(time);
    // };

    const origRAF = window.requestAnimationFrame;
    let cooldownTimer;

    // capturer.start();
    let triggerSave = false;

    const cooldownDelay = 1000;
    window.requestAnimationFrame = function raf (fn) {
      if (!started) {
        console.log('rAF Started');
        started = true;
      }
      clearTimeout(cooldownTimer);
      cooldownTimer = setTimeout(cooldown, cooldownDelay);
      // const canvas = findCanvas();
      // capturer.capture(canvas);
      
      if (!stopping && frame >= totalFrames) {
        // capturer.stop();
        // capturer.save();
        stopping = true;
      }
      if (!stopping) {
        console.log('capturing', frame);
        // save()
      }

      return origRAF.call(window, time => {
        if (triggerSave) {
          triggerSave = false;
          fn(time);
          save();
          // setTimeout(() => {
          //   console.log('save');
            
          //   flush(findCanvas());
            
          // }, 1000);
        } else {
          fn(time);
        }

        frame++;
      });
    }


    // setInterval(() => {
    //   timeweb.goTo(interval * 1000);
    // }, 250)


    const download = (url, filename) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename || "download";
      anchor.click();
    };

    window.addEventListener('keydown', ev => {
      if (ev.key === 's' && ev.metaKey) {
        ev.preventDefault();
        save();
      }
    })
    window.onclick = () => {
      triggerSave = true;
    }

    function findCanvas () {
      const canvas = [...document.querySelectorAll('canvas')]
      if (!canvas || !canvas.length) {
        return console.error('no canvas');
      }
      const target = canvas[canvas.length - 1];
      return target;
    }

    function save () {
      const canvas = findCanvas();
      flush(canvas);
      const png = canvas.toDataURL('image/png');
      download(png, 'download.png');
    }

    function flush (canvas) {
      if (!canvas.getContext('2d')) {
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (gl) {
          console.log('flush')
          gl.flush();
        }
      }
    }
  })();
`;

function getTemplate(type) {
  type = (type || "").toLowerCase();
  if (!type || type === "vanilla" || type === "n/a") type = "js";
  if (type === "p5") type = "p5js";
  return fs.readFile(
    path.resolve(__dirname, "templates/", `${type}.html`),
    "utf8"
  );
}

async function renderDocument(data, opts = {}) {
  let type = "js";
  if (data.project.scriptJSON && data.project.scriptJSON.type) {
    type = data.project.scriptJSON.type;
  }

  const num = parseInt(data.project.id, 10);
  const tokenId = String(data.token.id);
  const tokenData =
    num <= 2
      ? {
          hashes: [data.token.hash],
          tokenId,
        }
      : {
          hash: data.token.hash,
          tokenId,
        };

  const results = await esbuild.build({
    entryPoints: [path.resolve(__dirname, "prelude.js")],
    format: "iife",
    bundle: true,
    write: false,
  });
  const prelude = results.outputFiles[0].text;
  const template = await getTemplate(type);
  const html = maxstache(template, {
    tokenData: `
      <script>
        window.__MP4__READY = null;
        window.__MP4__ = new Promise(resolve => {
          window.__MP4__READY = resolve;
        });
      </script>
      <script type="module">
        import loadMP4Module, { isWebCodecsSupported } from "https://unpkg.com/mp4-wasm@1.0.3";
        window.__MP4__READY({
          isWebCodecsSupported,
          loadMP4Module
        });
        </script>
      <script>let tokenData = ${JSON.stringify(tokenData)};</script>
      <script>${prelude}</script>
    `,
    script: `<script>${data.project.script}</script>`,
  });
  return html;
}

module.exports = async function renderIframe(data, opts = {}) {
  const doc = await renderDocument(data, opts);
  // return doc;
  const src = escape(doc);
  return `<iframe style='border: none;' width="512px" height="512px" srcdoc="${src}" />`;
};
