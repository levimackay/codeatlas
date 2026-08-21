import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "src-tauri/**", "target/**", "website/dist/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-unused-vars": "off",
      // TypeScript itself already reports genuine undefined-name errors
      // (and does so correctly for ambient DOM globals, the React UMD
      // namespace used in type positions, etc., none of which base
      // ESLint's no-undef understands) — this is typescript-eslint's own
      // documented recommendation for .ts/.tsx files.
      "no-undef": "off",
    },
  },
  {
    files: ["*.config.ts", "*.config.js"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
