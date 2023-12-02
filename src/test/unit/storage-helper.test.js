import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";

beforeEach(() => {
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

    it('should reject when window id is null or undefined', async () => {
        let mockWindow = { id: null, tabs: [] };

        await expect(StorageHelper.addWorkspace('testWorkspace', mockWindow.id))
            .resolves.toBe(false);
    });

    it('should add workspace', async () => {
        // Mock the get and setWorkspace methods
        jest.spyOn(StorageHelper, "getWorkspaces").mockResolvedValue(new Map());
        jest.spyOn(StorageHelper, "setValue");

        let mockWindow = { id: 1, tabs: [] };
        let workspaces = new Map();
        workspaces.set(mockWindow.id, new Workspace(mockWindow.id, "testWorkspace", mockWindow.tabs));
        const result = await StorageHelper.addWorkspace("testWorkspace", mockWindow.id);

        expect(result).toBe(true);
        expect(StorageHelper.getWorkspaces).toHaveBeenCalledTimes(1);
        expect(StorageHelper.setValue).toHaveBeenCalledWith("workspaces",
            '[[1,{"id":1,"name":"testWorkspace","tabs":[]}]]');
    });
});

describe("chrome local storage", () => {
    it('should get value', async () => {
        const key = 'testKey';
        const defaultValue = 'defaultValue';
        const value = 'testValue';

        jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [key]: value });

        const result = await StorageHelper.getValue(key, defaultValue);
        expect(result).toBe(value);
        expect(chrome.storage.local.get).toHaveBeenCalledWith(key);
    });

    it('should set value', () => {
        const key = 'testKey';
        const value = 'testValue';

        jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");

        StorageHelper.setValue(key, value);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ [key]: value });
    });
});

describe('setWorkspaces', () => {
    it('should call setValue with correct parameters', async () => {
        // Arrange
        const workspaces = new Map();
        let workspace = new Workspace(2, 'testWorkspace');
        workspaces.set(workspace.id, workspace);
        const setValueSpy = jest.spyOn(StorageHelper, 'setValue');

        // Act
        await StorageHelper.setWorkspaces(workspaces);

        // Assert
        expect(setValueSpy).toHaveBeenCalledWith('workspaces',
            '[[2,{"id":2,"name":"testWorkspace","tabs":[]}]]');
    });
});