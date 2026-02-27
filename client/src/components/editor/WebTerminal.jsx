import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import { useWebContainer } from "../../hooks/useWebContainer";

export default function WebTerminal({ projectId }) {
    const terminalRef = useRef(null);
    const { instance, loading, error } = useWebContainer(projectId);
    const [shellProcess, setShellProcess] = useState(null);

    useEffect(() => {
        if (loading || error || (!instance && !loading)) return;
        if (!terminalRef.current) return;

        // Initialize Xterm.js
        const fitAddon = new FitAddon();
        const terminal = new Terminal({
            cursorBlink: true,
            fontFamily: "var(--mono)",
            fontSize: 13,
            padding: 12,
            theme: {
                background: "transparent",
                foreground: "#cbd5e1",
                cursor: "#5048e5",
                black: "#1e1e1e",
                red: "#ef4444",
                green: "#22c55e",
                yellow: "#f59e0b",
                blue: "#3b82f6",
                magenta: "#ec4899",
                cyan: "#06b6d4",
                white: "#f8fafc",
            }
        });

        terminal.loadAddon(fitAddon);
        terminal.open(terminalRef.current);
        fitAddon.fit();

        // Handle Resize
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
            if (shellProcess) {
                shellProcess.resize({
                    cols: terminal.cols,
                    rows: terminal.rows
                });
            }
        });
        resizeObserver.observe(terminalRef.current);

        // Boot WebContainer JSH (shell)
        let p = null;
        let inputWriter = null;

        async function startShell() {
            p = await instance.spawn("jsh", {
                terminal: {
                    cols: terminal.cols,
                    rows: terminal.rows,
                },
            });
            setShellProcess(p);

            // Pipe WebContainer output to Xterm
            p.output.pipeTo(
                new WritableStream({
                    write(data) {
                        terminal.write(data);
                    }
                })
            );

            // Pipe Xterm input to WebContainer
            inputWriter = p.input.getWriter();
            terminal.onData((data) => {
                inputWriter.write(data);
            });

            // Listen for external commands (like RUN button)
            const handleTerminalInput = (e) => {
                if (inputWriter && e.detail?.input) {
                    inputWriter.write(e.detail.input);
                }
                terminal.focus();
            };

            const handleTerminalFocus = () => terminal.focus();

            window.addEventListener("collabdev:terminal_input", handleTerminalInput);
            window.addEventListener("collabdev:terminal_focus", handleTerminalFocus);

            // Save cleanup references
            p._cleanupEvents = () => {
                window.removeEventListener("collabdev:terminal_input", handleTerminalInput);
                window.removeEventListener("collabdev:terminal_focus", handleTerminalFocus);
            };
        }

        startShell();

        return () => {
            resizeObserver.disconnect();
            terminal.dispose();
            if (p) {
                if (p._cleanupEvents) p._cleanupEvents();
                p.kill();
            }
        };
    }, [instance, loading, error]);

    if (loading) {
        return (
            <div className="bottom-panel__terminal">
                <div className="terminal-output__info">
                    <span className="terminal-cursor-blink">▌</span> Booting WebContainer Environment...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bottom-panel__terminal">
                <div className="terminal-output__stderr">Failed to initialize WebContainer: {error}</div>
            </div>
        );
    }

    // The outer div needs to take up the full available height and width
    // for Xterm's fitAddon to work properly.
    return (
        <div style={{ height: "100%", width: "100%", padding: "12px 16px", overscrollBehavior: "none" }}>
            <div ref={terminalRef} style={{ height: "100%", width: "100%", overscrollBehavior: "none" }} />
        </div>
    );
}
