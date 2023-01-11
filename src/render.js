import templates from "./templates";
import getPrelude from "./prelude";

const acceptedTemplates = ["p5js", "js", "threejs", "regl", "paper"];

export default (data, opts = {}) => {
  let type = "js";
  let version;
  if (data.project.scriptType) {
    type = data.project.scriptType;
  }

  type = (type || "").toLowerCase();
  if (!type || type === "vanilla" || type === "n/a") type = "js";
  if (type === "p5") type = "p5js";
  if (type === "three") type = "threejs";

  if (!acceptedTemplates.includes(type)) {
    return alert(`Error: Project type "${type}" not yet supported.`);
  }

  if (data.project.scriptVersion) {
    if (!/n[\\/]?a/i.test(data.project.scriptVersion)) {
      version = data.project.scriptVersion;
    }
  }

  const projectNum = parseInt(data.project.id, 10);
  const tokenId = String(data.token.id);
  const tokenData =
    projectNum <= 2
      ? {
          hashes: [data.token.hash],
          tokenId,
        }
      : {
          hash: data.token.hash,
          tokenId,
        };

  const base = templates[type] || templates.js;
  version = resolveVersion(type, version);

  let vendorUrl;
  if (type === "regl") {
    vendorUrl = "https://cdnjs.cloudflare.com/ajax/libs/regl/2.1.0/regl.min.js";
  } else if (type === "p5js") {
    vendorUrl = `https://cdnjs.cloudflare.com/ajax/libs/p5.js/${version}/p5.min.js`;
  } else if (type === "paper") {
    vendorUrl = `https://cdnjs.cloudflare.com/ajax/libs/paper.js/${type}/paper-full.min.js`;
  }
  let vendor;
  if (vendorUrl) vendor = `<script src="${vendorUrl}"></script>`;

  const prelude = getPrelude(opts);
  const doc = maxstache(base, {
    version,
    prelude,
    vendor,
    tokenData: `<script>let tokenData = ${JSON.stringify(tokenData)};</script>`,
    script: `<script>${data.project.script}</script>`,
  });
  return doc;
};

function resolveVersion(type, version) {
  if (type === "p5js") return version || "1.0.0";
  return version;
}

// Minimalist mustache template replacement
// (str, obj) -> null
function maxstache(str, ctx) {
  ctx = ctx || {};
  const tokens = str.split(/\{\{|\}\}/);
  const res = tokens.map(parse(ctx));
  return res.join("");
}

// parse a token
// obj -> (str, num) -> str
function parse(ctx) {
  return function parse(token, i) {
    if (i % 2 === 0) return token;
    return ctx[token];
  };
}
