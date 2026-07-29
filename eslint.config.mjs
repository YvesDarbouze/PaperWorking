import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

function promoteWarnsToErrors(configs) {
  return configs.map((config) => {
    if (!config.rules) return config;
    const newRules = { ...config.rules };
    for (const [key, val] of Object.entries(newRules)) {
      if (val === "warn" || val === 1) {
        newRules[key] = "error";
      } else if (Array.isArray(val) && (val[0] === "warn" || val[0] === 1)) {
        newRules[key] = ["error", ...val.slice(1)];
      }
    }
    return { ...config, rules: newRules };
  });
}

const eslintConfig = defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  ...promoteWarnsToErrors(nextVitals),
  ...promoteWarnsToErrors(nextTs),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next & build/temp artifacts:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".firebase/**",
    ".agent/**",
    ".agentic/**",
    ".agents/**",
    ".claude/**",
    ".codebuddy/**",
    ".codex/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".gstack/**",
    ".kiro/**",
    ".mcpjam/**",
    ".opencode/**",
    ".qoder/**",
    ".roo/**",
    ".trae/**",
    ".vscode/**",
    ".windsurf/**",
    "playwright-report/**",
    "test-results/**",
    "scratch/**",
    "src/scratch/**",
    "google-cloud-sdk/**",
    "diagnostics_cache/**",
  ]),
]);

export default eslintConfig;
