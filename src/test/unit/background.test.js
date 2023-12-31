import { Background, BackgroundMessageHandlers } from "../../background";
import { MessageResponses } from "../../constants/message-responses";
import { Messages } from "../../constants/messages";
import { TabStub } from "../../obj/tab-stub";
import { Workspace } from "../../obj/workspace";
import { StorageHelper } from "../../storage-helper";


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

        // TODO: Add a test for the sync storage update once that functionality is implemented
    });

    describe('tabRemoved', () => {
        it('should return early when the window is closing', async () => {
            const workspace = new Workspace('test', 1);
            workspace.removeTab = jest.fn();

            await Background.tabRemoved(1, { isWindowClosing: true, windowId: 1 });
            expect(workspace.removeTab).not.toHaveBeenCalled();
        });

        it('should log a debug message and update the workspace when the window is not closing', async () => {
            const workspace = new Workspace('test', 1);
            workspace.removeTab = jest.fn();
            StorageHelper.getWorkspace.mockResolvedValue(workspace);
            StorageHelper.setWorkspace.mockResolvedValue(true);

            await Background.tabRemoved(1, { isWindowClosing: false, windowId: 1 });

            expect(workspace.removeTab).toHaveBeenCalledWith(1);
            expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(workspace);

        });
    });

    describe('tabCreated', () => {
        it('should return early when the window is not a workspace', async () => {
            StorageHelper.isWindowWorkspace.mockResolvedValue(false);
            // Mock the getWorkspaces to reject the promise
            StorageHelper.getWorkspace.mockRejectedValue(false);

            const workspace = new Workspace('test', 1);
            workspace.tabs.push = jest.fn();

            await Background.tabUpdated(1, {}, { id: 1, windowId: 1 });

            expect(workspace.tabs.push).not.toHaveBeenCalled();
        });

        it('should log a message and update the workspace when the window is a workspace', async () => {
            const workspace = new Workspace('test', 1);
            StorageHelper.getWorkspace.mockResolvedValue(workspace);
            StorageHelper.setWorkspace.mockResolvedValue(true);

            await Background.tabUpdated(1, {}, { id: 1, windowId: 1 });

            let setTab = workspace.getTab(1);
            expect(setTab).toBeDefined();
            expect(setTab).toEqual(TabStub.fromTab({ id: 1, windowId: 1 }));
            expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(workspace);
        });
    });

    describe("BackgroundMessageHandlers", () => {

        describe('processNewWorkspace', () => {
            it('should return FAILURE when addWorkspace fails', async () => {
                StorageHelper.addWorkspace.mockResolvedValue(false);
                const result = await BackgroundMessageHandlers.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
                expect(result).toBe(MessageResponses.FAILURE);
            });
    
            it('should return SUCCESS when addWorkspace succeeds', async () => {
                StorageHelper.addWorkspace.mockResolvedValue(true);
                const result = await BackgroundMessageHandlers.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
                expect(result).toBe(MessageResponses.SUCCESS);
            });
        });

        describe('messageListener', () => {
            it('should process new workspace and send response when request type is MSG_NEW_WORKSPACE', async () => {
                const sendResponse = jest.fn();
                const request = { type: Messages.MSG_NEW_WORKSPACE };
    
                jest.spyOn(BackgroundMessageHandlers, 'processNewWorkspace').mockResolvedValue(MessageResponses.SUCCESS);
    
                const result = BackgroundMessageHandlers.messageListener(request, {}, sendResponse);
    
                expect(result).toBe(true);
                await Promise.resolve(); // wait for promises to resolve
                expect(sendResponse).toHaveBeenCalledWith(MessageResponses.SUCCESS);
            });
    
            it('should log unknown message and send response when request type is unknown', () => {
                const sendResponse = jest.fn();
                const request = { type: 'UNKNOWN' };
                const result = BackgroundMessageHandlers.messageListener(request, {}, sendResponse);
    
                expect(result).toBe(false);
                expect(sendResponse).toHaveBeenCalledWith(MessageResponses.UNKNOWN_MSG);
            });
        });

        describe('processOpenWorkspace', () => {
            it('should return an error response if uuid or windowId is not provided', async () => {
                const request = {
                    payload: {
                        data: {
                            uuid: null,
                            windowId: 1
                        }
                    }
                };

                const response = await BackgroundMessageHandlers.processOpenWorkspace(request);
                expect(response).toEqual(MessageResponses.ERROR);
            });

            it('should return an error response if windowId is not provided', async () => {
                const request = {
                    payload: {
                        data: {
                            uuid: '123',
                            windowId: null
                        }
                    }
                };

                const response = await BackgroundMessageHandlers.processOpenWorkspace(request);
                expect(response).toEqual(MessageResponses.ERROR);
            });

            it('should get the workspace, update it, clear its tabs, and return the serialized data', async () => {
                const request = {
                    payload: {
                        data: {
                            uuid: '123',
                            windowId: 1
                        }
                    }
                };

                const mockWorkspace = {
                    windowId: null,
                    serialize: jest.fn().mockReturnValue('serialized data'),
                    clearTabs: jest.fn()
                };

                (StorageHelper.getWorkspace).mockResolvedValue(mockWorkspace);
                (StorageHelper.setWorkspace).mockResolvedValue(undefined);

                const response = await BackgroundMessageHandlers.processOpenWorkspace(request);

                expect(StorageHelper.getWorkspace).toHaveBeenCalledWith('123');
                expect(mockWorkspace.windowId).toBe(1);
                expect(mockWorkspace.clearTabs).toHaveBeenCalled();
                expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(mockWorkspace);
                expect(response).toEqual({ data: 'serialized data' });
            });
        });
    });
});
