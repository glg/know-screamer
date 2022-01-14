const { expect } = require("chai");
const {
  suggestBugReport,
  getNewIssueLink,
  codeBlock,
  getOwnerRepoBranch,
  getNewFileLink,
  lineLink,
} = require("../../util");

describe("suggestBugReport", () => {
  it("creates an issue comment that contains a link to open an issue on this repo", async () => {
    let commentPayload;
    const moctokit = {
      issues: {
        createComment: (input) => {
          commentPayload = input;
        },
      },
    };
    const error = new Error("Test");
    await suggestBugReport(moctokit, error, "Test Error", {
      owner: "org",
      repo: "repo",
      pull_number: 42,
    });

    const errorText = codeBlock(`${error.message}\n\n${error.stack}`);
    const issueLink = getNewIssueLink({
      linkText: "Create an issue",
      owner: "glg-public",
      repo: "gds-cc-screamer",
      title: "Test Error",
      body: errorText,
    });
    const expectedBody = `## An error was encountered. Please submit a bug report\n${errorText}\n\n${issueLink}\n`;

    expect(commentPayload).to.deep.equal({
      owner: "org",
      repo: "repo",
      issue_number: 42,
      body: expectedBody,
    });
  });
});

describe("getNewIssueLink", () => {
  it("generates a markdown link for a new github issue", () => {
    const issueLink = getNewIssueLink({
      linkText: "Create an issue",
      owner: "glg-public",
      repo: "screamer.tml",
      title: "Test Error",
      body: "This text will be in the body of the issue",
    });

    expect(issueLink).to.equal(
      "[Create an issue](https://github.com/glg-public/screamer.tml/issues/new?title=Test%20Error&body=This%20text%20will%20be%20in%20the%20body%20of%20the%20issue)"
    );
  });
});

describe("getOwnerRepoBranch", () => {
  const pr = require("../fixtures/pull-request.json");
  it("extracts the owner, repo, and branch from the pull request context", () => {
    const context = { payload: { pull_request: pr } };
    let { owner, repo, branch } = getOwnerRepoBranch(context);
    expect(owner).to.equal("octocat");
    expect(repo).to.equal("Hello-World");
    expect(branch).to.equal("new-topic");
  });
});

describe("getNewFileLink", () => {
  it("Creates a url that proposes a new file in github", () => {
    const link = getNewFileLink({
      owner: "glg-public",
      repo: "screamer.tml",
      branch: "main",
      filename: "test/fixtures/new-fixture.json",
      value: JSON.stringify(
        {
          key: "value",
        },
        null,
        2
      ),
    });

    expect(link).to.equal(
      "https://github.com/glg-public/screamer.tml/new/main?filename=test%2Ffixtures%2Fnew-fixture.json&value=%7B%0A%20%20%22key%22%3A%20%22value%22%0A%7D"
    );
  });
});

describe("lineLink", () => {
  it("creates a url that links to a file in github", () => {
    const link = lineLink({
      owner: "glg-public",
      repo: "screamer.tml",
      sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
      path: "test/fixtures/pull-request.json",
      line: 0,
    });

    expect(link).to.equal(
      "https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json"
    );
  });

  it("creates a url that links to a line in a file in github", () => {
    const link = lineLink({
      owner: "glg-public",
      repo: "screamer.tml",
      sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
      path: "test/fixtures/pull-request.json",
      line: 5,
    });

    expect(link).to.equal(
      "https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json#L5"
    );
  });

  it("creates a url that links to a range of lines in a file in github", () => {
    const link = lineLink({
      owner: "glg-public",
      repo: "screamer.tml",
      sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
      path: "test/fixtures/pull-request.json",
      line: { start: 5, end: 9 },
    });

    expect(link).to.equal(
      "https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json#L5-L9"
    );
  });
});
