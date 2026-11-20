'use strict';

// Product scope gates. P2 stays off until a later product decision changes these
// defaults. Historical login-replay and submission code remains in the tree and
// must not run while the matching flag is false.
module.exports = {
  schoolLoginAutomation: false,
  officialAutoSubmit: false
};
