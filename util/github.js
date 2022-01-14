require("../typedefs");
const path = require("path");
const { getContents } = require("./generic");
const { codeBlock } = require("./text");
const core = require("@actions/core");

/**
 * Takes an array of GitHub Files (as returned by GitHub API),
 * and returns an array of Directory Objects, ready to have checks run on them.
 * @param {Array<GitHubFile>} files
 * @param {Array<string>} filesToCheck
 *
 * @returns {Array<Directory>}
 */
async function getAllRelevantFiles(files, filesToCheck) {
  return Promise.all(
    Array.from(
      new Set(
        files
          .filter((f) => filesToCheck.includes(f.filename.toLowerCase()))
          .filter((f) => f.status !== "removed")
          .map((f) => path.dirname(f.filename))
      )
    ).map((directory) => getContents(directory, filesToCheck))
  );
}

/**
 * Leaves the correct type of comment for a given result
 * @param {Octokit} octokit A configured octokit client
 * @param {Result} result
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number,
 * sha: string
 * }} options
 */
async function leaveComment(
  octokit,
  result,
  { owner, repo, pull_number, sha }
) {
  // Emojis are fun
  const icons = {
    failure: "💀",
    warning: "⚠️",
    notice: "👉",
  };

  let resultPath = result.path;

  // Build a markdown comment to post
  let comment = `## ${icons[result.level]} ${result.title}\n`;
  for (const problem of result.problems) {
    comment += `- ${problem}\n`;
    core.error(`${result.title} - ${problem}`);
  }

  comment += `\n\n${getNewIssueLink({
    linkText: "Look wrong? File a bug report",
    owner: "glg-public",
    repo: "screamer.tml",
    title: "Unexpected Behavior",
    body: `# Context\n- [Pull Request](${prLink({
      owner,
      repo,
      pull_number,
    })})\n- [Flagged Lines](${lineLink({
      owner,
      repo,
      sha,
      path: resultPath,
      line: result.line,
    })})\n\n# Result Contents\n\n${comment}`,
  })}`;
  try {
    // Line 0 means a general comment, not a line-specific comment
    if (result.line === 0) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: comment,
      });
    }

    // If result.line is a range object like { start, end }, make a multi-line comment
    else if (
      isNaN(result.line) &&
      result.line.hasOwnProperty("start") &&
      result.line.hasOwnProperty("end")
    ) {
      await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        path: resultPath,
        body: comment,
        side: "RIGHT",
        start_line: result.line.start,
        line: result.line.end,
      });
    }

    // If line number is anything but 0, or a range object, we make a line-specific comment
    else {
      await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        path: resultPath,
        body: comment,
        side: "RIGHT",
        line: result.line,
      });
    }
  } catch (e) {
    // If the error is due to the problem existing outside the diff,
    // we still want to alert the user, so make a generic issue comment
    if (
      e.errors.filter(
        (err) =>
          err.resource === "PullRequestReviewComment" &&
          ["path", "line"].includes(err.field)
      ).length > 0
    ) {
      result.problems.unshift(
        `Problem existed outside of diff at \`${result.path}\`, line **${result.line}**`
      );
      result.line = 0;
      await leaveComment(octokit, result, {
        owner,
        repo,
        pull_number,
        sha,
      });
    } else {
      console.log(e);
      console.log(result);
      await suggestBugReport(octokit, e, "Error while posting comment", {
        owner,
        repo,
        pull_number,
      });
    }
  }
}

/**
 * Generates a markdown link that creates a new issue on a specified github repository
 * @param {Object} options
 * @param {string} options.linkText The visible text in the link
 * @param {string} options.owner The owner of the repo to create an issue on
 * @param {string} options.repo The repository to create an issue on
 * @param {string} options.title The title of the new issue
 * @param {string} options.body The body of the new issue
 * @returns
 */
function getNewIssueLink({ linkText, owner, repo, title, body }) {
  return `[${linkText}](https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(body)})`;
}

/**
 * Submits an issue comment on the PR which contains
 * a link to a pre-populated bug report on this
 * repository.
 * @param {Octokit} octokit
 * @param {Error} error
 * @param {string} title
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number,
 * }} options
 */
async function suggestBugReport(
  octokit,
  error,
  title,
  { owner, repo, pull_number: issue_number }
) {
  const errorText = codeBlock(`${error.message}\n\n${error.stack}`);
  const issueLink = getNewIssueLink({
    linkText: "Create an issue",
    owner: "glg-public",
    repo: "gds-cc-screamer",
    title,
    body: errorText,
  });

  const body = `## An error was encountered. Please submit a bug report\n${errorText}\n\n${issueLink}\n`;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number,
    body,
  });
}

/**
 * Creates a url for a pull request.
 * @param {Object} options
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {number} options.pull_number
 * @returns
 */
function prLink({ owner, repo, pull_number }) {
  return `https://github.com/${owner}/${repo}/pull/${pull_number}`;
}

/**
 * Returns a link to a specific line, or range of lines in a blob
 * @param {Object} options
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {string} options.sha
 * @param {string} options.path
 * @param {number|object} options.line
 * @returns {string}
 */
function lineLink({ owner, repo, sha, path: filePath, line }) {
  let link = `https://github.com/${owner}/${repo}/blob/${sha}/${filePath}`;

  if (typeof line === "undefined") {
    return link;
  }
  if (
    isNaN(line) &&
    line.hasOwnProperty("start") &&
    line.hasOwnProperty("end")
  ) {
    link += `#L${line.start}-L${line.end}`;
  } else if (line > 0) {
    link += `#L${line}`;
  }

  return link;
}

/**
 * Creates a url that proposes a new file in github
 * @param {{
 * owner: string,
 * repo: string,
 * branch: string,
 * filename: string,
 * value: string
 * }} params
 *
 * @returns {URI}
 */
function getNewFileLink({ owner, repo, branch, filename, value }) {
  return `https://github.com/${owner}/${repo}/new/${branch}?filename=${encodeURIComponent(
    filename
  )}&value=${encodeURIComponent(value)}`;
}

/**
 * Get the owner, repo, and head branch for this PR
 * @param {GitHubContext} context The Github Pull Request Context Object
 */
function getOwnerRepoBranch(context) {
  const pr = context.payload.pull_request;
  const owner = pr.head.repo.owner.login;
  const repo = pr.base.repo.name;
  const branch = pr.head.ref;

  return { owner, repo, branch };
}

/**
 * Clear any comments from this bot that are already on the PR.
 * This prevents excessive comment polution
 * @param {Octokit} octokit
 * @param {{
 * owner: string,
 * repo: string,
 * pull_number: number
 * }} options
 */
async function clearPreviousRunComments(octokit, { owner, repo, pull_number }) {
  try {
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    const { data: issueComments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
    });

    const allDeletions = [];

    reviewComments
      .filter(
        (c) => c.user.login === "github-actions[bot]" && c.user.type === "Bot"
      )
      .forEach((comment) => {
        allDeletions.push(
          octokit.pulls.deleteReviewComment({
            owner,
            repo,
            comment_id: comment.id,
          })
        );
      });

    issueComments
      .filter(
        (c) => c.user.login === "github-actions[bot]" && c.user.type === "Bot"
      )
      .forEach((comment) => {
        allDeletions.push(
          octokit.issues.deleteComment({
            owner,
            repo,
            comment_id: comment.id,
          })
        );
      });

    await Promise.all(allDeletions);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  leaveComment,
  suggestBugReport,
  lineLink,
  prLink,
  getNewIssueLink,
  getNewFileLink,
  getOwnerRepoBranch,
  clearPreviousRunComments,
  getAllRelevantFiles,
};
