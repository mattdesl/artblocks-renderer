const fetch = require("node-fetch");
const fs = require("fs/promises");
const path = require("path");
const {fetchProject} = require('./query')

// This subgraph seems to have better support for projects & AB contracts
const PROJECT_EXPLORER =
  "https://api.thegraph.com/subgraphs/name/artblocks/art-blocks";

//
const start = async () => {
  const total = 94;
  const list = Array(total)
    .fill()
    .map((_, i) => i);
  // const list = [13, 18, 29, 30, 59, 74, 82, 85, 89];

  const set = new Set();
  let styleIndex = 0;

  for (let item of list) {
    const id = item === 0 ? "0" : String(item * 1000000);
    const url = `https://api.artblocks.io/generator/${id}`;
    console.log(String(item).padStart(3, "0"));
    const resp = await fetch(url);
    let html = await resp.text();

    const prj = await fetchProject(item);

    if (!html.includes(prj.script)) {
      console.log(item, "does not include script");
    }
    html = html.replace(prj.script, "{{script}}");
    html = html.replace(
      /<script>let tokenData[\s\S]*?<\/script>/gi,
      "<script>{{tokenData}}</script>"
    );
    // html = html.replace(
    //   /<script>let tokenData[\s\S]*?<\/script>/gi,
    //   "<script>{{tokenData}}</script>"
    // );

    if (html.includes("let tokenData")) {
      console.log(item, "includes tokenData");
    }
    if (!html.includes("{{tokenData}}")) {
      console.log(item, "missing {{tokenData}}");
    }
    if (!html.includes("{{script}}")) {
      console.log(item, "missing {{script}}");
    }

    const dir = path.join(process.cwd(), "tmp");

    if (!set.has(html)) {
      console.log(item, "has new script style", prj.scriptJSON);
      set.add(html);
      const fields = [
        "style",
        styleIndex,
        prj.scriptJSON.type || "no-type",
        prj.scriptJSON.version || "no-version",
        prj.scriptJSON.interactive ? "interactive" : "no-interactive",
      ];
      const name = fields.join("-").replace(/[\\\/]/g, "_");
      await fs.writeFile(path.join(dir, `${name}.html`), html);
      styleIndex++;
    }

    await fs.writeFile(path.join(dir, `${item}.html`), html);
    await fs.writeFile(path.join(dir, `${item}.json`), JSON.stringify(prj));
  }
};

start();

// Utility to query from subgraph
async function query(url, query) {
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
}
