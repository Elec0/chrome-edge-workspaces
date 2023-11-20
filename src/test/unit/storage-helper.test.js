import { StorageHelper} from "../../storage-helper";

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

describe('StorageHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get value from local storage', async () => {
    const key = 'testKey';
    const defaultValue = 'defaultValue';
    const value = 'testValue';

    jest.spyOn(chrome.storage.local, "get").mockResolvedValue({ [key]: value });

    const result = await StorageHelper.getValue(key, defaultValue);
    expect(result).toBe(value);
    expect(chrome.storage.local.get).toHaveBeenCalledWith([key], expect.any(Function));
  });

  it('should set value to local storage', () => {
    const key = 'testKey';
    const value = 'testValue';

    jest.spyOn(chrome.storage.local, "set").mockResolvedValue("success");
    
    StorageHelper.setValue(key, value);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ [key]: value });
  });

  // Add more tests for other methods in the StorageHelper class
});