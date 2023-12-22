import { Workspace } from './obj/workspace';
import { StorageHelper } from "./storage-helper";

export class Actions {
    
    static openWorkspace(uuid: string): void {
        StorageHelper.getWorkspace(uuid).then((workspace: Workspace) => {
            const urls = workspace.tabs.map(tab => tab.url);
            chrome.windows.create({ url: urls });
        });
    }
}