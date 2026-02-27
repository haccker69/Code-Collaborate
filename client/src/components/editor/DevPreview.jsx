import { useState, useEffect } from "react";
import { useWebContainer } from "../../hooks/useWebContainer";

export default function DevPreview({ projectId }) {
    const { instance, loading, error } = useWebContainer(projectId);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!instance) return;

        // Listen for the 'server-ready' event from WebContainer.
        // This fires when a dev server (like `npm run dev`) binds to a port.
        const handleServerReady = (port, serverUrl) => {
            console.log(`[WebContainer] Server ready on port ${port} at ${serverUrl}`);
            setUrl(serverUrl);
        };

        instance.on("server-ready", handleServerReady);

        return () => {
            // Clean up listener
            // (WebContainer API doesn't have an explicit 'off' but it's good practice
            //  if they add it later, or you can manage listeners securely).
            // Note: `instance.on` returns a teardown function in some API versions,
            // but in standard @webcontainer/api it returns nothing, so we just let it be.
        };
    }, [instance]);

    if (loading) {
        return (
            <div className="workspace__empty">
                <span className="material-symbols-outlined spin">sync</span>
                <p style={{ marginTop: 12 }}>Booting WebContainer...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="workspace__empty" style={{ color: "var(--danger)" }}>
                <span className="material-symbols-outlined">error</span>
                <p style={{ marginTop: 12 }}>Failed to load environment: {error}</p>
            </div>
        );
    }

    if (!url) {
        return (
            <div className="workspace__empty">
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }}>language</span>
                <p>No development server running.</p>
                <p style={{ opacity: 0.7, fontSize: 13, marginTop: 8 }}>
                    Start a server (e.g., <code>npm run dev</code> or <code>node server.js</code>) in the terminal to see the preview here.
                </p>
            </div>
        );
    }

    return (
        <div className="dev-preview" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Mini browser address bar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "var(--surface-light)",
                borderBottom: "1px solid var(--border)",
                gap: 12
            }}>
                <button
                    onClick={() => {
                        const iframe = document.getElementById("dev-preview-iframe");
                        if (iframe) iframe.src = iframe.src;
                    }}
                    style={{
                        background: "transparent", border: "none", color: "var(--text)", cursor: "pointer",
                        display: "flex", alignItems: "center", opacity: 0.7
                    }}
                    title="Reload Preview"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                </button>
                <div style={{
                    flex: 1,
                    background: "var(--bg)",
                    padding: "4px 12px",
                    borderRadius: 4,
                    fontSize: 13,
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    opacity: 0.8,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                }}>
                    {url}
                </div>
                <button
                    onClick={() => window.open(url, "_blank")}
                    style={{
                        background: "transparent", border: "none", color: "var(--text)", cursor: "pointer",
                        display: "flex", alignItems: "center", opacity: 0.7
                    }}
                    title="Open in new tab"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                </button>
            </div>

            {/* The actual preview iframe */}
            <iframe
                id="dev-preview-iframe"
                src={url}
                style={{ flex: 1, border: "none", width: "100%", height: "100%", background: "#fff" }}
                title="Development Preview"
                allow="cross-origin-isolated"
            />
        </div>
    );
}
