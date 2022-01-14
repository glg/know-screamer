/**
 * You almost certainly don't actually want to mount the template check.
 * However, this demonstrates the expected patter
 */
const template = require("./template");

module.exports = {
  template,

  all: [template],
};
