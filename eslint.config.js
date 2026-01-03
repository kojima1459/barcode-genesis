import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React rules
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // ========================================
      // Firebase Proxy Import Ban
      // ========================================
      // Ban importing Firebase proxy objects directly.
      // Use getter functions instead: getDb(), getAuth(), getStorage(), getMessaging(), getFunctions()
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/firebase",
              importNames: ["db", "auth", "storage", "messaging"],
              message:
                "Do not import Firebase proxy objects directly. Use getter functions instead: getDb(), getAuth(), getStorage(), getMessaging(). The 'functions' proxy is allowed.",
            },
            {
              name: "./firebase",
              importNames: ["db", "auth", "storage", "messaging"],
              message:
                "Do not import Firebase proxy objects directly. Use getter functions instead: getDb(), getAuth(), getStorage(), getMessaging(). The 'functions' proxy is allowed.",
            },
          ],
        },
      ],
    },
  },
  {
    // Server-side TypeScript files
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "functions/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "client/src/__tests__/**",
    ],
  }
);
