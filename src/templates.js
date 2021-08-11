import srcThree from "./vendor/three.r124.js?raw";
import srcRegl from "./vendor/regl.2.1.0.js?raw";

export default {
  js: `<html>
  <head>
    {{prelude}}
    {{tokenData}}
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
      }
      canvas {
        padding: 0;
        margin: auto;
        display: block;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }
    </style>
  </head>
  <body>
    <canvas></canvas>
    {{script}}
  </body>
</html>`,
  p5js: `<html>
  <head>
    <meta charset="utf-8" />
    {{prelude}}
    {{tokenData}}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/{{version}}/p5.min.js"></script>
    {{script}}
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
      }
      canvas {
        padding: 0;
        margin: auto;
        display: block;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }
    </style>
  </head>
</html>`,
  threejs: `<html>
  <head>
    {{prelude}}
    <script>
    ${srcThree}
    </script>
    {{tokenData}}
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
      }
      canvas {
        padding: 0;
        margin: auto;
        display: block;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }
    </style>
  </head>
  <body>
    {{script}}
  </body>
</html>`,
  regl: `<html><head>{{prelude}}
  <script>${srcRegl}</script>
  {{tokenData}}<style type="text/css">body {
    margin: 0;
    padding: 0;
  }
  canvas {
    padding: 0;
    margin: auto;
    display: block;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }</style></head><body>{{script}}</body></html>`,
};
