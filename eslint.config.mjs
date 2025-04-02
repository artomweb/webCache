import globals from "globals";

import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs", // Use "module" if you're using ES modules
      globals: {
        ...globals.node, // Includes Node.js globals like console, setInterval, etc.
      },
    },
    rules: {
      "prefer-const": "warn", // Warns when a variable is declared but never reassigned, suggesting to use `const` instead of `let`
      "no-constant-binary-expression": "error", // Prevents constant expressions in binary operations, such as `1 + 2`
      eqeqeq: "error", // Enforces the use of strict equality (===)
    },
  },

  pluginJs.configs.recommended,
];
