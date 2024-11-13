import { Constants } from "../constants/constants";
import { LogHelper } from "../log-helper";
import { TabGroupStub } from "../obj/tab-group-stub";
import { TabStub } from "../obj/tab-stub";
import { Workspace } from "../obj/workspace";
import { StorageHelper } from "../storage-helper";
import { ChunkUtil } from "../utils/chunk";
import { DebounceUtil } from "../utils/debounce";

interface WorkspaceMetadata {
    uuid: string;
    name: string;
    windowId: number;
    lastUpdated: number;
    numTabChunks: number;
}

interface SyncData {
    metadata: WorkspaceMetadata;
    tabs: string[];
    tabGroups: string[];
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
class SyncWorkspaceStorage {
    private static readonly SYNC_QUOTA_BYTES_PER_ITEM = chrome.storage.sync.QUOTA_BYTES_PER_ITEM; // 8KB per item
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

        const tabs: string[] = workspace.getTabs().map(tab => tab.toJson());
        const tabGroups: string[] = workspace.getTabGroups().map(group => group.toJson());

        return { metadata, tabs, tabGroups };
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
        const syncData: SyncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        const writeObject: { [key: string]: unknown } = {};

        // Save tabs in chunks to avoid exceeding QUOTA_BYTES_PER_ITEM
        const tabChunks: string[][] = ChunkUtil.chunkArray(syncData.tabs, SyncWorkspaceStorage.SYNC_QUOTA_BYTES_PER_ITEM);
        for (let i = 0; i < tabChunks.length; i++) {
            writeObject[`${ this.SYNC_PREFIX_TABS }${ workspace.uuid }_${ i }`] = tabChunks[i];
        }

        // Update metadata with the number of tab chunks
        syncData.metadata.numTabChunks = tabChunks.length;
        // Save metadata
        writeObject[this.SYNC_PREFIX_METADATA + workspace.uuid] = syncData.metadata;

        // Save tab groups
        writeObject[this.SYNC_PREFIX_TAB_GROUPS + workspace.uuid] = syncData.tabGroups;

        // Perform the write operation
        await chrome.storage.sync.set(writeObject);
    }

    public static async getWorkspaceFromSync(id: string | number): Promise<Workspace | null> {
        const metadataKey = `${this.SYNC_PREFIX_METADATA}${id}`;
        const tabGroupsKey = `${this.SYNC_PREFIX_TAB_GROUPS}${id}`;

        const data = await chrome.storage.sync.get([metadataKey, tabGroupsKey]);

        if (!data[metadataKey] || !data[tabGroupsKey]) {
            return null;
        }

        const metadata = data[metadataKey] as WorkspaceMetadata;
        const tabGroups = data[tabGroupsKey] as string[];

        if (metadata.numTabChunks == -1) {
            LogHelper.errorAlert("Number of tab chunks for workspace is not set in sync storage metadata. Cannot load workspace.");
            return null;
        }

        // Retrieve tabs in chunks
        const tabChunkKeys: string[] = [];

        for(let chunkIndex = 0; chunkIndex < metadata.numTabChunks; chunkIndex++) {
            const tabChunkKey = `${this.SYNC_PREFIX_TABS}${id}_${chunkIndex}`;
            tabChunkKeys.push(tabChunkKey);
        }
        
        // Perform the read operation only once to retrieve all tab chunks
        const tabChunks = await chrome.storage.sync.get(tabChunkKeys);

        const tabs: string[][] = [];
        for (const key of tabChunkKeys) {
            if (!tabChunks[key]) {
                LogHelper.warn(`Tab chunk ${key} is missing from sync storage.`);
                continue;
            }
            tabs.push(tabChunks[key]);
        }

        // Combine the tab chunks into a single array
        const combinedTabs = ChunkUtil.unChunkArray(tabs);

        // Create the Workspace object
        const workspace = new Workspace(metadata.windowId, metadata.name, undefined, undefined, metadata.uuid);
        workspace.lastUpdated = metadata.lastUpdated;

        // Add tabs and tab groups to the workspace
        combinedTabs.forEach(tabJson => workspace.addTab(TabStub.fromJson(tabJson)));
        tabGroups.forEach(groupJson => workspace.addTabGroup(TabGroupStub.fromJson(groupJson)));

        return workspace;
    }

    public static async getAllSyncData(): Promise<Map<string | number, SyncData>> {
        return new Map();
    }

    /**
     * Compare the timestamps of local and sync data to determine which one is more recent.
     * @param localData - The local workspace data.
     * @param syncData - The sync workspace data.
     * @returns The more recent workspace data.
     */
    public static getMoreRecentData(localData: Workspace, syncData: SyncData): Workspace | SyncData {
        if (localData.lastUpdated > syncData.metadata.lastUpdated) {
            return localData;
        } else {
            return syncData;
        }
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

    public static async debug_getSyncData(): Promise<void> {
        const data = await chrome.storage.sync.get(null);
        console.debug("Sync data", data);
    }
}

export { SyncData, SyncWorkspaceStorage, WorkspaceMetadata };
