import { TabGroupStub } from "../../../obj/tab-group-stub";
import { TabStub } from "../../../obj/tab-stub";
import { Workspace } from "../../../obj/workspace";
import { SyncWorkspaceStorage } from "../../../storage/sync-workspace-storage";
import { DebounceUtil } from "../../../utils/debounce";

describe("SyncWorkspaceStorage", () => {
    let workspace;

    beforeEach(() => {
        workspace = new Workspace(1, "Test Workspace", undefined, undefined, "workspace-uuid");
        workspace.setTabs([
            new TabStub({id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0}),
            new TabStub({id: 2, url: "https://example.org", windowId: 1, active: false, pinned: false, mutedInfo: { muted: false }, groupId: 0})
        ]);
        workspace.setTabGroups([
            new TabGroupStub({id: 1, name: "Group 1", color: "blue", collapsed: false}),
            new TabGroupStub({id: 2, name: "Group 2", color: "red", collapsed: true})
        ]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("convertWorkspaceToSyncData converts a Workspace object to SyncData", () => {
        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);

        const expectedMetadata = {
            uuid: "workspace-uuid",
            name: "Test Workspace",
            windowId: 1
        };

        expect(syncData.metadata).toMatchObject(expectedMetadata);
        expect(syncData.tabs.length).toBe(2);
        expect(syncData.tabGroups.length).toBe(2);
    });

    test("convertSyncDataToWorkspace converts basic SyncData to a Workspace object", () => {
        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        const newWorkspace = SyncWorkspaceStorage.convertSyncDataToWorkspace(syncData);

        expect(newWorkspace.uuid).toBe(workspace.uuid);
        expect(newWorkspace.name).toBe(workspace.name);
        expect(newWorkspace.windowId).toBe(workspace.windowId);
        expect(newWorkspace.getTabs().length).toBe(2);
        expect(newWorkspace.getTabGroups().length).toBe(2);
    });

    test("saveWorkspaceToSync saves a Workspace object to chrome.storage.sync", async () => {
        await SyncWorkspaceStorage.saveWorkspaceToSync(workspace);

        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        const expectedObject = {
            [`workspace_metadata_${workspace.uuid}`]: syncData.metadata,
            [`workspace_tabs_${workspace.uuid}_0`]: syncData.tabs,
            [`workspace_tab_groups_${workspace.uuid}`]: syncData.tabGroups
        }

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(expectedObject);
    });

    test("chunkArray chunks an array into smaller arrays based on byte size", () => {
        const array = ["item1", "item2", "item3"];
        const maxBytes = 10; // Small size for testing
        const chunks = SyncWorkspaceStorage.chunkArray(array, maxBytes);

        expect(chunks.length).toBeGreaterThan(1);
    });

    test("debounceSaveWorkspaceToSync debounces saving a Workspace object to chrome.storage.sync", () => {
        jest.useFakeTimers();
        const debounceSpy = jest.spyOn(DebounceUtil, 'debounce');

        SyncWorkspaceStorage.debounceSaveWorkspaceToSync(workspace);

        expect(debounceSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Function), 60000);

        jest.runAllTimers();
        expect(chrome.storage.sync.set).toHaveBeenCalled();
    });
});