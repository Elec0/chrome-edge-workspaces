import { Constants } from "../constants/constants";
import { LogHelper } from "../log-helper";
import { TabGroupStub } from "../obj/tab-group-stub";
import { TabStub } from "../obj/tab-stub";
import { Workspace } from "../obj/workspace";
import { StorageHelper } from "../storage-helper";
import { ChunkUtil } from "../utils/chunk";
import { DebounceUtil } from "../utils/debounce";
import { WorkspaceStorage } from "../workspace-storage";

interface WorkspaceMetadata {
    uuid: string;
    name: string;
    windowId: number;
    lastUpdated: number;
    numTabChunks: number;
}

export interface SyncData {
    metadata: WorkspaceMetadata;
    tabs: string[];
    tabGroups: string[];
}

export interface SyncWorkspaceTombstone {
    uuid: string;
    timestamp: number;
}

/**
 * To implement syncing to Chrome's `sync` storage while adhering to the quota and rate limits, we need to design a data structure that is both efficient and compliant with the constraints.
 * 
 * ### Data Structure Format
 * 1. **Workspace Metadata**:
 *     - Store metadata about each workspace separately from the actual tab data. This metadata includes the workspace name, UUID, and window ID.
 *     - Key: `workspace_metadata`
 *     - Value: An array of objects, each representing a workspace's metadata.
 * 
 * 2. **Workspace Tabs**:
 *    - Store the tabs for each workspace in separate items to avoid exceeding the `QUOTA_BYTES_PER_ITEM` limit.
 *    - Key: `workspace_tabs_<uuid>_<index>`
 *    - Value: An object containing an array of tab stubs.
 * 
 * 3. **Workspace Tab Groups**:
 *    - Store the tab groups for each workspace in separate items.
 *    - Key: `workspace_tab_groups_<uuid>`
 *    - Value: An array of tab group stubs.
 * 
 * ### Sync Strategy
 * To ensure we do not exceed the rate limits, we will implement a debouncing mechanism for saving data to `sync` storage. This will aggregate multiple changes and perform a single save operation within a specified time window.
 * 
 * ### Summary
 * - **Metadata**: Store workspace metadata in a single item.
 * - **Tabs**: Store tabs in separate items, partitioned by workspace UUID and index.
 * - **Tab Groups**: Store tab groups in separate items, partitioned by workspace UUID.
 * - **Debouncing**: Implement a debouncing mechanism to control the frequency of write operations to `sync` storage.
 * 
 * This structure ensures that we stay within the `QUOTA_BYTES_PER_ITEM` limit and manage the rate of write operations effectively.
 */
export class SyncWorkspaceStorage {
    private static readonly SYNC_QUOTA_BYTES_PER_ITEM = Math.floor(chrome.storage.sync.QUOTA_BYTES_PER_ITEM * 0.9); // Reduce by 90%
    private static readonly SYNC_MAX_WRITE_OPERATIONS_PER_HOUR = 1800;
    private static readonly SYNC_MAX_WRITE_OPERATIONS_PER_MINUTE = 120;
    private static readonly SYNC_PREFIX_METADATA = 'workspace_metadata_';
    private static readonly SYNC_PREFIX_TABS = 'workspace_tabs_';
    private static readonly SYNC_PREFIX_TAB_GROUPS = 'workspace_tab_groups_';

    /**
     * Converts a Workspace object to the new data structure for sync storage.
     * @param workspace - The Workspace object to convert.
     */
    private static convertWorkspaceToSyncData(workspace: Workspace): SyncData {
        const metadata: WorkspaceMetadata = {
            uuid: workspace.uuid,
            name: workspace.name,
            windowId: workspace.windowId,
            lastUpdated: workspace.lastUpdated,
            numTabChunks: -1, // This will be set when the tabs are chunked
        };

        const tabs: string[] = SyncWorkspaceStorage.convertWorkspaceTabsForSaving(workspace.getTabs());
        const tabGroups: string[] = workspace.getTabGroups().map(group => group.toJson());

        return { metadata, tabs, tabGroups };
    }

    /**
     * Converts an array of TabStub objects to an array of JSON strings.
     * 
     * To save on storage space, we are going to throw out some of the data that we don't need:
     * - `favIconUrl` - We don't need this for syncing, and it can be quite large.
     */
    private static convertWorkspaceTabsForSaving(tabs: TabStub[]): string[] {
        return tabs.map(tab => {
            // Remove the favIconUrl property by using a replacer function, passed to `.toJson`
            return tab.toJson((key, value) => {
                if (key === "favIconUrl") {
                    return undefined;
                }
                return value;
            });
        });
    }

    /**
     * Converts a SyncData object to a Workspace object.
     * @param syncData - The SyncData object to convert.
     */
    private static convertSyncDataToWorkspace(syncData: SyncData): Workspace {
        const workspace = new Workspace(syncData.metadata.windowId, syncData.metadata.name);
        workspace.uuid = syncData.metadata.uuid;
        workspace.lastUpdated = syncData.metadata.lastUpdated;

        for (const tabJson of syncData.tabs) {
            workspace.addTab(TabStub.fromJson(tabJson));
        }

        for (const groupJson of syncData.tabGroups) {
            workspace.addTabGroup(TabGroupStub.fromJson(groupJson));
        }

        return workspace;
    }

    /**
     * Saves a Workspace object to Chrome's sync storage.
     * @param workspace - The Workspace object to save.
     */
    private static async saveWorkspaceToSync(workspace: Workspace): Promise<void> {
        console.debug("Saving workspace to sync storage", workspace);

        const writeObject = this.createSyncWorkspaceWriteObject(workspace);

        try {
            // Perform the write operation
            await chrome.storage.sync.set(writeObject);
        }
        catch (e) {
            console.error("Error saving workspace to sync storage:", e);
            console.trace();
            console.log("Write object with error:", writeObject);
        }
    }

    /**
     * Creates a write object for saving a workspace to sync storage.
     * @param workspace - The Workspace object to save.
     * @param writeObject - An optional accumulator object for storing the write data.
     * @returns An object containing the data to write to sync storage.
     */
    private static createSyncWorkspaceWriteObject(workspace: Workspace, writeObject: { [key: string]: unknown } = {}): { [key: string]: unknown } {
        const syncData: SyncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);

        // Save tabs in chunks to avoid exceeding QUOTA_BYTES_PER_ITEM
        const tabChunks: string[][] = ChunkUtil.chunkArray(syncData.tabs, SyncWorkspaceStorage.SYNC_QUOTA_BYTES_PER_ITEM);
        for (let i = 0; i < tabChunks.length; i++) {
            writeObject[`${ this.SYNC_PREFIX_TABS }${ workspace.uuid }_${ i }`] = tabChunks[i];
        }

        // Update metadata with the number of tab chunks
        syncData.metadata.numTabChunks = tabChunks.length;
        // Save metadata
        writeObject[this.getMetadataKey(workspace.uuid)] = syncData.metadata;

        // Save tab groups
        writeObject[this.getTabGroupsKey(workspace.uuid)] = syncData.tabGroups;

        return writeObject;
    }

    /**
     * Saves all workspaces in the WorkspaceStorage object to Chrome's sync storage.
     */
    public static async setAllSyncWorkspaces(workspaceStorage: WorkspaceStorage): Promise<void> {
        console.debug("Saving all workspaces to sync storage");
        const writeObject: { [key: string]: unknown } = {};

        workspaceStorage.forEach((workspace) => {
            SyncWorkspaceStorage.createSyncWorkspaceWriteObject(workspace, writeObject);
        });

        try {
            // Perform the write operation
            await chrome.storage.sync.set(writeObject);
        }
        catch (e) {
            console.error("Error saving workspaces to sync storage:", e);
            console.trace();
            console.log("Write object with error:", writeObject);
        }
    }

    /**
     * Retrieves a workspace from Chrome's sync storage using the provided ID.
     * 
     * @param id - The ID of the workspace to retrieve. Can be a string or number.
     * @returns A promise that resolves to the retrieved Workspace object, or null if the workspace could not be found or an error occurred.
     * 
     * @remarks
     * This function reads metadata, tab groups, and tab chunks from Chrome's sync storage.
     * If the number of tab chunks is not set in the metadata, an error is logged and null is returned.
     * The function retrieves all tab chunks in a single read operation and combines them into a single array.
     * The resulting Workspace object includes tabs and tab groups.
     */
    public static async getWorkspaceFromSync(id: string | number): Promise<Workspace | null> {
        const syncData = await SyncWorkspaceStorage.getSyncData(id.toString());
        if (!syncData) {
            return null;
        }

        const workspace = SyncWorkspaceStorage.convertSyncDataToWorkspace(syncData);

        return workspace;
    }

    /**
     * Retrieves all workspaces from the synchronized storage.
     *
     * This method fetches all synchronized data and converts each entry
     * into a `Workspace` object.
     * 
     * @returns A promise that resolves to a `WorkspaceStorage` object containing all synchronized workspaces.
     */
    public static async getAllSyncWorkspaces(): Promise<WorkspaceStorage> {
        const syncData = await SyncWorkspaceStorage.getAllSyncData();
        const workspaceStorage = new WorkspaceStorage();

        for (const data of syncData) {
            const workspace = SyncWorkspaceStorage.convertSyncDataToWorkspace(data);
            workspaceStorage.set(workspace.uuid, workspace);
        }
        return workspaceStorage;
    }

    /**
     * Delete a workspace from sync storage.
     * @param id - The ID of the workspace to delete.
     */
    public static async deleteWorkspaceFromSync(id: string | number): Promise<void> {
        const data = await SyncWorkspaceStorage.getData(id.toString());
        if (!data) {
            console.warn(`Deleting workspace ${ id }, but not found in sync storage.`);
            return;
        }

        const keysToDelete: string[] = [this.getMetadataKey(id.toString()), this.getTabGroupsKey(id.toString())];

        // Remove tab chunks
        // Continue with deletion even if the number of tab chunks is not set, to help clean up any potentially orphaned data
        if (data.metadata.numTabChunks == -1) {
            LogHelper.errorAlert("Number of tab chunks for workspace is not set in sync storage metadata. If you see this message repeatedly, please file a bug report.");
        }

        for (let chunkIndex = 0; chunkIndex < data.metadata.numTabChunks; chunkIndex++) {
            keysToDelete.push(`${ this.SYNC_PREFIX_TABS }${ id }_${ chunkIndex }`);
        }
        try {
            await chrome.storage.sync.remove(keysToDelete);
            console.info(`Deleted workspace ${ id } from sync storage.`);
        }
        catch (e) {
            console.error("Error deleting workspace from sync storage:", e);
            console.log("Keys to delete with error:", keysToDelete);
        }

        await this.createTombstone(data.metadata.uuid);
    }

    /**
     * Create a tombstone for a workspace in sync storage.
     * 
     * If we run out of space in the single key we store tombstones in, remove the oldest tombstone.
     */
    private static async createTombstone(uuid: string): Promise<void> {
        const tombstone: SyncWorkspaceTombstone = {
            uuid: uuid,
            timestamp: Date.now(),
        };

        const key = Constants.STORAGE_KEYS.sync.tombstones;
        const tombstones = await chrome.storage.sync.get(key);
        let tombstoneArray: SyncWorkspaceTombstone[] = tombstones[key] as SyncWorkspaceTombstone[] || [];

        tombstoneArray.push(tombstone);

        // Sort tombstones by timestamp in descending order
        tombstoneArray.sort((a, b) => b.timestamp - a.timestamp);

        // Limit the number of tombstones to the maximum allowed
        if (tombstoneArray.length > 100) {
            tombstoneArray = tombstoneArray.slice(0, 100);
        }

        try {
            await chrome.storage.sync.set({ [key]: tombstoneArray });
        }
        catch (e) {
            console.error("Error creating tombstone in sync storage:", e);
            console.log("Tombstone with error:", tombstone);
        }

        console.info(`Created tombstone for workspace ${ uuid }.`);
    }

    public static async getTombstones(): Promise<SyncWorkspaceTombstone[]> {
        const key = Constants.STORAGE_KEYS.sync.tombstones;
        const tombstones = await chrome.storage.sync.get(key);
        return tombstones[key] as SyncWorkspaceTombstone[] || [];
    }

    /**
     * Retrieves synchronized data for a given workspace ID.
     * 
     * @param id - The unique identifier of the workspace.
     * @returns A promise that resolves to the synchronized data (`SyncData`) or `null` if the data is not found or an error occurs.
     * 
     * @remarks
     * This method retrieves metadata and tab groups from the synchronized storage. It also handles the retrieval of tab chunks in multiple read operations and combines them into a single array.
     * 
     * If the number of tab chunks is not set in the metadata, an error is logged and `null` is returned.
     */
    private static async getSyncData(id: string): Promise<SyncData | null> {
        const data = await SyncWorkspaceStorage.getData(id.toString());
        if (!data) {
            return null;
        }

        const metadata = data.metadata;

        if (metadata.numTabChunks == -1) {
            LogHelper.errorAlert("Number of tab chunks for workspace is not set in sync storage metadata. Cannot load workspace.");
            return null;
        }

        // Retrieve tabs in chunks
        const tabChunkKeys: string[] = [];

        for (let chunkIndex = 0; chunkIndex < metadata.numTabChunks; chunkIndex++) {
            const tabChunkKey = `${ this.SYNC_PREFIX_TABS }${ id }_${ chunkIndex }`;
            tabChunkKeys.push(tabChunkKey);
        }

        // Perform the read operation only once to retrieve all tab chunks
        const tabChunks = await chrome.storage.sync.get(tabChunkKeys);

        const tabs: string[][] = [];
        for (const key of tabChunkKeys) {
            if (!tabChunks[key]) {
                LogHelper.warn(`Tab chunk ${ key } is missing from sync storage.`);
                continue;
            }
            tabs.push(tabChunks[key]);
        }

        // Combine the tab chunks into a single array
        const combinedTabs = ChunkUtil.unChunkArray(tabs);
        data.tabs = combinedTabs;

        return data;
    }

    /**
     * Retrieves synchronized workspace data from Chrome's storage.
     * 
     * **Note**: This method does not retrieve the tabs for the workspace. Only the metadata and tab groups are retrieved.
     * 
     * Helper function to handle the null checks in one place.
     * 
     * @param id - The unique identifier for the workspace data to retrieve.
     * @returns A promise that resolves to the synchronized data, or null if the data is not found.
     * 
     * The returned data includes:
     * - `metadata`: The workspace metadata.
     * - `tabGroups`: An array of tab group identifiers.
     * - `tabs`: An empty array.
     */
    private static async getData(id: string): Promise<SyncData | null> {
        const metadataKey = this.getMetadataKey(id);
        const tabGroupsKey = this.getTabGroupsKey(id);

        const data = await chrome.storage.sync.get([metadataKey, tabGroupsKey]);

        if (!data || !data[metadataKey] || !data[tabGroupsKey]) {
            return null;
        }

        return {
            metadata: data[metadataKey] as WorkspaceMetadata,
            tabGroups: data[tabGroupsKey] as string[],
            tabs: [], // Tabs are not retrieved here. Returning an empty array to work with the interface.
        };
    }

    private static getMetadataKey(id: string): string {
        return `${ this.SYNC_PREFIX_METADATA }${ id }`;
    }
    private static getTabGroupsKey(id: string): string {
        return `${ this.SYNC_PREFIX_TAB_GROUPS }${ id }`;
    }

    /**
     * Retrieves all synchronized workspace data from Chrome's storage.
     * 
     * This method is mainly used for initial loading of the popup. Incremental saving and loading of workspaces is handled by the 
     * `saveWorkspaceToSync` and `getWorkspaceFromSync` methods.
     */
    public static async getAllSyncData(): Promise<Array<SyncData>> {
        const keys = await StorageHelper.getKeysByPrefix(this.SYNC_PREFIX_METADATA);
        const data: Array<SyncData> = [];

        for (const key of keys) {
            const uuid = key.replace(this.SYNC_PREFIX_METADATA, '');
            const syncData = await this.getSyncData(uuid);
            if (syncData) {
                data.push(syncData);
            }
        }

        return data;
    }

    /**
     * Compare the timestamps of local and sync data to determine which one is more recent.
     * Consider the local data as more recent if the timestamps are equal.
     * 
     * Note that this method is called very frequently.
     * @param localData - The local workspace data.
     * @param syncData - The sync workspace data.
     * @returns The more recent workspace data.
     */
    public static getMoreRecentWorkspace(localData: Workspace, syncData: Workspace, log = false): Workspace {
        let result = syncData;
        let which = "Sync";

        if (localData.lastUpdated >= syncData.lastUpdated) {
            result = localData;
            which = "Local";
        }
        if (log) {
            console.debug(`${ which } "${ localData.name }" workspace is more recent. localUpdated: ${ localData.lastUpdated }, syncUpdated: ${ syncData.lastUpdated }`);
        }
        return result;
    }

    /**
     * Debounced method to save a workspace to sync storage.
     * @param workspace - The Workspace object to save.
     */
    public static debounceSaveWorkspaceToSync(workspace: Workspace): void {
        DebounceUtil.debounce(Constants.DEBOUNCE_IDS.saveWorkspaceToSync,
            () => SyncWorkspaceStorage.saveWorkspaceToSync(workspace), 60000); // 1 minute debounce
    }

    /**
     * Debounced method to save all workspaces to sync storage.
     * @param workspaceStorage - The WorkspaceStorage object containing all workspaces to save.
     */
    public static debounceSaveAllWorkspacesToSync(workspaceStorage: WorkspaceStorage): void {
        DebounceUtil.debounce(Constants.DEBOUNCE_IDS.saveAllWorkspacesToSync,
            () => SyncWorkspaceStorage.setAllSyncWorkspaces(workspaceStorage), 10000); // 10 second debounce
    }

    /**
     * Immediately save a workspace to sync storage, skipping the debounce.
     * Don't use this method for frequent calls, as it may exceed the rate limits.
     * It's intended for one-off calls, such as when the user explicitly requests a sync, or 
     * when the window is closing.
     */
    public static async immediatelySaveWorkspaceToSync(workspace: Workspace): Promise<void> {
        console.debug("Immediately saving workspace to sync storage");
        await SyncWorkspaceStorage.saveWorkspaceToSync(workspace);
    }

    /**
     * Check if the user has enabled saving bookmarks.
     * @returns A Promise that resolves to a boolean indicating if saving bookmarks is enabled.
     *          Defaults to true if the setting is not found.
     */
    public static async isSyncSavingEnabled(): Promise<boolean> {
        const value = await StorageHelper.getValue(Constants.STORAGE_KEYS.settings.saveSync, "true");
        return value === "true";
    }

    /**
     * Set the user's preference for syncing.
     * @param value - The new value for the setting.
     */
    public static async setSyncSavingEnabled(value: boolean): Promise<void> {
        await StorageHelper.setValue(Constants.STORAGE_KEYS.settings.saveSync, value.toString());
    }

    /**
     * Retrieve all of the workspace UUIDs from the sync storage.
     * 
     * Get all workspace metadata keys, then extract the UUIDs from the keys.
     */
    public static async getAllSyncWorkspaceUUIDs(): Promise<string[]> {
        const keys = await StorageHelper.getKeysByPrefix(this.SYNC_PREFIX_METADATA);
        return keys.map(key => key.replace(this.SYNC_PREFIX_METADATA, ''));
    }

    public static async debug_getSyncData(): Promise<void> {
        const data = await chrome.storage.sync.get(null);
        console.debug("Sync data", data);
    }
}
