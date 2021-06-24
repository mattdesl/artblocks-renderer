// Thanks to @r4v3n and artblocks-gallery
// https://github.com/r4v3n-art/art-blocks-gallery

// This subgraph seems to work best for owner-to-tokens query
const TOKEN_EXPLORER =
  "https://api.thegraph.com/subgraphs/name/xenoliss/art-blocks-explorer";

// This subgraph seems to have better support for projects & AB contracts
const PROJECT_EXPLORER =
  "https://api.thegraph.com/subgraphs/name/artblocks/art-blocks";

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

// Gets all AB tokens held by owner address
async function fetchTokensByOwner(ownerAddress, opt = {}) {
  const { limit = 100 } = opt;
  const lastId = opt.lastId || opt.lastId === 0 ? opt.lastId : "-1";
  ownerAddress = ownerAddress.toLowerCase();
  const { tokens } = await query(
    PROJECT_EXPLORER,
    `{
  tokens(first: ${limit}, orderBy: id, orderDirection: asc, where: {id_gt: "${lastId}", owner: "${ownerAddress}"}) {
    id
    project {
      id
    }
  }
}`
  );
  return tokens;
}

// Gets all AB tokens held by owner address
async function fetchTokensByProject(projectId, opt = {}) {
  const { limit = 100 } = opt;
  const lastId = opt.lastId || opt.lastId === 0 ? opt.lastId : "-1";
  const { tokens } = await query(
    TOKEN_EXPLORER,
    `{
  tokens(first: ${limit}, orderBy: id, orderDirection: asc, where: {id_gt: "${lastId}", project: "${projectId}"}) {
    id
    project {
      id
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
  projects(where: { id: "${id}" }) {
    id
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
  tokens(where: { id: "${id}" }) {
    id
    owner {
      id
    }
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
    id: t.id,
    owner: t.owner.id,
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
