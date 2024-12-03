import { Background } from "../../background";
import { Constants } from "../../constants/constants";
import { TabStub } from "../../obj/tab-stub";
import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";
import { SyncWorkspaceStorage } from "../../storage/sync-workspace-storage";
import { DebounceUtil } from "../../utils/debounce";


// Mock the storage helper, can't be done in beforeEach
jest.mock('../../storage-helper');

describe('Background', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.resetAllMocks();
        jest.clearAllMocks();

        // Mock the listeners
        chrome.runtime.onMessage.addListener = jest.fn();
        chrome.windows.onRemoved.addListener = jest.fn();
        chrome.tabs.onRemoved.addListener = jest.fn();
        chrome.tabs.onCreated.addListener = jest.fn();
    });

    describe('windowRemoved', () => {
        it('should return early when the window is not a workspace', async () => {
            StorageHelper.isWindowWorkspace.mockResolvedValue(false);
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
            await Background.windowRemoved(1);
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should log a debug message when the window is a workspace', async () => {
            StorageHelper.isWindowWorkspace.mockResolvedValue(true);
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
            await Background.windowRemoved(1);
            expect(consoleSpy).toHaveBeenCalledWith('Window 1 is a workspace, saving tabs...');
            consoleSpy.mockRestore();
        });

        it('should immediately save the workspace to sync storage when a debounced save is present', async () => {
            StorageHelper.isWindowWorkspace.mockResolvedValue(true);
            StorageHelper.getWorkspaceFromWindow.mockResolvedValue(new Workspace('test', 1));
            jest.spyOn(SyncWorkspaceStorage, 'isSyncSavingEnabled').mockResolvedValue(true);

            // Hackily say that the debounce timeout is set
            DebounceUtil.debounceTimeouts.set(Constants.DEBOUNCE_IDS.saveWorkspaceToSync, {});

            const saveSpy = jest.spyOn(SyncWorkspaceStorage, 'immediatelySaveWorkspaceToSync').mockResolvedValue();
            await Background.windowRemoved(1);
            
            expect(saveSpy).toHaveBeenCalled();
        });
    });

    describe('tabRemoved', () => {
        it('should return early when the window is closing', async () => {
            const workspace = new Workspace('test', 1);
            workspace.removeTab = jest.fn();

            await Background.tabRemoved(1, { isWindowClosing: true, windowId: 1 });
            expect(workspace.removeTab).not.toHaveBeenCalled();
        });

        it('should update the workspace when a tab, not the window, is closing', async () => {
            const workspace = new Workspace('test', 1);
            const tab1 = TabStub.fromTab({ id: 1, windowId: 1 });
            const tab2 = TabStub.fromTab({ id: 2, windowId: 1 });
            workspace.addTab(TabStub.fromTab(tab1));
            workspace.addTab(TabStub.fromTab(tab2));

            workspace.removeTab = jest.fn();
            StorageHelper.getWorkspace.mockResolvedValue(workspace);
            StorageHelper.isWindowWorkspace.mockResolvedValue(true);
            chrome.tabs.query.mockResolvedValue([tab2]);

            // This is our test condition
            StorageHelper.setWorkspace.mockImplementation((workspace) => {
                try {
                    expect(workspace.getTabs()).toHaveLength(1);
                    expect(workspace.getTabs()[0].id).toBe(2);
                    Promise.resolve(true)
                }
                catch (e) {
                    Promise.reject(e);
                }
            });

            await Background.tabRemoved(1, { isWindowClosing: false, windowId: 1 });

            expect(workspace.removeTab).not.toHaveBeenCalled();
        });

        it('should not update the workspace when the only tab in the workspace is closing', async () => {
            const workspace = new Workspace('test', 1);
            workspace.addTab(TabStub.fromTab({ id: 1, windowId: 1 }));

            workspace.removeTab = jest.fn();
            Background.windowRemoved = jest.fn();

            StorageHelper.getWorkspace.mockResolvedValue(workspace);
            StorageHelper.setWorkspace.mockResolvedValue(true);
            StorageHelper.isWindowWorkspace.mockResolvedValue(true);

            await Background.tabRemoved(1, { isWindowClosing: false, windowId: 1 });

            expect(workspace.removeTab).not.toHaveBeenCalled();
        });
    });

    describe('tabCreated', () => {
        it('should return early when the window is not a workspace', async () => {
            StorageHelper.isWindowWorkspace.mockResolvedValue(false);
            // Mock the getWorkspaces to reject the promise
            StorageHelper.getWorkspace.mockRejectedValue(false);

            const workspace = new Workspace(1, 'test');
            workspace.tabs.push = jest.fn();

            await Background.tabUpdated(1, {}, { id: 1, windowId: 1 });

            expect(workspace.tabs.push).not.toHaveBeenCalled();
        });
    });
    describe("tabAttached", () => {
        it("should save window tabs to workspace if the window is a workspace", async () => {
            // Arrange
            const tabId = 1;
            const attachInfo = { newWindowId: 2 };
            const saveWindowTabsToWorkspaceSpy = jest.spyOn(Background, "saveWindowTabsToWorkspace").mockResolvedValue();
            jest.spyOn(StorageHelper, "isWindowWorkspace").mockResolvedValue(true);

            // Act
            await Background.tabAttached(tabId, attachInfo);

            // Assert
            expect(saveWindowTabsToWorkspaceSpy).toHaveBeenCalledWith(attachInfo.newWindowId);
        });

        it("should not save window tabs to workspace if the window is not a workspace", async () => {
            // Arrange
            const tabId = 1;
            const attachInfo = { newWindowId: 2 };
            const saveWindowTabsToWorkspaceSpy = jest.spyOn(Background, "saveWindowTabsToWorkspace").mockResolvedValue();
            jest.spyOn(StorageHelper, "isWindowWorkspace").mockResolvedValue(false);

            // Act
            await Background.tabAttached(tabId, attachInfo);

            // Assert
            expect(saveWindowTabsToWorkspaceSpy).not.toHaveBeenCalled();
        });
    });

    describe("tabReplaced", () => {
        it("should update the replaced tab in the workspace", async () => {
            const addedTabId = 1;
            const removedTabId = 2;
            const windowId = 3;
            const mockTab = { windowId };
            const saveWindowTabsToWorkspaceSpy = jest.spyOn(Background, "saveWindowTabsToWorkspace").mockResolvedValue();
            jest.spyOn(StorageHelper, "isWindowWorkspace").mockResolvedValue(true);
            chrome.tabs.get.mockResolvedValue(mockTab);

            await Background.tabReplaced(addedTabId, removedTabId);

            expect(saveWindowTabsToWorkspaceSpy).toHaveBeenCalledWith(windowId);
        });

        it("should not call saveWindowTabsToWorkspace if the window is not a workspace", async () => {
            const addedTabId = 1;
            const removedTabId = 2;
            const windowId = 3;
            const mockTab = { windowId };
            const saveWindowTabsToWorkspaceSpy = jest.spyOn(Background, "saveWindowTabsToWorkspace").mockResolvedValue();
            jest.spyOn(StorageHelper, "isWindowWorkspace").mockResolvedValue(false);
            chrome.tabs.get.mockResolvedValue(mockTab);

            await Background.tabReplaced(addedTabId, removedTabId);

            expect(saveWindowTabsToWorkspaceSpy).not.toHaveBeenCalled();
        });
    });

    // Most of the logic in this function is already tested for tabRemoved
    describe("tabDetached", () => {
        it("should have cleared the tab's badge text", async () => {
            const tabId = 1;
            const tab = { id: tabId, windowId: 1 };
            const detachInfo = { oldWindowId: 2 };
            chrome.tabs.get.mockResolvedValue(tab);

            await Background.tabDetached(tabId, detachInfo);

            expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId });
        });
    });
});