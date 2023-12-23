import { Workspace } from './obj/workspace';
import { StorageHelper } from "./storage-helper";

export class Actions {

    static openWorkspace(workspace: Workspace): void {
        const urls = workspace.tabs.map(tab => tab.url);
        chrome.windows.create({ url: urls });
    }
}