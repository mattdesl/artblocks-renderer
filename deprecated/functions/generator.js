const { fetchProject, fetchToken } = require("../../src/query.js/index.js");
const renderIframe = require("./render-iframe.js");

async function fetchData(id) {
  id = String(id);

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    throw new Error("id query parameter is not a number");
  }

  const C = 1000000;
  const projNumber = Math.floor(idNum / C);
  const tokenNumber = idNum < C ? idNum : Math.floor(idNum % C);
  const project = await fetchProject(projNumber);
  const token = await fetchToken(id);
  return {
    id,
    project,
    token,
  };
}

exports.handler = async (event, context) => {
  const qs = event.queryStringParameters;
  const id = qs.id;
  if (!id) {
    return error("Must specify id query parameter");
  }

  try {
    const data = await fetchData(id);
    const body = await renderIframe(data, {});

    return {
      statusCode: 200,
      body,
    };
  } catch (err) {
    return error(err);
  }
};

function error(err, code = 400) {
  return {
    statusCode: 400,
    body: err && err.message ? err.message : err,
  };
}
