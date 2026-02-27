/**
 * @file CodeEditor.jsx
 * @description Collaborative Monaco editor — theme matched to reference IDE.
 *
 * Custom theme "collabdev-dark" with:
 *   - #121121 background
 *   - Purple italic keywords (#5048e5)
 *   - Emerald strings (#10b981)
 *   - Amber variables/functions (#fbbf24)
 *   - Highlighted active line with accent tint
 */

import { useEffect, useRef, useCallback, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

// Register Monaco web workers
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

import { useRoom } from "../../contexts/RoomContext";
import { toMonacoLang } from "../../utils/languageMap";

import * as fileApi from "../../api/fileApi";
import { webcontainerInstance } from "../../utils/webcontainerManager";

loader.config({ monaco });

const YJS_WS_URL = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5002").replace(/^http/, "ws") + "/yjs";

// ── Custom theme matching reference ──────────────────────────────────
const THEME_NAME = "collabdev-dark";
let themeRegistered = false;

function registerTheme() {
  if (themeRegistered) return;
  themeRegistered = true;

  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      // ── Default foreground
      { token: "", foreground: "e2e8f0" },

      // ── Keywords: purple + italic
      //    Monaco Monarch tokens: keyword, keyword.js, keyword.ts, keyword.flow.js, etc.
      { token: "keyword", foreground: "5048e5", fontStyle: "italic" },
      { token: "keyword.js", foreground: "5048e5", fontStyle: "italic" },
      { token: "keyword.ts", foreground: "5048e5", fontStyle: "italic" },
      { token: "keyword.flow.js", foreground: "5048e5", fontStyle: "italic" },
      { token: "keyword.flow.ts", foreground: "5048e5", fontStyle: "italic" },

      // ── Strings: emerald green
      { token: "string", foreground: "10b981" },
      { token: "string.js", foreground: "10b981" },
      { token: "string.ts", foreground: "10b981" },
      { token: "string.key.json", foreground: "10b981" },
      { token: "string.value.json", foreground: "10b981" },
      { token: "string.html", foreground: "10b981" },
      { token: "string.css", foreground: "10b981" },

      // ── Identifiers (variable & function names): light foreground base
      { token: "identifier", foreground: "e2e8f0" },
      { token: "identifier.js", foreground: "e2e8f0" },
      { token: "identifier.ts", foreground: "e2e8f0" },

      // ── Type identifiers: amber (React components, class names, interfaces)
      { token: "type", foreground: "fbbf24" },
      { token: "type.identifier", foreground: "fbbf24" },
      { token: "type.identifier.js", foreground: "fbbf24" },
      { token: "type.identifier.ts", foreground: "fbbf24" },

      // ── Numbers: amber
      { token: "number", foreground: "fbbf24" },
      { token: "number.js", foreground: "fbbf24" },
      { token: "number.ts", foreground: "fbbf24" },
      { token: "number.hex", foreground: "fbbf24" },

      // ── Regexp: emerald
      { token: "regexp", foreground: "10b981" },

      // ── JSX/HTML tags: primary purple
      { token: "tag", foreground: "5048e5" },
      { token: "tag.html", foreground: "5048e5" },
      { token: "metatag", foreground: "5048e5" },
      { token: "metatag.html", foreground: "5048e5" },
      { token: "metatag.content.html", foreground: "10b981" },
      { token: "attribute.name", foreground: "e2e8f0" },
      { token: "attribute.name.html", foreground: "e2e8f0" },
      { token: "attribute.value", foreground: "10b981" },
      { token: "attribute.value.html", foreground: "10b981" },

      // ── Comments: dimmed gray + italic
      { token: "comment", foreground: "4a5568", fontStyle: "italic" },
      { token: "comment.js", foreground: "4a5568", fontStyle: "italic" },
      { token: "comment.ts", foreground: "4a5568", fontStyle: "italic" },
      { token: "comment.html", foreground: "4a5568", fontStyle: "italic" },
      { token: "comment.css", foreground: "4a5568", fontStyle: "italic" },

      // ── Delimiters: slate gray
      { token: "delimiter", foreground: "94a3b8" },
      { token: "delimiter.bracket", foreground: "94a3b8" },
      { token: "delimiter.bracket.js", foreground: "94a3b8" },
      { token: "delimiter.bracket.ts", foreground: "94a3b8" },
      { token: "delimiter.parenthesis", foreground: "94a3b8" },
      { token: "delimiter.parenthesis.js", foreground: "94a3b8" },
      { token: "delimiter.parenthesis.ts", foreground: "94a3b8" },
      { token: "delimiter.array", foreground: "94a3b8" },
      { token: "delimiter.angle", foreground: "94a3b8" },

      // ── Operators: purple
      { token: "operator", foreground: "5048e5" },
      { token: "operator.js", foreground: "5048e5" },
      { token: "operator.ts", foreground: "5048e5" },

      // ── CSS tokens
      { token: "tag.css", foreground: "fbbf24" },
      { token: "attribute.name.css", foreground: "94a3b8" },
      { token: "attribute.value.css", foreground: "10b981" },
      { token: "attribute.value.number.css", foreground: "fbbf24" },
      { token: "attribute.value.unit.css", foreground: "fbbf24" },
      { token: "attribute.value.hex.css", foreground: "fbbf24" },

      // ── JSON tokens
      { token: "string.key.json", foreground: "5048e5" },
      { token: "number.json", foreground: "fbbf24" },
      { token: "keyword.json", foreground: "5048e5" },
    ],
    colors: {
      "editor.background": "#121121",
      "editor.foreground": "#e2e8f0",
      "editor.lineHighlightBackground": "#5048e515",
      "editor.lineHighlightBorder": "#5048e530",
      "editor.selectionBackground": "#5048e540",
      "editor.selectionHighlightBackground": "#5048e520",
      "editorCursor.foreground": "#5048e5",
      "editorLineNumber.foreground": "#4a5568",
      "editorLineNumber.activeForeground": "#94a3b8",
      "editorGutter.background": "#121121",
      "editorWidget.background": "#1a192d",
      "editorWidget.border": "#5048e530",
      "editor.inactiveSelectionBackground": "#5048e520",
      "editorIndentGuide.background": "#1a192d",
      "editorIndentGuide.activeBackground": "#5048e530",
      "editorBracketMatch.background": "#5048e520",
      "editorBracketMatch.border": "#5048e550",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#5048e520",
      "scrollbarSlider.hoverBackground": "#5048e540",
      "scrollbarSlider.activeBackground": "#5048e560",
      "input.background": "#1a192d",
      "input.border": "#5048e530",
      "dropdown.background": "#1a192d",
      "list.activeSelectionBackground": "#5048e530",
      "list.hoverBackground": "#5048e515",
    },
  });
}

/**
 * @param {{
 *   fileId: string,
 *   activeFileId: string,
 *   initialContent: string,
 *   language: string,
 * }} props
 */
export default function CodeEditor({ fileId, activeFileId, initialContent, language }) {
  const { projectId, setLanguage, projectFiles } = useRoom();

  const editorRef = useRef(null);
  const contentRef = useRef(initialContent);
  const dirtyRef = useRef(false);
  const fileIdRef = useRef(fileId);

  // Yjs refs
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);


  const [lang, setLang] = useState(language || "javascript");
  const [editorMounted, setEditorMounted] = useState(false);

  // Keep fileIdRef in sync
  useEffect(() => { fileIdRef.current = fileId; }, [fileId]);

  // ── Flush unsaved content to server on unmount or fileId change ──
  useEffect(() => {
    return () => {
      if (dirtyRef.current && fileIdRef.current) {
        fileApi.saveContent(fileIdRef.current, contentRef.current).catch((err) => {
          console.error("[editor] Flush save on unmount failed:", err.message);
        });
        dirtyRef.current = false;
      }
    };
  }, [fileId]);

  // ── Yjs CRDT setup — connect Y.Doc + MonacoBinding per file ─────
  useEffect(() => {
    if (!fileId || !projectId || !editorRef.current || !editorMounted) return;

    // Clean up previous binding if switching files
    bindingRef.current?.destroy();
    providerRef.current?.destroy();
    ydocRef.current?.destroy();
    bindingRef.current = null;
    providerRef.current = null;
    ydocRef.current = null;

    const ydoc = new Y.Doc();
    const roomName = `code-${projectId}-${fileId}`;
    const provider = new WebsocketProvider(YJS_WS_URL, roomName, ydoc);
    const ytext = ydoc.getText("monaco");

    ydocRef.current = ydoc;
    providerRef.current = provider;

    const editor = editorRef.current;
    const model = editor.getModel();

    // Wait for initial sync BEFORE creating the binding
    // This ensures we don't get a race between defaultValue and Yjs state
    const onSync = (synced) => {
      if (!synced) return;

      // Seed initial content ONLY if this is a brand-new Yjs document
      if (ytext.length === 0 && initialContent) {
        ydoc.transact(() => {
          ytext.insert(0, initialContent);
        });
      }

      // NOW create the binding — Yjs state is authoritative at this point
      if (!bindingRef.current) {
        // Clear whatever Monaco had and let the binding take over
        const binding = new MonacoBinding(
          ytext,
          model,
          new Set([editor]),
          provider.awareness
        );
        bindingRef.current = binding;
      }

      // Track content for save/execute
      contentRef.current = ytext.toString();
    };

    provider.on("sync", onSync);

    // Track content changes for save/execute
    const updateContent = () => {
      contentRef.current = ytext.toString();
      dirtyRef.current = true;
    };
    ytext.observe(updateContent);

    return () => {
      provider.off("sync", onSync);
      ytext.unobserve(updateContent);
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
      bindingRef.current = null;
    };
  }, [fileId, projectId, editorMounted]);

  // ── Find absolute file path for WebContainers ────────────────────
  const getFilePath = useCallback(() => {
    if (!fileId || projectFiles.length === 0) return null;
    let current = projectFiles.find((f) => f._id === fileId);
    if (!current) return null;

    const parts = [current.name];
    while (current.parentId) {
      current = projectFiles.find((f) => f._id === current.parentId);
      if (current) parts.unshift(current.name);
      else break;
    }
    return parts.join("/");
  }, [fileId, projectFiles]);

  // ── Local editor change handler (WebContainer sync only) ─────────
  const handleChange = useCallback(
    (value) => {
      // Yjs handles all collaborative sync — this only syncs to WebContainer
      if (webcontainerInstance) {
        const path = getFilePath();
        if (path) {
          webcontainerInstance.fs.writeFile(path, value).catch(err => {
            console.error("[WebContainer] Failed to write file:", err);
          });
        }
      }
    },
    [getFilePath]
  );

  // ── Monaco mount ─────────────────────────────────────────────────
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    setEditorMounted(true);
  };

  const handleBeforeMount = (monacoInstance) => {
    registerTheme();
  };

  // ── Run code ─────────────────────────────────────────────────────
  const handleRun = useCallback(async (stdinInput) => {
    window.dispatchEvent(new CustomEvent("collabdev:execution_start"));
    try {
      const { executeCode } = await import("../../api/executeApi");
      const result = await executeCode({
        sourceCode: contentRef.current,
        language: lang,
        stdin: stdinInput,
      });
      window.dispatchEvent(new CustomEvent("collabdev:execution_finish", { detail: result }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent("collabdev:execution_finish", {
        detail: {
          status: "Error",
          stderr: err.response?.data?.message || "Execution failed",
        }
      }));
    }
  }, [lang]);

  useEffect(() => {
    const handleGlobalRun = (e) => {
      // Only the currently active tab should execute its code
      if (fileId === activeFileId) {
        handleRun(e.detail?.stdin || "");
      }
    };
    window.addEventListener("collabdev:execute_code", handleGlobalRun);
    return () => window.removeEventListener("collabdev:execute_code", handleGlobalRun);
  }, [handleRun, fileId, activeFileId]);

  // ── Manual save ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      await fileApi.saveContent(fileId, contentRef.current);
      dirtyRef.current = false;
    } catch (err) {
      console.error("[editor] Manual save failed:", err.message);
    }
  }, [fileId]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className="code-editor" style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div className="code-editor__surface" style={{ flex: 1, position: "relative" }}>
        <Editor
          height="100%"
          language={toMonacoLang(lang)}
          defaultValue=""
          theme={THEME_NAME}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          onChange={handleChange}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}
