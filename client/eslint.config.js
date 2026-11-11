import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  // ── Module boundaries (docs/CLIENT_ARCHITECTURE.md) ──────────────────────
  // Dependency direction: app → features → components/shared → components/ui → lib/hooks.
  {
    files: ["src/components/**", "src/hooks/**", "src/lib/**", "src/stores/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/app/*"],
              message: "Shared layers must not depend on features or the app shell.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message:
                "Import another feature only via its public barrel (@/features/<name>); use relative imports inside a feature.",
            },
            { group: ["@/app/*"], message: "Features must not depend on the app shell." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message: "Import features only via their public barrel (@/features/<name>).",
            },
          ],
        },
      ],
    },
  }
);
