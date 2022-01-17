const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const { getContents } = require("../../util/generic");

describe("getContents", () => {
  it("loads all important files from a directory, and returns a deployment object", async () => {
    // Tests run from repo root, so have to specify the path
    const dirName = path.join("test", "fixtures", "test-dir");
    const directory = await getContents(dirName, ["something.json"]);
    const somethingJsonPath = path.join(dirName, "something.json");
    const somethingJsonContents = fs
      .readFileSync(somethingJsonPath, "utf8")
      .split("\n");

    expect(directory).to.deep.equal({
      directory: dirName,
      somethingJsonPath,
      somethingJsonContents,
    });
  });
});
