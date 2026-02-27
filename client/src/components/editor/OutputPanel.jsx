/**
 * @file OutputPanel.jsx
 * @description Displays code execution results from Judge0.
 * Shows stdout, stderr, and status. Used inside the editor layout.
 */

/**
 * @param {{
 *   result: { stdout?: string, stderr?: string, status?: string, time?: string } | null,
 *   loading: boolean,
 *   onClose: Function,
 * }} props
 */
export default function OutputPanel({ result, loading, onClose }) {
  if (!loading && !result) return null;

  return (
    <div className="output-panel">
      <div className="output-panel__header">
        <span>Output</span>
        <button onClick={onClose} title="Close output">✕</button>
      </div>

      {loading && (
        <div className="output-panel__body output-panel__loading">
          Running…
        </div>
      )}

      {!loading && result && (
        <div className="output-panel__body">
          {/* Status badge */}
          <div className={`output-panel__status output-panel__status--${
            result.status === "Accepted" ? "ok" : "err"
          }`}>
            {result.status}
            {result.time && <span> · {result.time}s</span>}
          </div>

          {/* stdout */}
          {result.stdout && (
            <pre className="output-panel__pre output-panel__pre--stdout">
              {result.stdout}
            </pre>
          )}

          {/* stderr */}
          {result.stderr && (
            <pre className="output-panel__pre output-panel__pre--stderr">
              {result.stderr}
            </pre>
          )}

          {/* No output at all */}
          {!result.stdout && !result.stderr && (
            <p className="output-panel__empty">No output.</p>
          )}
        </div>
      )}
    </div>
  );
}
