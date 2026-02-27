import { WebContainer } from "@webcontainer/api";

export let webcontainerInstance = null;
let bootPromise = null;

export async function bootWebContainer() {
    if (!bootPromise) {
        bootPromise = WebContainer.boot();
    }
    webcontainerInstance = await bootPromise;
    return webcontainerInstance;
}
