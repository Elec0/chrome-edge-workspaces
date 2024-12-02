import { Workspace } from "../obj/workspace";
import { SyncWorkspaceStorage, SyncWorkspaceTombstone } from "../storage/sync-workspace-storage";
import { WorkspaceStorage } from '../workspace-storage';

/**
 * Utility class for workspace operations.
 */
export class WorkspaceUtils {
    /**
     * Instead of marking workspaces as deleted, we can replace them with a lightweight "tombstone" object that contains only the workspace ID and a deletion timestamp. 
     * This way, the sync storage would only store active workspaces and tombstones, which are much smaller in size than the actual workspace data. 
     * 
     * During synchronization, machines would check for tombstones and remove the corresponding workspaces from their local storage, if they exist.
     * In the case of a conflict during deletion, the user will be prompted to choose whether to keep the workspace or delete it.
     * 
     * @param conflictResolver - A function that resolves conflicts between local workspaces and tombstones. Return true to keep the workspace, false to delete it.
     * @returns The updated local and sync storage instances.
     */
    public static syncWorkspaces(localStorage: WorkspaceStorage,
        syncStorage: WorkspaceStorage,
        syncStorageTombstones: SyncWorkspaceTombstone[],
        conflictResolver: (localWorkspace: Workspace, tombstone: SyncWorkspaceTombstone) => boolean
    ): [WorkspaceStorage, WorkspaceStorage] {
        // We need to check for tombstones and do local deletion before merging the workspaces, otherwise we will end up with deleted workspaces in the merged storage.
        syncStorageTombstones.forEach(tombstone => {
            if (localStorage.has(tombstone.uuid)) {
                const localWorkspace = localStorage.get(tombstone.uuid);

                if (localWorkspace != undefined && localWorkspace?.lastUpdated != undefined) {

                    // If the local workspace was last updated before the tombstone was deleted, we can safely delete it.
                    if (localWorkspace.lastUpdated <= tombstone.timestamp) {
                        console.debug(`Deleting workspace ${localWorkspace.name} (${ tombstone.uuid }) from local storage.`);
                        localStorage.delete(tombstone.uuid);
                        
                        if(syncStorage.has(tombstone.uuid)) {
                            console.warn(`Workspace ${localWorkspace.name} existed in sync storage with a tombstone present. Removing workspace.`);
                            syncStorage.delete(tombstone.uuid);
                        }
                    }
                    else {
                        // If the local workspace was updated after the tombstone was deleted, we need to prompt the user
                        console.warn(`Conflict detected for workspace ${ localWorkspace.name } (${ tombstone.uuid }).`);
                        const keepWorkspace = conflictResolver(localWorkspace, tombstone);
                        if (keepWorkspace) {
                            console.debug(`Keeping workspace ${ tombstone.uuid } in local storage.`);
                        }
                        else {
                            console.debug(`Deleting workspace ${ tombstone.uuid } from local storage.`);
                            localStorage.delete(tombstone.uuid);
                        }
                    }
                }
                else if (localWorkspace?.lastUpdated == undefined) {
                    // Local workspace is missing a last updated time, we can safely delete it.
                    console.debug(`Deleting workspace ${ tombstone.uuid } from local storage with no lastUpdated.`);
                    localStorage.delete(tombstone.uuid);
                }
            }
        });

        const allKeys = new Set([...localStorage.keys(), ...syncStorage.keys()]);

        allKeys.forEach(key => {
            const localWorkspace = localStorage.get(key);
            const syncWorkspace = syncStorage.get(key);

            if (localWorkspace && syncWorkspace) {
                if (SyncWorkspaceStorage.getMoreRecentWorkspace(localWorkspace, syncWorkspace) === localWorkspace) {
                    syncStorage.set(key, localWorkspace);
                }
                else {
                    localStorage.set(key, syncWorkspace);
                }
            }
            else if (localWorkspace) {
                syncStorage.set(key, localWorkspace);
            }
            else if (syncWorkspace) {
                localStorage.set(key, syncWorkspace);
            }
        });

        return [localStorage, syncStorage];
    }
}