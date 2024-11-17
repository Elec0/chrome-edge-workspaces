import { assert } from "console";
import { Constants } from "./constants/constants";
import { MessageResponse } from "./constants/message-responses";
import { VERSION } from "./globals";
import { Workspace } from "./obj/workspace";
import { SyncWorkspaceStorage } from "./storage/sync-workspace-storage";
import { WorkspaceStorage } from "./workspace-storage";
import { WorkspaceUtils } from "./utils/workspace-utils";

export class StorageHelper {
    private static logStorageChanges = false;
    private static _storage = chrome.storage.local;

    public static async init() {
        this.saveVersionNumber();
    }

    /** 
     * Get the value of a key in storage.
     * @param key - The key to get the value of.
     * @param defaultValue - The default value to return if the key does not exist.
     * @returns The value of the key, or the default value if the key does not exist.
     */
    public static async getValue(key: string, defaultValue: string = ""): Promise<string> {
        const result = await this._storage.get(key);
        if (StorageHelper.logStorageChanges)
            console.log(`Get ${ key }: ${ result[key] || defaultValue }`);
        return result[key] || defaultValue;
    }

    public static setValue(key: string, val: string): Promise<void> {
        // Being called from tabUpdated after a window with a tab group is closed, for some reason. With 0 tabs, clearing the storage.
        if (StorageHelper.logStorageChanges)
            console.log(`Set ${ key }: ${ val }`);
        return this._storage.set({ [key]: val });
    }

    public static async getSyncValue(key: string, defaultValue: string = ""): Promise<string> {
        const result = await chrome.storage.sync.get(key);
        return result[key] || defaultValue;
    }

    public static setSyncValue(key: string, val: string): Promise<void> {
        console.log(`Sync set ${ key }`);
        return chrome.storage.sync.set({ [key]: val });
    }

    /**
     * Save the version number to storage. This will be used to determine if the extension has been updated
     * and if any migrations need to be run.
     */
    private static saveVersionNumber() {
        this.setValue("version", VERSION);
    }


    /**
     * Retrieves the workspaces from both local storage and sync storage, and merges them.
     *
     * @returns A promise that resolves to the merged workspace storage.
     */
    public static async getWorkspaces(): Promise<WorkspaceStorage> {
        const localStorage = await this.getLocalWorkspaces();
        if (await SyncWorkspaceStorage.isSyncSavingEnabled() == false) {
            return localStorage;
        }
        
        const syncStorage = await SyncWorkspaceStorage.getAllSyncWorkspaces();
        return WorkspaceUtils.mergeWorkspaceStorages(localStorage, syncStorage);
    }

    /**
     * Get the workspaces from local storage.
     * @returns A promise that resolves to a map of workspaces, or an empty object if no workspaces exist.
     */
    public static async getLocalWorkspaces(): Promise<WorkspaceStorage> {
        const result = await this.getRawWorkspaces();
        return this.workspacesFromJson({ "data": result });
    }

    /**
     * Set the workspaces in storage.
     * @param workspaces - The workspaces to set.
     */
    public static async setWorkspaces(workspaces: WorkspaceStorage): Promise<void> {
        await this.setValue(Constants.KEY_STORAGE_WORKSPACES, workspaces.serialize());
    }

    public static async setWorkspacesSync(workspaces: WorkspaceStorage): Promise<void> {
        await this.setSyncValue(Constants.KEY_STORAGE_WORKSPACES, workspaces.serialize());
    }

    /**
     * Get the raw workspaces from storage.
     * @returns 
     */
    public static async getRawWorkspaces(): Promise<string> {
        return await this.getValue(Constants.KEY_STORAGE_WORKSPACES, "{}");
    }

    /**
     * Deserialize the workspaces from a MessageResponse.
     * @param json - The MessageResponse to deserialize.
     * @returns The workspaces from the MessageResponse.
     */
    public static workspacesFromJson(json: MessageResponse): WorkspaceStorage {
        const workspaceStorage = new WorkspaceStorage();
        workspaceStorage.deserialize(json.data);
        return workspaceStorage;
    }

    /**
     * Get a single workspace from the `workspaces` map or from the sync storage.
     * The workspace must exist in the map or the promise will reject.
     * @param id - The id of the workspace to get.
     * @returns A promise that resolves to the workspace, or rejects if the workspace does not exist.
     */
    public static async getWorkspace(id: string | number): Promise<Workspace> {
        const workspaces = await this.getWorkspaces();
        const localWorkspace = workspaces.get(id);

        if (await SyncWorkspaceStorage.isSyncSavingEnabled() == false) {
            if (localWorkspace) {
                return localWorkspace;
            }
            else {
                return Promise.reject(`getWorkspace: Workspace does not exist with id ${ id }`);
            }
        }
        // Get sync data
        const syncWorkspace = await SyncWorkspaceStorage.getWorkspaceFromSync(id);

        if (localWorkspace && syncWorkspace) {
            // Compare timestamps and return the most recent one
            return SyncWorkspaceStorage.getMoreRecentWorkspace(localWorkspace, syncWorkspace);
        }
        else if (localWorkspace) {
            return localWorkspace;
        }
        else if (syncWorkspace) {
            return syncWorkspace;
        }
        else {
            return Promise.reject(`getWorkspace: Workspace does not exist with id ${ id }`);
        }

    }

    /**
     * Set a single workspace in the `workspaces` map.
     * Will overwrite the workspace if it already exists, and add it if it does not.
     * @param workspace - The workspace to set.
     */
    public static async setWorkspace(workspace: Workspace): Promise<void> {
        const workspaces = await this.getWorkspaces();
        // We're setting the workspace, so we need to update the last updated time.
        workspace.updateLastUpdated();
        workspaces.set(workspace.uuid, workspace);
        await this.setWorkspaces(workspaces);

        if (await SyncWorkspaceStorage.isSyncSavingEnabled()) {
            await SyncWorkspaceStorage.debounceSaveWorkspaceToSync(workspace);
        }
    }

    /**
     * Add a new workspace to storage.
     * We assume the window has no tabs, since it was just created.
     * 
     * @param workspaceName - User provided name for the workspace.
     * @param window - Chrome window object.
     * @returns A promise that resolves to true if the workspace was added successfully, or rejects if the workspace could not be added.
     */
    public static async addWorkspace(workspaceName: string, windowId: number): Promise<boolean> {
        console.debug("addWorkspace: ", workspaceName, windowId);

        if (windowId == null || windowId == undefined) {
            return Promise.resolve(false) // reject("Window id is null or undefined");
        }

        const workspaces = await this.getWorkspaces();
        const newWorkspace = new Workspace(windowId, workspaceName, []);
        newWorkspace.updateLastUpdated();
        workspaces.set(newWorkspace.uuid, newWorkspace);
        await this.setWorkspaces(workspaces);

        return Promise.resolve(true);
    }

    /**
     * Remove a workspace from storage, both local and sync.
     * @param uuid - The UUID of the workspace to remove.
     * @returns A promise that resolves to true if the workspace was removed successfully, or resolves to false if the workspace could not be removed.
     */
    public static async removeWorkspace(uuid: string): Promise<boolean> {
        console.debug("removeWorkspace: ", uuid);
        const workspaces = await this.getWorkspaces();
        if (workspaces.delete(uuid)) {
            await SyncWorkspaceStorage.deleteWorkspaceFromSync(uuid);
            await this.setWorkspaces(workspaces);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }

    /**
     * Rename a workspace in storage.
     * @param uuid - The UUID of the workspace to rename.
     * @param newName - The new name for the workspace.
     * @returns A promise that resolves to true if the workspace was renamed successfully, or resolves to false if the workspace could not be renamed.
     */
    public static async renameWorkspace(uuid: string, newName: string): Promise<boolean> {
        console.debug("renameWorkspace: ", uuid, newName);
        try {
            // Promise will reject if workspace does not exist
            const workspace = await this.getWorkspace(uuid);
            workspace.updateName(newName);
            await this.setWorkspace(workspace);

            return Promise.resolve(true);
        }
        catch (error) {
            return Promise.resolve(false);
        }
    }

    /**
     * Determine if a window is in a workspace, meaning a workspace's window id is equal to the window id.
     */
    public static async isWindowWorkspace(windowId?: number): Promise<boolean> {
        if (windowId == null || windowId == undefined) {
            return false;
        }

        const workspaceStorage = await this.getWorkspaces();
        return workspaceStorage.get(windowId) != undefined;
    }

    /** Get the workspace associated with a window. */
    public static async getWorkspaceFromWindow(windowId: number): Promise<Workspace | undefined> {
        const workspaceStorage = await this.getWorkspaces();
        return Promise.resolve(workspaceStorage.get(windowId));
    }

    /** Delete everything we have in storage. */
    public static async clearWorkspaces() {
        await this._storage.clear();
        console.log("Cleared all data");
    }

    
    /**
     * Retrieves all keys from the specified storage that start with the given prefix.
     *
     * @param prefix - The prefix to filter the keys.
     * @param storage - The storage area to search for keys. Defaults to `chrome.storage.sync`.
     * @returns A promise that resolves to an array of keys that start with the specified prefix.
     */
    public static async getKeysByPrefix(prefix: string, storage = chrome.storage.sync): Promise<string[]> {
        const data = await storage.get(null);
        if (!data) {
            return [];
        }
        const keys = Object.keys(data).filter(key => key.startsWith(prefix));
        return keys;
    }

    /** Generate hash from string. 
     * From: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript */
    public static hashCode(toHash: string): string {
        let hash: number = 0, i: number, chr: number;
        if (toHash.length === 0) return hash.toString();
        for (i = 0; i < toHash.length; i++) {
            chr = toHash.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /** Convert string to utf 16 byte array.  */
    public static stringToUTF16Bytes(str: string): number[] {
        const bytes: number[] = [];
        for (let i = 0; i < str.length; ++i) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    /** Convert utf 16 byte array to string */
    public static utf16BytesToString(bytes: number[]): string {
        let res: string = "";
        bytes.forEach(e => {
            res = res.concat(String.fromCharCode(e));
        });
        return res;
    }

    /** Generate a random hash */
    public static generateHash(): string {
        return StorageHelper.hashCode(Math.random().toString());
    }

}

StorageHelper.init();