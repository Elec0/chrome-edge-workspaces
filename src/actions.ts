import { Workspace } from './obj/workspace';
import { StorageHelper } from "./storage-helper";

export class Actions {

    static openWorkspace(workspace: Workspace): void {
        const urls = workspace.getTabs().map(tab => tab.url);
        chrome.windows.create({ url: urls });
    }
}