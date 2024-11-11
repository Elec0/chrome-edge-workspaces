import { Workspace } from "../obj/workspace";
import { DebounceUtil } from "../utils/debounce";

interface WorkspaceMetadata {
    uuid: string;
    name: string;
    windowId: number;
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

    /**
     * Converts a Workspace object to the new data structure for sync storage.
     * @param workspace - The Workspace object to convert.
     */
    private static convertWorkspaceToSyncData(workspace: Workspace): SyncData {
        const metadata: WorkspaceMetadata = {
            uuid: workspace.uuid,
            name: workspace.name,
            windowId: workspace.windowId
        };

        const tabs: string[] = workspace.getTabs().map(tab => tab.toJson());
        const tabGroups: string[] = workspace.getTabGroups().map(group => group.toJson());

        return { metadata, tabs, tabGroups };
    }

    /**
     * Saves a Workspace object to Chrome's sync storage.
     * @param workspace - The Workspace object to save.
     */
    public static async saveWorkspaceToSync(workspace: Workspace): Promise<void> {
        const syncData: SyncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        const writeObject: {[key: string]: unknown} = {};
        // Save metadata
        writeObject[`workspace_metadata_${workspace.uuid}`] = syncData.metadata;

        // Save tabs in chunks to avoid exceeding QUOTA_BYTES_PER_ITEM
        const tabChunks: string[][] = SyncWorkspaceStorage.chunkArray(syncData.tabs, SyncWorkspaceStorage.SYNC_QUOTA_BYTES_PER_ITEM);
        for (let i = 0; i < tabChunks.length; i++) {
            writeObject[`workspace_tabs_${workspace.uuid}_${i}`] = tabChunks[i];
        }

        // Save tab groups
        writeObject[`workspace_tab_groups_${workspace.uuid}`] = syncData.tabGroups;

        // Perform the write operation
        await chrome.storage.sync.set(writeObject);
    }

    /**
     * Chunks an array into smaller arrays, each with a maximum byte size.
     * @param array - The array to chunk.
     * @param maxBytes - The maximum byte size for each chunk.
     */
    private static chunkArray<T>(array: T[], maxBytes: number): T[][] {
        const chunks: T[][] = [];
        let currentChunk: T[] = [];
        let currentChunkSize = 0;

        for (const item of array) {
            const itemSize = new Blob([JSON.stringify(item)]).size;
            if (currentChunkSize + itemSize > maxBytes) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentChunkSize = 0;
            }
            currentChunk.push(item);
            currentChunkSize += itemSize;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    /**
     * Debounced method to save a workspace to sync storage.
     * @param workspace - The Workspace object to save.
     */
    public static debounceSaveWorkspaceToSync(workspace: Workspace): void {
        // TODO: Current implementation of debounce doesn't work for multiple callbacks.
        DebounceUtil.debounce(() => SyncWorkspaceStorage.saveWorkspaceToSync(workspace), 60000); // 1 minute debounce
    }
}

export { SyncData, SyncWorkspaceStorage, WorkspaceMetadata };
