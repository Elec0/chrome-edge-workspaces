import { Constants } from "./constants/constants";
import { MessageResponse } from "./constants/message-responses";
import { Workspace } from "./obj/workspace";
import { Utils } from "./utils";
import { WorkspaceStorage } from "./workspace-storage";

export class StorageHelper {

    private static _storage = chrome.storage.local;
    private static _loadedWorkspaces: WorkspaceStorage = new WorkspaceStorage();

    public static async init() {
        if (Utils.areWeTestingWithJest())
            return;

        // console.log("StorageHelper init");
        // console.debug(await this.getWorkspaces());

        // console.debug("_storage dump:")
        // console.debug(await this._storage.get(null));
    }

    /** 
     * Get the value of a key in storage.
     * @param key - The key to get the value of.
     * @param defaultValue - The default value to return if the key does not exist.
     * @returns The value of the key, or the default value if the key does not exist.
     */
    public static async getValue(key: string, defaultValue: string = ""): Promise<string> {
        const result = await this._storage.get(key);
        console.debug(`Get ${ key }:`, result);
        return result[key] || defaultValue;
    }

    public static setValue(key: string, val: string): Promise<void> {
        console.log(`Set ${ key }: ${ val }`);
        return this._storage.set({ [key]: val });
    }

    public static getSyncValue(key: string, callback: (value: unknown) => void): void {
        chrome.storage.sync.get(key, function (result) {
            callback(result[key]);
        });
    }

    public static setSyncValue(key: string, val: string) {
        chrome.storage.sync.set({ [key]: val }, function () {
            console.log(`Set ${ key }: ${ val }`);
        });
    }

    /**
     * Get the workspaces from storage.
     * @returns A promise that resolves to a map of workspaces, or an empty object if no workspaces exist.
     */
    public static async getWorkspaces(): Promise<WorkspaceStorage> {
        return this._loadedWorkspaces;

        // return this.workspacesFromJson(await this.getValue(Constants.KEY_STORAGE_WORKSPACES, "{}"));
    }

    public static workspacesFromJson(json: MessageResponse): WorkspaceStorage {
        const workspaceStorage = new WorkspaceStorage();
        workspaceStorage.deserialize(json.data);
        return workspaceStorage;
    }

    /**
     * Get a single workspace from the `workspaces` map.
     * The workspace must exist in the map or the promise will reject.
     * @param id - The id of the workspace to get.
     * @returns A promise that resolves to the workspace, or rejects if the workspace does not exist.
     */
    public static async getWorkspace(id: string | number): Promise<Workspace> {
        const workspaces = await this.getWorkspaces();
        if (workspaces.has(id)) {
            return Promise.resolve(workspaces.get(id) as Workspace);
        }
        return Promise.reject(`getWorkspace: Workspace does not exist with id ${ id }`);
    }

    /**
     * Set a single workspace in the `workspaces` map.
     * Will overwrite the workspace if it already exists, and add it if it does not.
     * @param workspace - The workspace to set.
     */
    public static async setWorkspace(workspace: Workspace): Promise<void> {
        const workspaces = await this.getWorkspaces();
        workspaces.set(workspace.uuid, workspace);
        // await this.setWorkspaces(workspaces);
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
        workspaces.set(newWorkspace.uuid, newWorkspace);
        // await this.setWorkspaces(workspaces);

        return Promise.resolve(true);
    }

    public static async removeWorkspace(uuid: string): Promise<boolean> {
        const workspaces = await this.getWorkspaces();
        if (workspaces.delete(uuid)) {
            // await this.setWorkspaces(workspaces);
            return Promise.resolve(true);
        }
        return Promise.reject("Workspace does not exist");

    }

    /**
     * Determine if a window is in a workspace, meaning a workspace's window id is equal to the window id.
     */
    public static async isWindowWorkspace(windowId: number): Promise<boolean> {
        const workspaceWindows = await this.getWorkspaces();
        for (const workspace of Array.from(workspaceWindows.values())) {
            if (workspace.windowId === windowId) {
                return true;
            }
        }
        return false;
    }

    /** Delete everything we have in storage. */
    public static clearAllData() {
        this._storage.clear();
        console.log("Cleared all data");
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