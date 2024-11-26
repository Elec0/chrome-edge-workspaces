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
            new TabStub({ id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0 }),
            new TabStub({ id: 2, url: "https://example.org", windowId: 1, active: false, pinned: false, mutedInfo: { muted: false }, groupId: 0 })
        ]);
        workspace.setTabGroups([
            new TabGroupStub({ id: 1, name: "Group 1", color: "blue", collapsed: false }),
            new TabGroupStub({ id: 2, name: "Group 2", color: "red", collapsed: true })
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
        expect(newWorkspace.getTabs()[0].url).toBe("https://example.com");
        expect(newWorkspace.getTabGroups().length).toBe(2);
    });

    test("createSyncWorkspaceWriteObject creates object in expected structure", async () => {
        const result = await SyncWorkspaceStorage.createSyncWorkspaceWriteObject(workspace);

        const syncData = SyncWorkspaceStorage.convertWorkspaceToSyncData(workspace);
        syncData.metadata.numTabChunks = 1; // Set to 1 for testing, normally calculated in saveWorkspaceToSync

        const expectedObject = {
            [`workspace_metadata_${workspace.uuid}`]: syncData.metadata,
            [`workspace_tabs_${workspace.uuid}_0`]: syncData.tabs,
            [`workspace_tab_groups_${workspace.uuid}`]: syncData.tabGroups
        }

        // expect(chrome.storage.sync.set).toHaveBeenCalledWith(expectedObject);
        expect(result).toMatchObject(expectedObject);
    });

    test("deleteWorkspaceFromSync deletes a Workspace object from chrome.storage.sync", async () => {
        chrome.storage.sync.get.mockResolvedValue({
            [`workspace_metadata_${workspace.uuid}`]: { numTabChunks: 1 },
            [`workspace_tabs_${workspace.uuid}_0`]: [],
            [`workspace_tab_groups_${workspace.uuid}`]: [1]
        });

        await SyncWorkspaceStorage.deleteWorkspaceFromSync(workspace.uuid);

        const expectedKeys = [
            `workspace_metadata_${workspace.uuid}`,
            `workspace_tabs_${workspace.uuid}_0`,
            `workspace_tab_groups_${workspace.uuid}`
        ];

        expect(chrome.storage.sync.remove).toHaveBeenCalledWith(expect.arrayContaining(expectedKeys));
    });

    test("debounceSaveWorkspaceToSync debounces saving a Workspace object to chrome.storage.sync", () => {
        jest.useFakeTimers();
        const debounceSpy = jest.spyOn(DebounceUtil, 'debounce');

        SyncWorkspaceStorage.debounceSaveWorkspaceToSync(workspace);

        expect(debounceSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Function), expect.any(Number));

        jest.runAllTimers();
        expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    describe("getAllSyncWorkspaceUUIDs", () => {
        it("should return all workspace UUIDs from chrome.storage.sync", async () => {
            const keys = [
                "workspace_metadata_workspace-uuid",
                "workspace_tabs_workspace-uuid_0",
                "workspace_tab_groups_workspace-uuid",
                "workspace_metadata_workspace-uuid2",
                "workspace_tabs_workspace-uuid2_0",
                "workspace_tab_groups_workspace-uuid2",
                "workspace_metadata_workspace-uuid3",
                "workspace_tabs_workspace-uuid3_0",
                "workspace_tab_groups_workspace-uuid3"
            ];

            chrome.storage.sync.get.mockResolvedValue(keys.reduce((acc, key) => {
                acc[key] = {};
                return acc;
            }, {}));

            const result = await SyncWorkspaceStorage.getAllSyncWorkspaceUUIDs();

            expect(result).toEqual(["workspace-uuid", "workspace-uuid2", "workspace-uuid3"]);
        });

        it("should return an empty array if no workspace UUIDs are found", async () => {
            chrome.storage.sync.get.mockResolvedValue({});

            const result = await SyncWorkspaceStorage.getAllSyncWorkspaceUUIDs();

            expect(result).toEqual([]);
        });
    });

    describe("loadWorkspaceFromSync", () => {
        it("should return null if number of tab chunks is not set in metadata", async () => {
            const metadata = {
                uuid: "workspace-uuid",
                name: "Test Workspace",
                windowId: 1,
                lastUpdated: Date.now(),
                numTabChunks: -1
            };

            chrome.storage.sync.get.mockResolvedValue({
                [`workspace_metadata_workspace-uuid`]: metadata
            });

            const result = await SyncWorkspaceStorage.getWorkspaceFromSync("workspace-uuid");

            expect(result).toBeNull();
        });

        it("should return a Workspace object if metadata and tab chunks are found", async () => {
            const metadata = {
                uuid: "workspace-uuid",
                name: "Test Workspace",
                windowId: 1,
                lastUpdated: Date.now(),
                numTabChunks: 1
            };

            const tabGroups = [
                JSON.stringify({ id: 1, name: "Group 1", color: "blue", collapsed: false }),
                JSON.stringify({ id: 2, name: "Group 2", color: "red", collapsed: true })
            ];

            const tabs = [
                JSON.stringify({ id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0 }),
                JSON.stringify({ id: 2, url: "https://example.org", windowId: 1, active: false, pinned: false, mutedInfo: { muted: false }, groupId: 0 })
            ];

            chrome.storage.sync.get.mockResolvedValue({
                [`workspace_metadata_workspace-uuid`]: metadata,
                [`workspace_tab_groups_workspace-uuid`]: tabGroups,
                [`workspace_tabs_workspace-uuid_0`]: tabs
            });

            const result = await SyncWorkspaceStorage.getWorkspaceFromSync("workspace-uuid");

            expect(result).not.toBeNull();
            expect(result.uuid).toBe(metadata.uuid);
            expect(result.name).toBe(metadata.name);
            expect(result.windowId).toBe(metadata.windowId);
            expect(result.lastUpdated).toBe(metadata.lastUpdated);
            expect(result.getTabs().length).toBe(2);
            expect(result.getTabGroups().length).toBe(2);
        });

        it("should handle missing tab chunks gracefully", async () => {
            const metadata = {
                uuid: "workspace-uuid",
                name: "Test Workspace",
                windowId: 1,
                lastUpdated: Date.now(),
                numTabChunks: 2
            };

            const tabGroups = [
                JSON.stringify({ id: 1, name: "Group 1", color: "blue", collapsed: false }),
                JSON.stringify({ id: 2, name: "Group 2", color: "red", collapsed: true })
            ];

            const tabsChunk1 = [
                JSON.stringify({ id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0 })
            ];

            chrome.storage.sync.get.mockResolvedValue({
                [`workspace_metadata_workspace-uuid`]: metadata,
                [`workspace_tab_groups_workspace-uuid`]: tabGroups,
                [`workspace_tabs_workspace-uuid_0`]: tabsChunk1
                // Missing second chunk
            });

            const result = await SyncWorkspaceStorage.getWorkspaceFromSync("workspace-uuid");

            expect(result).not.toBeNull();
            expect(result.uuid).toBe(metadata.uuid);
            expect(result.name).toBe(metadata.name);
            expect(result.windowId).toBe(metadata.windowId);
            expect(result.lastUpdated).toBe(metadata.lastUpdated);
            expect(result.getTabs().length).toBe(1); // Only one tab chunk was found
            expect(result.getTabGroups().length).toBe(2);
        });

        it("should return null if workspace metadata is not found", async () => {
            chrome.storage.sync.get.mockResolvedValue({});

            const result = await SyncWorkspaceStorage.getWorkspaceFromSync("workspace-uuid");

            expect(result).toBeNull();
        });

        it("should return null if number of tab chunks is not set in metadata", async () => {
            const metadata = {
                uuid: "workspace-uuid",
                name: "Test Workspace",
                windowId: 1,
                lastUpdated: Date.now(),
                numTabChunks: -1
            };

            chrome.storage.sync.get.mockResolvedValue({
                [`workspace_metadata_workspace-uuid`]: metadata
            });

            const result = await SyncWorkspaceStorage.getWorkspaceFromSync("workspace-uuid");

            expect(result).toBeNull();
        });
    });

    describe("getAllSyncData", () => {
        it("should return all SyncData objects from chrome.storage.sync", async () => {
            const testData = require("../../data/sync-storage-data-1.json");

            chrome.storage.sync.get.mockResolvedValue(testData);

            const result = await SyncWorkspaceStorage.getAllSyncData();

            expect(result.length).toBe(2);
            expect(result[0].metadata.uuid).toBe("cac9dc5b-178a-42b8-b50f-aa0c17c370f2");
            expect(result[1].metadata.uuid).toBe("e36de816-4071-4a48-8ab2-03719ff4b301");
            expect(result[0].tabs.length).toBe(2);
            expect(result[0].tabGroups.length).toBe(0);
        });

        it("should return an empty array if no SyncData objects are found", async () => {
            chrome.storage.sync.get.mockResolvedValue({});

            const result = await SyncWorkspaceStorage.getAllSyncData();

            expect(result).toEqual([]);
        });
    });

    describe("convertWorkspaceTabsForSaving", () => {
        // it should convert tab stubs to JSON strings, removing the 'favIconUrl' property

        it("should convert tabs to JSON strings, removing 'favIconUrl'", async () => {
            const tabs = [
                new TabStub({ id: 1, url: "https://example.com", windowId: 1, active: true, pinned: false, mutedInfo: { muted: false }, groupId: 0, favIconUrl: "https://example.com/favicon.ico" }),
                new TabStub({ id: 2, url: "https://example.org", windowId: 1, active: false, pinned: false, mutedInfo: { muted: false }, groupId: 0, favIconUrl: "https://example.org/favicon.ico" })
            ];

            // Result object is a string
            const result = SyncWorkspaceStorage.convertWorkspaceTabsForSaving(tabs);

            expect(result.length).toBe(2);
            expect(result[0]).not.toContain("favIconUrl");
            expect(result[1]).not.toContain("favIconUrl");
        });
    });
});