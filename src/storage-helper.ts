import { Constants } from "./constants";
import { Workspace } from "./obj/workspace";

export class StorageHelper {

    private static _storage = chrome.storage.local;
    private static _loadedWorkspaces: Map<number, Workspace> = new Map();

    public static async init() {
        console.log("StorageHelper init");
        console.debug(await this.getWorkspaces());

        console.debug("_storage dump:")
        console.debug(await this._storage.get(null));
    }

    /** 
     * Get the value of a key in storage.
     * @param {string} key - The key to get the value of.
     * @param {string} defaultValue - The default value to return if the key does not exist.
     * @returns {string} The value of the key, or the default value if the key does not exist.
     */
    public static async getValue(key: string, defaultValue: string = ""): Promise<string> {
        let result = await this._storage.get(key);
        console.debug(`Get ${ key }=`);
        console.debug(result);
        return result[key] || defaultValue;
    }

    public static setValue(key: string, val: string): Promise<void> {
        return this._storage.set({ [key]: val });
    }

    public static getSyncValue(key: string, callback: Function): void {
        chrome.storage.sync.get(key, function (result) {
            callback(result[key]);
        });
    }

    public static setSyncValue(key: string, val: string) {
        chrome.storage.sync.set({ [key]: val }, function () {
            console.log(`Set ${ key }=${ val }`);
        });
    }

    /**
     * Get the workspaces from storage.
     * @returns A promise that resolves to a map of workspaces, or an empty object if no workspaces exist.
     */
    private static async getWorkspaces(): Promise<Map<number, Workspace>> {
        let workspacesJson: any = JSON.parse(await this.getValue(Constants.KEY_STORAGE_WORKSPACES, "{}"));
        let workspaces: Map<number, Workspace> = new Map();
        for (let key in workspacesJson) {
            workspaces.set(parseInt(key), Workspace.fromJson(workspacesJson[key]));
        }
        return workspaces;
    }

    /**
     * Set the workspaces in storage. Used for saving the entire workspace map.
     * @param workspaces The workspaces to save.
     */
    private static async setWorkspaces(workspaces: Map<number, Workspace>) {
        // Stringify can't handle Maps, so we convert to an array of key-value pairs.
        await this.setValue(Constants.KEY_STORAGE_WORKSPACES, JSON.stringify(Array.from(workspaces.entries())));
    }

    /**
     * Add a new workspace to storage.
     * We assume the window has no tabs, since it was just created.
     * 
     * @param workspaceName User provided name for the workspace.
     * @param window Chrome window object.
     * @returns A promise that resolves to true if the workspace was added successfully, or rejects if the workspace could not be added.
     */
    public static async addWorkspace(workspaceName: string, windowId: number): Promise<boolean> {
        console.debug("addWorkspace: ", workspaceName, windowId);
        if (windowId == null || windowId == undefined) {
            return Promise.resolve(false) // reject("Window id is null or undefined");
        }

        let workspaces = await this.getWorkspaces();
        workspaces.set(windowId, new Workspace(windowId, workspaceName, []));
        await this.setWorkspaces(workspaces);

        return Promise.resolve(true);
    }

    public static async removeWorkspace(windowId: number): Promise<boolean> {
        let workspaces = await this.getWorkspaces();
        if (workspaces.delete(windowId)) {
            await this.setWorkspaces(workspaces);
            return Promise.resolve(true);
        }
        return Promise.reject("Workspace does not exist");

    }

    /**
     * Determine if a window is a workspace, meaning a workspace's window id is equal to the window id.
     */
    public static async isWindowWorkspace(windowId: number): Promise<boolean> {
        let workspaceWindows = await this.getWorkspaces();
        return windowId in workspaceWindows;
    }

    /**
     * Check if this is the user's first load into our page
     */
    // public static isFirstLoad(): boolean {
    //     return this._storage.getItem("started") == null;
    // }

    // /** Delete everything we have in storage. */
    // public static clearAllData() {
    //     this._storage.clear();
    // }

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
    };

    /** Convert string to utf 16 byte array.  */
    public static stringToUTF16Bytes(str: string): number[] {
        let bytes: number[] = [];
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