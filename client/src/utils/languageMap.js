/**
 * @file languageMap.js
 * @description Single source of truth for language metadata.
 * Maps language keys to Monaco language IDs and Judge0 language IDs.
 * Judge0 IDs: https://ce.judge0.com/languages/
 */

export const LANGUAGES = {
  javascript: { label: "JavaScript", monaco: "javascript", judge0Id: 63, ext: "js" },
  typescript: { label: "TypeScript", monaco: "typescript", judge0Id: 74, ext: "ts" },
  python: { label: "Python", monaco: "python", judge0Id: 71, ext: "py" },
  java: { label: "Java", monaco: "java", judge0Id: 62, ext: "java" },
  cpp: { label: "C++", monaco: "cpp", judge0Id: 54, ext: "cpp" },
  c: { label: "C", monaco: "c", judge0Id: 50, ext: "c" },
  go: { label: "Go", monaco: "go", judge0Id: 60, ext: "go" },
  rust: { label: "Rust", monaco: "rust", judge0Id: 73, ext: "rs" },
  ruby: { label: "Ruby", monaco: "ruby", judge0Id: 72, ext: "rb" },
  php: { label: "PHP", monaco: "php", judge0Id: 68, ext: "php" },
};

/**
 * Returns the Monaco language ID for a given language key.
 * Falls back to "plaintext" for unknown languages.
 * @param {string} lang
 * @returns {string}
 */
export function toMonacoLang(lang) {
  return LANGUAGES[lang]?.monaco ?? "plaintext";
}

/**
 * Returns the Judge0 language ID for a given language key.
 * @param {string} lang
 * @returns {number|null}
 */
export function toJudge0Id(lang) {
  return LANGUAGES[lang]?.judge0Id ?? null;
}

/** All language keys as an array for dropdowns */
export const LANGUAGE_KEYS = Object.keys(LANGUAGES);

/**
 * Build a reverse map: extension → language key
 */
const EXT_MAP = {};
for (const [key, meta] of Object.entries(LANGUAGES)) {
  EXT_MAP[meta.ext] = key;
}
// Extra common extensions
Object.assign(EXT_MAP, {
  jsx: "javascript", mjs: "javascript", cjs: "javascript",
  tsx: "typescript",
  py: "python",
  h: "c", hpp: "cpp", cc: "cpp", cxx: "cpp",
  rs: "rust",
  rb: "ruby",
  // Non-executable but useful for Monaco highlighting
  css: "css", html: "html", htm: "html",
  json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
  sh: "shell", bash: "shell",
  sql: "sql", xml: "xml", svg: "xml",
});

/**
 * Detects language key from a filename's extension.
 * Falls back to "plaintext" for unknown extensions.
 * @param {string} filename e.g. "index.tsx"
 * @returns {string} e.g. "typescript"
 */
export function extToLanguage(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return EXT_MAP[ext] || "plaintext";
}
