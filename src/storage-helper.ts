
export class StorageHelper {

    // private static _storage = window.localStorage;

    public static init() {

    }

    /** 
     * Get the value of a key in storage.
     * @param {string} key - The key to get the value of.
     * @param {string} defaultValue - The default value to return if the key does not exist.
     * @returns {string} The value of the key, or the default value if the key does not exist.
     */
    public static async getValue(key: string, defaultValue: string = ""): Promise<string> {
        let result = await chrome.storage.local.get([key]);
        console.log(`Get ${key}=`);
        console.log(result, result[key]);
        return result[key] || defaultValue;
    }

    public static setValue(key: string, val: string) {
        chrome.storage.local.set({ key: val }).then((val) => {
            console.log(`Set ${key}=${val}`);
        });
    }

    public static getSyncValue(key: string, callback: Function): void {
        chrome.storage.sync.get([key], function (result) {
            callback(result[key]);
        });
    }

    public static setSyncValue(key: string, val: string) {
        chrome.storage.sync.set({ key: val }, function () {
            console.log(`Set ${key}=${val}`);
        });
    }

    // export function addWindowToWorkspace(windowId, workspaceName) {
    //     chrome.storage.sync.get(['workspaceWindows'], function (result) {
    //         console.log('Value currently is ' + result.workspaceWindows);
    
    //         if (result.workspaceWindows) {
    //             result.workspaceWindows[windowId] = workspaceName;
    //         } else {
    //             result.workspaceWindows = {windowId: workspaceName};          
    //         }
    
    //         chrome.storage.sync.set({ workspaceWindows: result.workspaceWindows }, function () {
    //             console.log('Value is set to ' + result.workspaceWindows);
    //         });
    //     });
    // }
    public static async addWindowToWorkspace(windowId: number, workspaceName: string) {
        let workspaceWindows = JSON.parse(await this.getValue("workspaceWindows", "{}"));
        workspaceWindows[windowId] = workspaceName;
        
        this.setValue("workspaceWindows", JSON.stringify(workspaceWindows));
    }
    
    public static async removeWindowFromWorkspace(windowId: number) {
        let workspaceWindows = JSON.parse(await this.getValue("workspaceWindows", "{}"));
        delete workspaceWindows[windowId];
        this.setValue("workspaceWindows", JSON.stringify(workspaceWindows));
    }

    public static async isWindowWorkspace(windowId: number): Promise<boolean> {
        let workspaceWindows = JSON.parse(await this.getValue("workspaceWindows", "{}"));
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