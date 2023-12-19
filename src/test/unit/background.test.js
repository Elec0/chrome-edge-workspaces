import { StorageHelper } from "../../storage-helper";
import { MessageResponses } from "../../constants/message-responses";
import { Background } from "../../background";


// Mock the storage helper, can't be done in beforeEach
jest.mock('../../storage-helper');

describe('background', () => {
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

    describe('processNewWorkspace', () => {
        it('should return FAILURE when addWorkspace fails', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(false);
            const result = await Background.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
            expect(result).toBe(MessageResponses.FAILURE);
        });

        it('should return SUCCESS when addWorkspace succeeds', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(true);
            const result = await Background.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
            expect(result).toBe(MessageResponses.SUCCESS);
        });
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

        // TODO: Add a test for the sync storage update once that functionality is implemented
    });
    
});
 