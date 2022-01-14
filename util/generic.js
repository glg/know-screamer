require("../typedefs");
const { camelCaseFileName } = require("./text");
const fs = require("fs").promises;
const https = require("https");
const path = require("path");

/**
 * Read relevant files from the directory,
 * and split them by \n.
 * @param {String} directory the name of the directory
 * @param {String[]} filesToCheck a list of files you care about in the directory
 * @returns {Directory}
 */
async function getContents(directory, filesToCheck) {
  const result = { directory };
  for (let filename of filesToCheck) {
    const filepath = path.join(directory, filename);
    try {
      await fs.stat(filepath);
      const contents = await fs.readFile(filepath, "utf8");
      result[`${camelCaseFileName(filename)}Path`] = filepath;
      result[`${camelCaseFileName(filename)}Contents`] = contents.split("\n");
    } catch (e) {
      // No particular file is required in order to run the check suite
    }
  }
  return result;
}

/**
 * Performs an HTTPS GET operation and returns a JSON-parsed body
 * @param {string} url
 * @param {Object | undefined} options
 * @returns
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, options, (resp) => {
        let data = "";

        // A chunk of data has been received.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Parse it and resolve the promise
        resp.on("end", () => {
          try {
            const retValue = JSON.parse(data);
            if (resp.statusCode >= 400) {
              reject(retValue);
            } else {
              resolve(retValue);
            }
          } catch (e) {
            reject(data);
          }
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

module.exports = {
  getContents,
  httpGet,
};
