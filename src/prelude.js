export default function getPrelude(opts = {}) {
  const { width = 512, height = 512, fps = 30, totalFrames = 30 } = opts;
  const config = {
    width,
    height,
    fps,
    totalFrames,
  };
  return /*js*/ `
    <script>
    ;(function () {
      const settings = ${JSON.stringify(config)};
      const { fps, width, height, totalFrames } = settings;

      // Patch pixel ratio
      window.devicePixelRatio = 1;
      window.innerWidth = width;
      window.innerHeight = height;
      document.documentElement.clientWidth = width;
      document.documentElement.clientHeight = height;

      // Get the time patch library
      ${getTimeLib()}

      function send (data, transfer) {
        if (typeof data === 'string') {
          data = { event: data };
        }
        window.parent.postMessage(data, "*", transfer);
      }

      // Attach it to avoid any frames starting
      // console.log("Waiting...", settings);
      send('init');
      const time = window.__timelib__;
      time.attach();

      // Wait for ready events
      const onload = () => {
        window.removeEventListener("load", onload);
        // console.log("Starting...");
        start();
      };
      window.addEventListener("load", onload);

      async function waitForEvent (event) {
        return new Promise(resolve => {
          const msg = ev => {
            const d = ev.data;
            if (d.event === event) {
              window.removeEventListener('message', msg);
              resolve(d);
            }
          };
          window.addEventListener('message', msg, false);
        })
      }

      async function waitForFrame (frame) {
        return new Promise(resolve => {
          const msg = ev => {
            const d = ev.data;
            if (d.event === 'frame' && d.frame === frame) {
              window.removeEventListener('message', msg);
              resolve(d);
            }
          };
          window.addEventListener('message', msg, false);
        })
      }

      async function start () {
        const startEvent = waitForEvent('start');
        send('start');
        await startEvent;

        // Create an encoding stream
        const frameList = Array(totalFrames)
          .fill()
          .map((_, i) => i);
      
        const canvas = findCanvas();
        if (!canvas) return console.warn("no canvas");

        // const tmpCanvas = document.createElement('canvas');
        // const tmpContext = tmpCanvas.getContext('2d');
        // tmpCanvas.width = width;
        // tmpCanvas.height = height;

        for (let i of frameList) {
          const dt = (1 / fps) * 1000;
          time.step(dt);

          // tmpContext.clearRect(0, 0, width, height);
          // tmpContext.drawImage(canvas, 0, 0, width, height);
          // const pixels = tmpContext.getImageData(0, 0, width, height).data;
          const pixels = await createImageBitmap(canvas)
          const p = waitForFrame(i);
          send({ event: 'frame', pixels, frame: i }, [pixels]);
          await p;

          await time.sleep(0);
        }

        send('finish');

        function findCanvas() {
          const canvases = [...document.querySelectorAll("canvas")].filter(d => {
            return d.style.display !== 'none' && d.style.visibility !== 'hidden'
          });
          const canvas = canvases[canvases.length - 1];
          return canvas;
        }
      }
    })();
    </script>
  `;
}

function getTimeLib() {
  return /*js*/ `;window.__timelib__ = (function () {
  if (!("performance" in window)) {
    window.performance = {};
  }
  Date.now =
    Date.now ||
    function () {
      // thanks IE8
      return new Date().getTime();
    };
  if (!("now" in window.performance)) {
    var nowOffset = Date.now();
    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }
    window.performance.now = function now() {
      return Date.now() - nowOffset;
    };
  }

  let sessionStartTime = null;
  const startTimeOffset = 0;

  const _oldSetTimeout = window.setTimeout,
    _oldSetInterval = window.setInterval,
    _oldClearInterval = window.clearInterval,
    _oldClearTimeout = window.clearTimeout,
    _oldRequestAnimationFrame = window.requestAnimationFrame,
    _oldCancelAnimationFrame = window.cancelAnimationFrame,
    _oldNow = window.Date.now,
    _oldPerformanceNow = window.performance.now,
    _oldGetTime = window.Date.prototype.getTime;

  let startTime, time, performanceStartTime, performanceTime;

  let timeouts = [];
  let intervals = [];
  let requestAnimationFrameCallbacks = [];
  let elapsed = 0;
  let _attached = false;

  function attach() {
    if (_attached) return;
    timeouts.length = 0;
    elapsed = 0;
    _attached = true;
    if (sessionStartTime == null) {
      sessionStartTime = window.Date.now();
    }
    startTime = window.Date.now();
    time = startTime + startTimeOffset;
    performanceStartTime = window.performance.now();
    performanceTime = performanceStartTime + startTimeOffset;
    requestAnimationFrameCallbacks = [];
    timeouts = [];
    intervals = [];

    window.Date.prototype.getTime = function () {
      return time;
    };
    window.Date.now = function () {
      return time;
    };

    window.setTimeout = function (callback, delay) {
      var t = {
        callback: callback,
        triggerTime: time + delay,
      };
      timeouts.push(t);
      return t;
    };
    window.clearTimeout = function (id) {
      for (var j = 0; j < timeouts.length; j++) {
        if (timeouts[j] == id) {
          timeouts.splice(j, 1);
        }
      }
    };
    window.setInterval = function (callback, delay) {
      var t = {
        callback: callback,
        delay,
        triggerTime: time + delay,
      };
      intervals.push(t);
      return t;
    };
    window.clearInterval = function (id) {
      for (var j = 0; j < intervals.length; j++) {
        if (intervals[j] == id) {
          intervals.splice(j, 1);
        }
      }
    };
    window.requestAnimationFrame = function (callback) {
      const cb = { callback };
      requestAnimationFrameCallbacks.push(cb);
      return cb;
    };
    window.cancelAnimationFrame = function (id) {
      for (var j = 0; j < requestAnimationFrameCallbacks.length; j++) {
        if (requestAnimationFrameCallbacks[j] == id) {
          requestAnimationFrameCallbacks.splice(j, 1);
        }
      }
    };
    window.performance.now = function () {
      return performanceTime;
    };
  }

  function step(dt = 0) {
    time += dt;
    performanceTime += dt;
    elapsed += dt;

    for (let j = 0; j < timeouts.length; j++) {
      if (time >= timeouts[j].triggerTime) {
        timeouts[j].callback();
        timeouts.splice(j, 1);
      }
    }

    for (let j = 0; j < intervals.length; j++) {
      if (time >= intervals[j].triggerTime) {
        intervals[j].callback();
        intervals[j].triggerTime += intervals[j].delay;
      }
    }

    const rafs = [...requestAnimationFrameCallbacks];
    requestAnimationFrameCallbacks = [];
    rafs.forEach(({ callback }) => {
      callback(time - sessionStartTime);
    });
  }

  function sleep(delay = 0) {
    return new Promise((resolve) => _oldSetTimeout.call(window, resolve, delay));
  }

  function detach() {
    if (!_attached) return;
    timeouts.length = 0;
    _attached = false;
    window.setTimeout = _oldSetTimeout;
    window.setInterval = _oldSetInterval;
    window.clearInterval = _oldClearInterval;
    window.clearTimeout = _oldClearTimeout;
    window.requestAnimationFrame = _oldRequestAnimationFrame;
    window.cancelAnimationFrame = _oldCancelAnimationFrame;
    window.Date.prototype.getTime = _oldGetTime;
    window.Date.now = _oldNow;
    window.performance.now = _oldPerformanceNow;
  }

  function getElapsedTime() {
    return elapsed;
  }

  return { getElapsedTime, attach, detach, step, sleep };
})();`;
}
