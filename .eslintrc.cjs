const process = require("node:process");

process.env.ESLINT_TSCONFIG = "tsconfig.json";

module.exports = {
  extends: "@antfu",
  rules: {
    "@typescript-eslint/quotes": ["error", "double"],
    "@typescript-eslint/semi": ["error", "always"],
    "@typescript-eslint/member-delimiter-style": ["error", { multiline: { delimiter: "semi" } }],
    "@typescript-eslint/brace-style": ["error", "1tbs"],
    "curly": ["error", "multi-line"],
    "arrow-parens": ["error", "always"],
  },
};
