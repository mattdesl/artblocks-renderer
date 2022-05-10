// Thanks to @r4v3n and artblocks-gallery
// https://github.com/r4v3n-art/art-blocks-gallery

const PROJECT_EXPLORER =
  "https://api.thegraph.com/subgraphs/name/artblocks/art-blocks";

const contracts = [
  "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a",
  "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
];

const contract_in = JSON.stringify(contracts);

// Utility to query from subgraph
async function query(url, query) {
  const response = await fetch(url, {
    method: "post",
    // mode: "cors", // no-cors, *cors, same-origin
    // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    // credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
}

// Gets all AB tokens held by owner address
async function fetchTokensByOwner(ownerAddress, opt = {}) {
  const { limit = 100 } = opt;
  const lastId = opt.lastId || opt.lastId === 0 ? opt.lastId : "-1";
  ownerAddress = ownerAddress.toLowerCase();
  const { tokens } = await query(
    PROJECT_EXPLORER,
    `{
  tokens(first: ${limit}, orderBy: tokenId, orderDirection: asc, where: {id_gt: "${lastId}", owner: "${ownerAddress}", contract_in: ${contract_in} }) {
    tokenId
    project {
      tokenId
    }
  }
}`
  );
  return tokens;
}

async function fetchTokensByProject(projectId, opt = {}) {
  const { limit = 100 } = opt;
  const lastId = opt.lastId || opt.lastId === 0 ? opt.lastId : "-1";
  const { tokens } = await query(
    PROJECT_EXPLORER,
    `{
  tokens(first: ${limit}, orderBy: tokenId, orderDirection: asc, where: {id_gt: "${lastId}", project: "${projectId}", contract_in: ${contract_in} }) {
    tokenId
    project {
      tokenId
      name
    }
  }
}`
  );
  return tokens;
}

// Gets AB contracts currently in use and the nextProjectId
async function fetchPlatform() {
  const { contracts } = await query(
    PROJECT_EXPLORER,
    `{
  contracts {
    id
    nextProjectId
  }
}`
  );
  const nextProjectId = contracts.reduce(
    (max, c) => Math.max(max, parseInt(c.nextProjectId, 10)),
    0
  );
  return {
    nextProjectId: String(nextProjectId),
    addresses: contracts.map((c) => c.id),
  };
}

// Gets details about a specific project ID
async function fetchProject(id) {
  const { projects } = await query(
    PROJECT_EXPLORER,
    `{
  projects(where: { projectId: "${id}", contract_in: ${contract_in} }) {
    projectId
    name
    scriptJSON
    website
    artistName
    description
    license
    invocations
    maxInvocations
    paused
    currencySymbol
    pricePerTokenInWei
    script
  }
}
`
  );
  if (!projects || projects.length === 0) return null;
  const result = projects[0];
  result.id = result.projectId;
  if (result) {
    result.scriptJSON = JSON.parse(result.scriptJSON);
    if ("aspectRatio" in result.scriptJSON) {
      result.scriptJSON.aspectRatio = parseFloat(result.scriptJSON.aspectRatio);
    }
    result.maxInvocations = parseInt(result.maxInvocations, 10);
    result.pricePerTokenInWei = parseInt(result.pricePerTokenInWei, 10);
    result.invocations = parseInt(result.invocations, 10);
  }
  return result;
}

async function fetchToken(id) {
  const { tokens } = await query(
    PROJECT_EXPLORER,
    `{
  tokens(where: { tokenId: "${id}", contract_in: ${contract_in} }) {
    tokenId
    hash
  }
}
`
  );
  if (!tokens || tokens.length === 0) return null;
  if (tokens.length > 1)
    throw new Error("Received multiple tokens for id: " + id);
  const t = tokens[0];
  return {
    id: t.tokenId,
    // owner: t.owner.id,
    hash: t.hash,
  };
}

export {
  fetchProject,
  fetchPlatform,
  fetchTokensByProject,
  fetchTokensByOwner,
  fetchToken,
  query,
};
