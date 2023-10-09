
export class StorageHelper {

    private static _storage = window.localStorage;

    public static init() {

    }

    public static getValue(key: string) {
        return this._storage.getItem(key);
    }

    public static setValue(key: string, val: string) {
        this._storage.setItem(key, val);
    }

    /**
     * Check if this is the user's first load into our page
     */
    public static isFirstLoad(): boolean {
        return this._storage.getItem("started") == null;
    }

    /** Delete everything we have in storage. */
    public static clearAllData() {
        this._storage.clear();
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