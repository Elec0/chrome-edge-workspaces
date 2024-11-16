import { WorkspaceStorage } from '../workspace-storage';

/**
 * Utility class for workspace operations.
 */
export class WorkspaceUtils {
    /**
     * Compares two WorkspaceStorage instances and returns a new WorkspaceStorage
     * containing only the most up-to-date workspaces.
     * 
     * @param localStorage - The local WorkspaceStorage instance.
     * @param syncStorage - The sync WorkspaceStorage instance.
     * @returns A new WorkspaceStorage instance with the most up-to-date workspaces.
     */
    public static mergeWorkspaceStorages(localStorage: WorkspaceStorage, syncStorage: WorkspaceStorage): WorkspaceStorage {
        const mergedStorage = new WorkspaceStorage();

        const allKeys = new Set([...localStorage.keys(), ...syncStorage.keys()]);

        allKeys.forEach(key => {
            const localWorkspace = localStorage.get(key);
            const syncWorkspace = syncStorage.get(key);

            if (localWorkspace && syncWorkspace) {
                mergedStorage.set(key, localWorkspace.lastUpdated > syncWorkspace.lastUpdated ? localWorkspace : syncWorkspace);
            } else if (localWorkspace) {
                mergedStorage.set(key, localWorkspace);
            } else if (syncWorkspace) {
                mergedStorage.set(key, syncWorkspace);
            }
        });

        return mergedStorage;
    }
}