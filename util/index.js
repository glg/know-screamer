const {
  codeBlock,
  suggest,
  getLinesForJSON,
  getLineNumber,
  getLineWithinObject,
  escapeRegExp,
  detectIndentation,
  camelCaseFileName,
} = require("./text");

const {
  getAllRelevantFiles,
  leaveComment,
  suggestBugReport,
  lineLink,
  prLink,
  getNewIssueLink,
  getNewFileLink,
  getOwnerRepoBranch,
  clearPreviousRunComments,
} = require("./github");

const { getContents, httpGet } = require("./generic");

module.exports = {
  codeBlock,
  suggest,
  getLinesForJSON,
  getLineNumber,
  getLineWithinObject,
  escapeRegExp,
  detectIndentation,
  camelCaseFileName,
  getAllRelevantFiles,
  leaveComment,
  suggestBugReport,
  lineLink,
  prLink,
  getNewIssueLink,
  getNewFileLink,
  getOwnerRepoBranch,
  clearPreviousRunComments,
  getContents,
  httpGet,
};
