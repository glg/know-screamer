require("../typedefs");
const log = require("loglevel");
const { getLinesForJSON, suggest, getLineWithinObject } = require("../util");

/**
 * Checks the validity of a wikis.json
 * @param {Directory} directory An object containing information about files in a directory
 *
 * @returns {Array<Result>}
 */
async function wikisJsonIsValid(directory) {
  /** @type {Array<Result>} */
  const results = [];

  // wikis.json is not required
  if (!directory.wikisJsonContents) {
    log.info(`No wikis.json present, skipping - ${directory.serviceName}`);
    return results;
  }
  console.log(directory.wikisJsonContents)
  log.info(`wikis.json is valid - ${directory.wikisJsonPath}`);

  // wikis.json must be valid json
  let wikisJson;
  try {
    wikisJson = JSON.parse(directory.wikisJsonContents.join("\n"));
  } catch (e) {
    return [
      {
        title: "wikis.json is not valid JSON",
        path: directory.wikisJsonPath,
        problems: [
          `An error was encountered while trying to JSON parse ${directory.wikisJsonPath}`,
        ],
        line: 0,
        level: "failure",
      },
    ];
  }
  console.log(wikisJson)

  // Mark this as valid, so future checks don't have to redo this work
  if (results.length === 0) {
    directory.wikisJson = wikisJson;
  }
  return results;
}

module.exports = wikisJsonIsValid;