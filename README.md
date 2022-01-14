# screamer.tml
A template PR screamer for github repos. This includes a basic check-runner framework with type definitions. It also includes some helpful utilities, and test coverage for those utilities.

- [screamer.tml](#screamertml)
  - [How To Use This Repo](#how-to-use-this-repo)
  - [Included Utilities](#included-utilities)
    - [camelCaseFileName](#camelcasefilename)
    - [clearPreviousRunComments](#clearpreviousruncomments)
    - [codeBlock](#codeblock)
    - [detectIndentation](#detectindentation)
    - [escapeRegExp](#escaperegexp)
    - [getAllRelevantFiles](#getallrelevantfiles)
    - [getContents](#getcontents)
    - [getLinesForJSON](#getlinesforjson)
    - [getLineNumber](#getlinenumber)
    - [getLineWithinObject](#getlinewithinobject)
    - [getNewIssueLink](#getnewissuelink)
    - [getNewFileLink](#getnewfilelink)
    - [getOwnerRepoBranch](#getownerrepobranch)
    - [httpGet](#httpget)
    - [leaveComment](#leavecomment)
    - [lineLink](#linelink)
    - [prLink](#prlink)
    - [suggest](#suggest)
    - [suggestBugReport](#suggestbugreport)

## How To Use This Repo

You will need to customize almost everything in this repo. It is not intended to be used "as is".

You can define your inputs in [action.yml](./action.yml), and then incorporate them into your screamer in [index.js:run](./index.js#L15-L21)

You can find a template check at [./checks/template.js](./checks/template.js).

Your checks get mounted in [./checks/index.js](./checks/index.js).

## Included Utilities

### camelCaseFileName

Takes a filename like secrets.json and returns secretsJson

```javascript
const { camelCaseFileName } = require('./util');

camelCaseFileName('secrets.json');
// secretsJson
```

### clearPreviousRunComments

Clear any comments from this bot that are already on the PR.
This prevents excessive comment polution

```javascript
const { clearPreviousRunComments } = require('./util');

await clearPreviousRunComments(octokit, { owner, repo, pull_number });
```

### codeBlock

Formats text as a markdown code block.

```javascript
const { codeBlock } = require('./util');

codeBlock(
  JSON.stringify({ key: "value"}, null, 2), 
  'json'
);
```

Outputs: 

    ```json
    {
      "key": "value"
    }
    ```



### detectIndentation

Determines whether a file uses tabs or spaces, and how many. If a file uses inconsistent indentation, it will return the most common form. This was written for JSON files, but should work with any consistently indented file.

```javascript
const { detectIndentation } = require('./util');

detectIndentation(fileLines);
// { amount: 2, type: 'spaces', indent: '  '}
```

### escapeRegExp

Escapes a string so that it can be matched literally as a regex.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping

```javascript
const { escapeRegExp } = require('./util');

escapeRegExp("test[1-9]+");
// test\[1\-9\]\+
```

### getAllRelevantFiles

Takes an array of GitHub Files (as returned by GitHub API), and returns an array of Directory Objects, ready to have checks run on them.

```javascript
const { getAllRelevantFiles } = require('./util');

const { data: files } = await octokit.pulls.listFiles({
  owner,
  repo,
  pull_number,
});

// This should be a list of files you want to scream at
const filesToCheck = [
  'security.json',
  'readme',
  'orders'
];

const dirsTocheck = await getAllRelevantFiles(files, filesToCheck);
```

### getContents

Read relevant files from the directory,
and split them by `\n`.

```javascript
const { getContents } = require('./util');

const directory = await getContents('streamliner', ['orders', 'secrets.json'])
```

Returns

```javascript
{
  directory: 'streamliner',
  ordersPath: 'streamliner/orders',
  ordersContents: [
    'export CAT="pants"',
    'dockerdeploy github/glg/someapp/main:latest'
  ],
  secretsJsonPath: 'streamliner/secrets.json',
  secretsJsonContents: [
    '[',
    '  {',
    '    "name": "something",',
    '    "valueFrom": "arn:something:secret"',
    '  }',
    ']'
  ]
}
```

### getLinesForJSON

Identifies the start and end line for a JSON object in a file

```javascript
const { getLinesForJSON } = require('./util');

let fileLines = [
"[",
"  {",
'    "name":"WRONG",',
'    "valueFrom": "differentarn"',
"  },",
"  {",
'    "name":"MY_SECRET",',
'    "valueFrom": "arn"',
"  }",
"]",
];

let jsonObj = { name: "MY_SECRET", valueFrom: "arn" };
let lines = getLinesForJSON(fileLines, jsonObj);
// { start: 6, end: 9 }
```

### getLineNumber

Returns the first line number that matches a given RegExp.
Returns null if no lines match

```javascript
const { getLineNumber } = require('./util');

const ordersContents = [
  "export SOMETHING=allowed",
  'export SOMETHING_ELSE="also allowed"',
];

const regex = /export SOMETHING_ELSE=/;
const line = getLineNumber(ordersContents, regex);
// 2
```

### getLineWithinObject

Looks for a line that matches a given RegExp, and is also within a specified object.

```javascript
const { getLineWithinObject } = require('./util');

const secretsJson = [
  {
    name: "JWT_SECRET",
    valueFrom: "some secret arn",
  },
];
const secretsJsonContents = JSON.stringify(secretsJson, null, 2).split("\n");
const regex = new RegExp(`"name":\\s*"${secretsJson[0].name}"`);
const lineNumber = getLineWithinObject(
  secretsJsonContents,
  secretsJson[0],
  regex
);
// 3
```

### getNewIssueLink

Generates a markdown link that creates a new issue on a specified github repository

```javascript
const { getNewIssueLink } = require('./util');

const issueLink = getNewIssueLink({
  linkText: "Create an issue",
  owner: "glg-public",
  repo: "screamer.tml",
  title: "Test Error",
  body: "This text will be in the body of the issue",
});

// [Create an issue](https://github.com/glg-public/screamer.tml/issues/new?title=Test%20Error&body=This%20text%20will%20be%20in%20the%20body%20of%20the%20issue)
```

### getNewFileLink

Creates a url that proposes a new file in github

```javascript
const { getNewFileLink } = require('./util');

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

// https://github.com/glg-public/screamer.tml/new/main?filename=test%2Ffixtures%2Fnew-fixture.json&value=%7B%0A%20%20%22key%22%3A%20%22value%22%0A%7D
```

### getOwnerRepoBranch

Get the owner, repo, and head branch for this PR

```javascript
const { getOwnerRepoBranch } = require('./util');
const pr = require("./test/fixtures/pull-request.json");

// This context object is something you get for free in the action
const context = { payload: { pull_request: pr } };
const { owner, repo, branch } = getOwnerRepoBranch(context);
// owner: octocat
// repo: Hello-World
// branch: new-topic
```

### httpGet

Performs an HTTPS GET operation and returns a JSON-parsed body

```javascript
const { httpGet } = require('./util');

// No Auth
let url = 'https://google.com';
const clusterMap = await httpGet(url);

// With Auth
url = 'https://deploy.glgresearch.com/deployinator/enumerate/roles';
const httpOpts = {
  headers: {
    Authorization: `Bearer ${token}`,
  },
};
const roles = await httpGet(url, httpOpts);
```

### leaveComment

Leaves the correct type of comment for a given Result object.

- If `Result.line === 0`, it will leave an issue comment, and not a line-specific comment.
- If `Result.line` is an object like `{start, end}`, it will leave the comment on the selected range of lines, in the file specified by `Result.path`.
- If `Result.line` is a positive integer, it will leave a comment at that line, in the file specified by `Result.path`.
- `Result.problems` is an array of strings, and will be converted to a markdown list in the comment

```javascript
const { leaveComment } = require('./util');

await leaveComment(octokit, result, {
  owner: 'glg-public',
  repo: 'screamer.tml',
  pull_number: 1,
  sha: 'e91f020470b41e2e5a42e0cfb9b4add9ab33145d'
});
```

### lineLink

Returns a link to a specific line, or range of lines in a blob

```javascript
const { lineLink } = require('./util');

// Whole file
let link = lineLink({
  owner: "glg-public",
  repo: "screamer.tml",
  sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
  path: "test/fixtures/pull-request.json",
  line: 0,
});
// https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json


// A specific line
link = lineLink({
  owner: "glg-public",
  repo: "screamer.tml",
  sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
  path: "test/fixtures/pull-request.json",
  line: 5,
});
// https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json#L5


// A range of lines
link = lineLink({
  owner: "glg-public",
  repo: "screamer.tml",
  sha: "c0db3ab6a7f43b416ee1810bdd49795540e19b07",
  path: "test/fixtures/pull-request.json",
  line: { start: 5, end: 9 },
});
// https://github.com/glg-public/screamer.tml/blob/c0db3ab6a7f43b416ee1810bdd49795540e19b07/test/fixtures/pull-request.json#L5-L9
```

### prLink

Creates a url for a pull request.

```javascript
const { prLink } = require('./util');

const link = prLink({
  owner: 'glg-public',
  repo: 'screamer.tml',
  pull_number: 1
});
// https://github.com/glg-public/screamer.tml/pull/1
```

### suggest

Wraps some text as a github suggestion comment

```javascript
const { suggest } = require('./util');

const suggestion = suggest('You should do this', 'console.log("hello");')
```
Results in:

    You should do this
    ```suggestion
    console.log("hello");
    ````

### suggestBugReport

Submits an issue comment on the PR which contains a link to a pre-populated bug report on this repository.

```javascript
const { suggestBugReport } = require('./util');

const error = new Error("Test");
await suggestBugReport(octokit, error, "Test Error", {
  owner: "org",
  repo: "repo",
  pull_number: 42,
});
```