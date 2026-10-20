import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**", ".astro/**", "public/motion-kit/**", "public/diagram-fx/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
];
