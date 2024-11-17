import { SyncWorkspaceTombstone } from "../../../storage/sync-workspace-storage";
import { WorkspaceUtils } from "../../../utils/workspace-utils";
import { WorkspaceStorage } from "../../../workspace-storage";

describe('WorkspaceUtils', () => {
    let localStorage;
    let syncStorage;
    let syncStorageTombstones;

    beforeEach(() => {
        localStorage = new WorkspaceStorage();
        syncStorage = new WorkspaceStorage();
        syncStorageTombstones = [];

        jest.restoreAllMocks();
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    describe('syncWorkspaces', () => {
        it('should delete local workspaces that have a corresponding tombstone', () => {
            const localWorkspace = { uuid: '1', lastUpdated: 1 };
            const tombstone = { uuid: '1', timestamp: 2 };
            const syncWorkspace = { uuid: '2', lastUpdated: 10 };

            localStorage.set('1', localWorkspace);
            localStorage.set('2', syncWorkspace);
            syncStorageTombstones.push(tombstone);
            syncStorage.set('2', syncWorkspace);

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedLocalStorage.has('1')).toBe(false);
            expect(updatedSyncStorage.has('2')).toBe(true); // Should not be affected
        });

        // TODO: Ensure this is still a valid test after implementing user prompt
        it('should keep local workspaces that are more recent than the tombstone', () => {
            const localWorkspace = { uuid: '1', lastUpdated: 3 };
            const tombstone = { uuid: '1', timestamp: 2 };

            localStorage.set('1', localWorkspace);
            syncStorageTombstones.push(tombstone);

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedLocalStorage.get('1')).toEqual(localWorkspace);
        });

        it('should merge storages and keep the more up-to-date workspace in local storage', () => {
            const localWorkspace = { uuid: '1', lastUpdated: 2 };
            const syncWorkspace = { uuid: '1', lastUpdated: 1 };

            localStorage.set('1', localWorkspace);
            localStorage.set('2', { uuid: '2', lastUpdated: 10 });
            syncStorage.set('1', syncWorkspace);
            syncStorage.set('3', { uuid: '3', lastUpdated: 5 });

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedSyncStorage.get('1')).toEqual(localWorkspace);
            expect(updatedLocalStorage.get('1')).toEqual(localWorkspace);
        });
        it('should merge storages and keep the more up-to-date workspace in sync storage', () => {
            const localWorkspace = { uuid: '1', lastUpdated: 1 };
            const syncWorkspace = { uuid: '1', lastUpdated: 2 };

            localStorage.set('1', localWorkspace);
            localStorage.set('2', { uuid: '2', lastUpdated: 10 });
            syncStorage.set('1', syncWorkspace);
            syncStorage.set('3', { uuid: '3', lastUpdated: 5 });

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedSyncStorage.get('1')).toEqual(syncWorkspace);
            expect(updatedLocalStorage.get('1')).toEqual(syncWorkspace);
        });

        it('should include workspaces that are only in local storage', () => {
            const localWorkspace = { uuid: '1', lastUpdated: 2 };

            localStorage.set('1', localWorkspace);

            const [_, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedSyncStorage.get('1')).toEqual(localWorkspace);
        });

        it('should include workspaces that are only in sync storage', () => {
            const syncWorkspace = { uuid: '1', lastUpdated: 1 };

            syncStorage.set('1', syncWorkspace);

            const [updatedLocalStorage, _] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedLocalStorage.get('1')).toEqual(syncWorkspace);
        });

        it('should not fail if a tombstone is not in the local storage', () => {
            const tombstone = { uuid: '1', timestamp: 2 };
            const syncWorkspace = { uuid: '2', lastUpdated: 1 };
            const localWorkspace = { uuid: '2', lastUpdated: 1 };

            syncStorageTombstones.push(tombstone);
            syncStorage.set('2', syncWorkspace);
            localStorage.set('2', localWorkspace);

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedLocalStorage.has('1')).toBe(false);
            expect(updatedSyncStorage.has('1')).toBe(false);
            expect(updatedLocalStorage.has('2')).toBe(true);
            expect(updatedSyncStorage.has('2')).toBe(true);
        });

        it('should not fail if a local workspace does not have a lastUpdated field and its deleted by a tombstone', () => {
            const localWorkspace = { uuid: '1' };
            const syncWorkspace = { uuid: '2', lastUpdated: 1 };
            const tombstone = { uuid: '1', timestamp: 2 };

            localStorage.set('1', localWorkspace);
            syncStorage.set('2', syncWorkspace);
            syncStorageTombstones.push(tombstone);

            const [updatedLocalStorage, updatedSyncStorage] = WorkspaceUtils.syncWorkspaces(localStorage, syncStorage, syncStorageTombstones);

            expect(updatedLocalStorage.get('2')).toEqual(syncWorkspace);
            expect(updatedLocalStorage.has('1')).toBe(false);
        });
    });
});