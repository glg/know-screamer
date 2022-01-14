const { expect } = require("chai");
const wikisJsonIsValid = require("../checks/wikis-json-valid");

describe("wiki.json is valid check", () => {
  it("skips when there is no wikis.json", async () => {
    const directory = {
      serviceName: "knowledgebase",
      ordersContents: [],
    };

    const results = await wikisJsonIsValid(directory);
    expect(results.length).to.equal(0);
  });

  it("accepts valid wikis.json files", async () => {
    const wikisJson = `[
      {
        "name": "Test",
        "url": "git@github.com:glg/test.wiki.git"
      },
      {
        "name": "Test2",
        "url": "git@github.com:glg/test2.git"
      }
    ]`;

    const directory = {
      serviceName: "knowledgebase",
      ordersContents: [],
      wikisJsonPath: "scripts/wikis.json",
      wikisJsonContents: wikisJson.split("\n"),
    };

    const results = await wikisJsonIsValid(directory);
    expect(results.length).to.equal(0);

    // When the wikis.json is valid, it gets attached to the orders object
    // so that future checks can rely on it without redoing work.
    expect(directory.wikisJson).to.deep.equal(JSON.parse(wikisJson));
  });

  it("rejects wikis.json that is not valid JSON", async () => {
    const wikisJson = "invalid json";

    const directory = {
      serviceName: "knowledgebase",
      ordersContents: [],
      wikisJsonPath: "knowledgebase/wikis.json",
      wikisJsonContents: wikisJson.split("\n"),
    };

    const results = await wikisJsonIsValid(directory);
    expect(results.length).to.equal(1);
    expect(results[0]).to.deep.equal({
      title: "wikis.json is not valid JSON",
      path: directory.wikisJsonPath,
      problems: [
        `An error was encountered while trying to JSON parse ${directory.wikisJsonPath}`,
      ],
      line: 0,
      level: "failure",
    });
  });

});
