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

        // Save metadata
        await chrome.storage.sync.set({ [`workspace_metadata_${workspace.uuid}`]: syncData.metadata });

        // Save tabs in chunks to avoid exceeding QUOTA_BYTES_PER_ITEM
        const tabChunks: string[][] = SyncWorkspaceStorage.chunkArray(syncData.tabs, SyncWorkspaceStorage.SYNC_QUOTA_BYTES_PER_ITEM);
        for (let i = 0; i < tabChunks.length; i++) {
            await chrome.storage.sync.set({ [`workspace_tabs_${workspace.uuid}_${i}`]: tabChunks[i] });
        }

        // Save tab groups
        await chrome.storage.sync.set({ [`workspace_tab_groups_${workspace.uuid}`]: syncData.tabGroups });
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
        DebounceUtil.debounce(() => SyncWorkspaceStorage.saveWorkspaceToSync(workspace), 60000); // 1 minute debounce
    }
}

export { SyncData, SyncWorkspaceStorage, WorkspaceMetadata };
