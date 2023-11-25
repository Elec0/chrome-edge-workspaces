import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";

beforeEach(() => {
    jest.clearAllMocks();
});

test("getActiveTabId returns active tab ID", async () => {
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
    expect(await StorageHelper.addWorkspace("name", window)).toBe(true);
});

describe("chrome local storage", () => {
    it('should get value', async () => {
        const key = 'testKey';
        const defaultValue = 'defaultValue';
        const value = 'testValue';

        jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [key]: value });

        const result = await StorageHelper.getValue(key, defaultValue);
        expect(result).toBe(value);
        expect(chrome.storage.local.get).toHaveBeenCalledWith([key]);
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
        expect(setValueSpy).toHaveBeenCalledWith('workspaces', JSON.stringify(workspaces));
    });
});