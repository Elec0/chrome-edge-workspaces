import { Constants } from "../../constants/constants";
import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";
import { SyncWorkspaceStorage } from "../../storage/sync-workspace-storage";
import { WorkspaceStorage } from "../../workspace-storage";
import { TabStub } from "../../obj/tab-stub";
import { BackgroundMessageHandlers } from "../../messages/background-message-handlers";
import { MessageResponses } from "../../constants/message-responses";

const map = new Map();

function sendMove(uuid, targetUuid, placement) {
    return new Promise((resolve, reject) => {
        const handled = BackgroundMessageHandlers.messageListener({
            type: 'MOVE_WORKSPACE',
            payload: { uuid, targetUuid, placement },
        }, undefined, resolve);
        if (!handled) reject(new Error('Move workspace message was not handled'));
    });
}

beforeEach(() => {
    // Mock chrome.storage.local get and set to use our map local variable
    jest.spyOn(StorageHelper, "getValue").mockImplementation((key, defaultValue) => {
        return map.get(key) || defaultValue;
    });

    jest.spyOn(StorageHelper, "setValue").mockImplementation((key, value) => {
        map.set(key, value);
        return true;
    });
    map.clear();
    // We're not testing the sync storage here, so mock it to return false to skip the logic
    jest.spyOn(SyncWorkspaceStorage, "isSyncSavingEnabled").mockResolvedValue(false);
});

/** Jest does not clear any mock state between tests (which is baffling). So doing this and/or putting 
 *  restoreMocks: true,
 *  clearMocks: true,
 *  resetMocks: true,
 * In jest.config.js is necessary to prevent tests from sharing mock state between them.
 */
afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    jest.clearAllMocks();
});

describe('workspace order', () => {
    let original;

    beforeEach(async () => {
        original = new WorkspaceStorage();
        ['a', 'b', 'c'].forEach((uuid, index) => {
            original.set(uuid, new Workspace(index + 1, uuid, [], undefined, uuid));
        });
        await StorageHelper.setWorkspaces(original);
    });

    test('serializes consecutive moves with a background tab save', async () => {
        const tabSave = StorageHelper.runWorkspaceUpdate(async () => {
            const workspace = await StorageHelper.getWorkspace('b');
            workspace.addTab(new TabStub({ id: 4, index: 0, url: 'https://example.com' }));
            await StorageHelper.setWorkspace(workspace);
        });
        const firstMove = sendMove('a', 'c', 'after');
        const secondMove = sendMove('c', 'b', 'before');
        const [, first, second] = await Promise.all([tabSave, firstMove, secondMove]);

        expect(first.message).toBe(MessageResponses.SUCCESS.message);
        expect(second.message).toBe(MessageResponses.SUCCESS.message);
        const saved = await StorageHelper.getLocalWorkspaces();
        expect(saved.listInOrder().map(({ uuid, order }) => [uuid, order]))
            .toEqual([['c', 0], ['b', 1], ['a', 2]]);
        expect(saved.get('b').getTab(4).url).toBe('https://example.com');
        expect(saved.get('a').lastUpdated).toBe(original.get('a').lastUpdated);
    });

    test('returns the latest list when the destination no longer exists', async () => {
        await StorageHelper.removeWorkspace('c');
        const result = await sendMove('a', 'c', 'after');

        expect(result.message).toBe(MessageResponses.ERROR.message);
        expect(StorageHelper.workspacesFromJson(result).listInOrder().map(({ uuid }) => uuid))
            .toEqual(['a', 'b']);
    });

    test('keeps a newly created workspace when creation overlaps a move', async () => {
        const creation = BackgroundMessageHandlers.processNewWorkspace({ payload: { workspaceName: 'New', windowId: 4 } });
        const move = sendMove('a', 'b', 'after');
        await Promise.all([creation, move]);

        const saved = await StorageHelper.getLocalWorkspaces();
        expect(saved.listInOrder().map(({ name }) => name)).toEqual(['b', 'a', 'c', 'New']);
    });

    test('keeps order when workspace opening saves reassigned tab IDs', async () => {
        const openedWorkspace = original.get('a');
        openedWorkspace.addTab(new TabStub({ id: 5, index: 0, url: 'https://example.com' }));
        const opening = BackgroundMessageHandlers.processOpenWorkspace({
            payload: { uuid: 'a', windowId: 10, workspaceData: openedWorkspace.serialize() },
        });
        const moving = sendMove('a', 'b', 'after');
        await Promise.all([opening, moving]);

        const saved = await StorageHelper.getLocalWorkspaces();
        expect(saved.listInOrder().map(({ uuid }) => uuid)).toEqual(['b', 'a', 'c']);
        expect(saved.get(10).getTab(5).url).toBe('https://example.com');
    });

    test('preserves an explicit position when saving a workspace read before a move', async () => {
        const staleWorkspace = await StorageHelper.getWorkspace('a');
        await sendMove('a', 'c', 'after');
        staleWorkspace.name = 'Renamed';
        await StorageHelper.setWorkspace(staleWorkspace);
        await StorageHelper.addWorkspace('New', 4);

        const saved = await StorageHelper.getLocalWorkspaces();
        expect(saved.listInOrder().map(({ name }) => name)).toEqual(['b', 'c', 'Renamed', 'New']);
        expect(saved.get('a').order).toBe(2);
    });

    test('imports explicit positions from a workspace export', async () => {
        const { data } = await sendMove('c', 'a', 'before');
        map.clear();
        const imported = await new Promise(resolve => BackgroundMessageHandlers.messageListener({
            type: 'IMPORT_WORKSPACES',
            payload: { data },
        }, undefined, resolve));

        expect(imported.message).toBe(MessageResponses.SUCCESS.message);
        const saved = await StorageHelper.getLocalWorkspaces();
        expect(saved.listInOrder().map(({ uuid, order }) => [uuid, order]))
            .toEqual([['c', 0], ['a', 1], ['b', 2]]);
    });
});

describe("addWorkspace", () => {
    it("should successfully add a workspace", async () => {
        jest.spyOn(chrome.storage.local, "get").mockResolvedValue(3);
        jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");
        const window = {
            id: 1,
            focused: true
        };
        expect(await StorageHelper.addWorkspace("name", window.id)).toBe(true);
    });

    it("should reject when window id is null or undefined", async () => {
        let mockWindow = { id: null, tabs: [] };

        await expect(StorageHelper.addWorkspace("testWorkspaceFail", mockWindow.id))
            .resolves.toBe(false);
    });

    it.skip("should add workspace", async () => {
        // Mock the get and setWorkspace methods
        jest.spyOn(StorageHelper, "getWorkspaces").mockResolvedValue(new Map());
        jest.spyOn(StorageHelper, "setWorkspaces").mockImplementation(() => { return true; });

        let mockWindow = { id: 1, tabs: [] };
        let workspaces = new Map();
        workspaces.set(mockWindow.id, new Workspace(mockWindow.id, "testWorkspaceAdd", mockWindow.tabs));
        const result = await StorageHelper.addWorkspace("testWorkspaceAdd", mockWindow.id);

        expect(result).toBe(true);
        expect(StorageHelper.getWorkspaces).toHaveBeenCalledTimes(1);
        expect(StorageHelper.setWorkspaces).toHaveBeenCalledWith(workspaces);

    });

    it.skip("should add two workspaces and get them", async () => {
        let map = new Map();

        // Mock chrome.storage.local get and set to use our map local variable
        jest.spyOn(StorageHelper, "getValue").mockImplementation((key, defaultValue) => {
            return map.get(key) || defaultValue;
        });

        jest.spyOn(StorageHelper, "setValue").mockImplementation((key, value) => {
            map.set(key, value);
            return true;
        });

        await StorageHelper.addWorkspace("testWorkspaceAddOne", 1);
        await StorageHelper.addWorkspace("testWorkspaceAddTwo", 2);

        let workspaces = await StorageHelper.getWorkspaces();

        expect(workspaces.size).toBe(2);

    });
});

describe("chrome local storage", () => {
    it("should get value", async () => {
        const key = "testKey";
        const defaultValue = "defaultValue";
        const value = "testValue";

        // jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [key]: value });
        await StorageHelper.setValue(key, value);
        const result = await StorageHelper.getValue(key, defaultValue);

        expect(result).toBe(value);
    });
});

describe("setWorkspace", () => {
    it("should update workspaces", async () => {
        // Arrange
        jest.spyOn(chrome.storage.local, "get").mockResolvedValue(new Map());
        jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");
        jest.spyOn(StorageHelper, "setWorkspaces").mockResolvedValue(true);

        let workspace = new Workspace(2, "testWorkspaceSet");
        await StorageHelper.setWorkspace(workspace);

        // Assert
        expect(StorageHelper.setWorkspaces).toHaveBeenCalledTimes(1);
        // let workspaces = await StorageHelper.getWorkspaces();
        // expect(workspaces.get(workspace.windowId)).toEqual(workspace);

    });

});

describe("getWorkspaces", () => {
    it.skip("should call getValue with correct parameters", async () => {
        // Arrange
        const workspaces = new Map();
        let workspace = new Workspace(3, "toGet");
        workspaces.set(workspace.windowId, workspace);
        const stringValue = JSON.stringify(Array.from(workspaces));

        jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [Constants.KEY_STORAGE_WORKSPACES]: stringValue });

        // Act
        let value = await StorageHelper.getWorkspaces();

        // Assert
        expect(value).toEqual(workspaces);
    });
    
    it("should return the workspaces from storage", async () => {
        // Arrange
        let workspace = new Workspace(3, "toGet");
        await StorageHelper.setWorkspace(workspace);

        // Act
        let value = await StorageHelper.getWorkspaces();

        // Assert
        expect(value.get(workspace.uuid)).toEqual(workspace);
    });
});

describe("clearWorkspaceData", () => {
    it("should clear the workspaces", async () => {
        // Arrange
        jest.spyOn(chrome.storage.local, "clear").mockResolvedValue("success");

        // Act
        await StorageHelper.clearWorkspaces();

        // Assert
        expect(chrome.storage.local.clear).toHaveBeenCalledTimes(1);
    });
});

describe("renameWorkspace", () => {
    it("should rename the workspace", async () => {
        // Arrange
        map.set(Constants.STORAGE_KEYS.settings.saveBookmarks, "false");
        let workspace = new Workspace(3, "toRename");
        await StorageHelper.setWorkspace(workspace);

        // Act
        await StorageHelper.renameWorkspace(workspace.uuid, "newName");
        // Assert
        let workspaces = await StorageHelper.getWorkspaces();
        expect(workspaces.get(workspace.uuid).name).toBe("newName");
    });

    it("reports failure if the workspace does not exist", async () => {
        expect(await StorageHelper.renameWorkspace("notExist", "newName")).toEqual({ renamed: false });
    });

    it("renames the workspace and returns the reason if Chrome rejects the bookmark update", async () => {
        const workspace = new Workspace(3, "old name");
        await StorageHelper.setWorkspace(workspace);
        const folder = { id: "workspace", title: workspace.name, children: [] };
        const extensionFolder = { id: "extension", title: Constants.BOOKMARKS_FOLDER_NAME, children: [folder] };
        const originalBookmarks = chrome.bookmarks;
        chrome.bookmarks = {
            getTree: async () => [{ children: [{ id: "bar" }, { id: "other", children: [extensionFolder] }] }],
            update: async () => { throw new Error("Bookmarks unavailable"); },
        };
        try {
            expect(await StorageHelper.renameWorkspace(workspace.uuid, "new name")).toEqual({
                renamed: true,
                bookmarkWarning: "Bookmarks unavailable",
            });
            expect((await StorageHelper.getWorkspace(workspace.uuid)).name).toBe("new name");
            expect(folder.title).toBe("old name");
        } finally {
            chrome.bookmarks = originalBookmarks;
        }
    });
});

describe("removeWorkspace", () => {
    it("should remove the workspace", async () => {
        // Arrange
        let workspace = new Workspace(3, "toRemove");
        await StorageHelper.setWorkspace(workspace);

        // Act
        await StorageHelper.removeWorkspace(workspace.uuid);

        // Assert
        let workspaces = await StorageHelper.getWorkspaces();
        expect(workspaces.get(workspace.uuid)).toBeUndefined();
    });

    it("should return false if the workspace does not exist", async () => {
        expect(await StorageHelper.removeWorkspace("notExist")).toBe(false);
    });
});

describe("isWindowWorkspace", () => {
    it("should return true if the window is a workspace", async () => {
        let workspace = new Workspace(3, "toCheck");
        await StorageHelper.setWorkspace(workspace);

        let result = await StorageHelper.isWindowWorkspace(workspace.windowId);

        expect(result).toBe(true);
    });

    it("should return false if the window is not a workspace", async () => {
        let workspace = new Workspace(3, "toCheck");
        await StorageHelper.setWorkspace(workspace);

        let result = await StorageHelper.isWindowWorkspace(4);

        expect(result).toBe(false);
    });

    it("should return false if the windowId is null", async () => {
        expect(await StorageHelper.isWindowWorkspace(null)).toBe(false);
    });
});

test("getKeysByPrefix returns keys from chrome.storage.sync with a given prefix", async () => {
    const keys = [
        "workspace_metadata_workspace-uuid",
        "workspace_tabs_workspace-uuid_0",
        "workspace_tab_groups_workspace-uuid",
        "non_workspace_key",
        "2nd_workspace_metadata_workspace-uuid",
    ];

    chrome.storage.sync.get.mockResolvedValue(keys.reduce((acc, key) => {
        acc[key] = [];
        return acc;
    }, {}));

    const result = await StorageHelper.getKeysByPrefix("workspace_");

    expect(result).toEqual([
        "workspace_metadata_workspace-uuid",
        "workspace_tabs_workspace-uuid_0",
        "workspace_tab_groups_workspace-uuid",
    ]);
});
