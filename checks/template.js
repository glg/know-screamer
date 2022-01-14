require("../typedefs");
const log = require("loglevel");

/**
 * Accepts a directory object, and does some kind of check
 * @param {Directory} directory An object containing information about files in a directory
 * @param {GitHubContext} context The context object provided by github
 * @param {ActionInputs} inputs The inputs (excluding the token) from the github action
 * @param {function(string, (object | undefined)):Promise} httpGet An async function to do HTTP GET
 *
 * @returns {Array<Result>}
 */
async function templateCheck(directory, context, inputs, httpGet) {
  /**
   * You should check the existance of any file you're trying to check.
   *
   * A file named "something.json" would have these keys in `directory`:
   * - somethingJsonPath: The file path for something.json
   * - somethingJsonContents: A string[] of the lines of the file
   */
  if (!directory.somethingJsonContents) {
    log.info(`No something.json Present - Skipping ${directory.directory}`);
    return [];
  }
  log.info(`Template Check - ${directory.somethingJsonPath}`);

  /** @type {Array<Result>} */
  const results = [];

  directory.somethingJsonContents.forEach((line, i) => {
    // GitHub lines are 1-indexed
    const lineNumber = i + 1;
    // do something
  });

  return results;
}

module.exports = templateCheck;
