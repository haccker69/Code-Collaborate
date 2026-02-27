import { useState, useEffect } from "react";
import { exportProject } from "../api/fileApi";
import { bootWebContainer } from "../utils/webcontainerManager";

/**
 * Helper to convert our flat file array into the FileSystemTree
 * format required by WebContainers.
 */
function buildFileSystemTree(flatFiles) {
    const tree = {};
    const map = {};

    // First pass: create node objects based on type
    flatFiles.forEach(file => {
        if (file.type === "folder") {
            map[file._id] = { directory: {} };
        } else {
            map[file._id] = { file: { contents: file.content || "" } };
        }
    });

    // Second pass: link up children (this assumes parent folders exist)
    flatFiles.forEach(file => {
        const node = map[file._id];
        if (file.parentId && map[file.parentId]) {
            map[file.parentId].directory[file.name] = node;
        } else {
            tree[file.name] = node;
        }
    });

    return tree;
}

export function useWebContainer(projectId) {
    const [instance, setInstance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function bootAndMount() {
            if (!projectId) return;

            try {
                setLoading(true);

                // 1. Boot WebContainer (Singleton Promise)
                const webcontainerInstance = await bootWebContainer();

                // 2. Fetch full project export
                const flatFiles = await exportProject(projectId);

                // 3. Mount files
                const tree = buildFileSystemTree(flatFiles);
                await webcontainerInstance.mount(tree);

                setInstance(webcontainerInstance);
                setError(null);
            } catch (err) {
                console.error("Failed to boot WebContainer:", err);
                setError(err.message || "Failed to boot WebContainer");
            } finally {
                setLoading(false);
            }
        }

        bootAndMount();
    }, [projectId]);

    return { instance, loading, error };
}
