import { StorageHelper} from "../../storage-helper";

test("getActiveTabId returns active tab ID", async () => {
    // jest.spyOn(chrome.tabs, "query").mockResolvedValue([{
    //     id: 3,
    //     active: true,
    //     currentWindow: true
    // }]);
    jest.spyOn(chrome.storage.local, "get").mockResolvedValue(3);
    jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");
    expect(await StorageHelper.addWindowToWorkspace(123, "name")).toBe(true);
});