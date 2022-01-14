require("./typedefs");
const core = require("@actions/core");
const github = require("@actions/github");
const checks = require("./checks").all;
const log = require("loglevel");
const {
  clearPreviousRunComments,
  getAllRelevantFiles,
  suggestBugReport,
  leaveComment,
  httpGet,
} = require("./util");
log.setLevel(process.env.LOG_LEVEL || "info");

async function run() {
  const token = core.getInput("token", { required: true });

  /** @type {ActionInputs} */
  const inputs = {
    // Fill this with the other inputs for your action
  };

  const octokit = github.getOctokit(token);

  /** @type {PullRequest} */
  const pr = github.context.payload.pull_request;
  const owner = pr.base.repo.owner.login;
  const repo = pr.base.repo.name;
  const pull_number = pr.number;
  const sha = pr.head.sha;

  try {
    await clearPreviousRunComments(octokit, { owner, repo, pull_number });

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    // This should be a list of files you want to scream at
    const filesToCheck = [];

    const dirsTocheck = await getAllRelevantFiles(files, filesToCheck);

    // We want to track how all the checks go
    const counts = {
      success: 0,
      failure: 0,
      warning: 0,
      notice: 0,
    };

    for (const dir of dirsTocheck) {
      for (const check of checks) {
        let results = [];
        try {
          results = await check(dir, github.context, inputs, httpGet);
        } catch (e) {
          await suggestBugReport(octokit, e, "Error running check", {
            owner,
            repo,
            pull_number,
          });

          log.info(e);
          continue;
        }
        if (results.length === 0) {
          log.info("...Passed");
          counts.success += 1;
          continue;
        }
        for (const result of results) {
          if (result.problems.length > 0) {
            counts[result.level] += 1;
            await leaveComment(octokit, result, {
              owner,
              repo,
              pull_number,
              sha,
            });
          } else {
            counts.success += 1;
            log.info("...Passed");
          }
        }
      }
    }

    if (counts.failure > 0) {
      core.setFailed("One or more checks has failed. See comments in PR.");
    }
  } catch (error) {
    await suggestBugReport(octokit, error, "Error Running Check Suite", {
      owner,
      repo,
      pull_number,
    });
    core.setFailed(error.message);
  }
}

run();
