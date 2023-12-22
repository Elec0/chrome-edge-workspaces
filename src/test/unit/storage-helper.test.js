import { Constants } from "../../constants/constants";
import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";

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


describe("addWorkspace", () => {
    it("should successfully add a workspace", async () => {
        // jest.spyOn(chrome.tabs, "query").mockResolvedValue([{
        //     id: 3,
        //     active: true,
        //     currentWindow: true
        // }]);
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

        // jest.spyOn(chrome.storage.local, "set").mockImplementation(({[key]: value}) => {
        //     map.set(key, value);
        // }).mockResolvedValue("success");
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

        jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [key]: value });

        const result = await StorageHelper.getValue(key, defaultValue);
        expect(result).toBe(value);
        expect(chrome.storage.local.get).toHaveBeenCalledWith(key);
    });

    it("should set value", () => {
        const key = "testKey";
        const value = "testValue";

        jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");

        StorageHelper.setValue(key, value);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ [key]: value });
    });
});

describe("setWorkspaces", () => {
    it("should call setValue with correct parameters", async () => {
        // Arrange
        const workspaces = new Map();
        let workspace = new Workspace(2, "testWorkspaceSet");
        workspaces.set(workspace.uuid, workspace);

        // Act
        await StorageHelper.setWorkspaces(workspaces);

        // Assert
        expect(await StorageHelper.getWorkspaces()).toEqual(workspaces);
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
        const workspaces = new Map();
        let workspace = new Workspace(3, "toGet");
        workspaces.set(workspace.windowId, workspace);

        await StorageHelper.setWorkspaces(workspaces);

        // Act
        let value = await StorageHelper.getWorkspaces();

        // Assert
        expect(value).toEqual(workspaces);
    });
});