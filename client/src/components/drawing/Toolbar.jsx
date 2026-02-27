/**
 * @file Toolbar.jsx
 * @description Drawing tool controls.
 *
 * @param {{
 *   color: string,
 *   width: number,
 *   tool: string,
 *   onColorChange: (color: string) => void,
 *   onWidthChange: (width: number) => void,
 *   onToolChange: (tool: string) => void,
 *   onUndo: () => void,
 *   onClear: () => void,
 * }} props
 */

const PRESET_COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#fbbf24",
  "#4ade80", "#38bdf8", "#818cf8", "#e879f9",
];

const WIDTHS = [2, 4, 8, 14];

export default function Toolbar({
  tool,
  color,
  width,
  onToolChange,
  onColorChange,
  onWidthChange,
  onUndo,
  onClear
}) {
  return (
    <div className="toolbar">
      {/* Tools mode */}
      <div className="toolbar__section">
        <button
          className={`toolbar__tool ${tool === "pen" ? "toolbar__tool--active" : ""}`}
          onClick={() => onToolChange("pen")}
          title="Pen"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>draw</span>
        </button>
        <button
          className={`toolbar__tool ${tool === "eraser" ? "toolbar__tool--active" : ""}`}
          onClick={() => onToolChange("eraser")}
          title="Eraser"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>ink_eraser</span>
        </button>
      </div>

      {tool !== "eraser" && (
        <>
          <div className="toolbar__divider" />

          {/* Color swatches */}
          <div className="toolbar__section">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`toolbar__color ${color === c ? "toolbar__color--active" : ""}`}
                style={{ background: c }}
                onClick={() => onColorChange(c)}
                title={c}
              />
            ))}
            {/* Custom colour picker */}
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="toolbar__color-picker"
              title="Custom color"
            />
          </div>
        </>
      )}

      {/* Width buttons */}
      <div className="toolbar__section">
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`toolbar__width ${width === w ? "toolbar__width--active" : ""}`}
            onClick={() => onWidthChange(w)}
            title={`${w}px`}
          >
            <span style={{
              display: "block",
              width: w * 2,
              height: w * 2,
              borderRadius: "50%",
              background: "currentColor",
            }} />
          </button>
        ))}
      </div>

      <div className="toolbar__divider" />

      {/* Undo & Clear board */}
      <button className="toolbar__undo" onClick={onUndo} title="Undo last stroke">
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>undo</span>
      </button>
      <button className="toolbar__clear" onClick={onClear} title="Clear board">
        Clear
      </button>
    </div>
  );
}
