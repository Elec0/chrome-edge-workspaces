import { Background } from "../../background";
import { MessageResponses } from "../../constants/message-responses";
import { Messages } from "../../constants/messages";
import { BackgroundMessageHandlers } from "../../messages/background-message-handlers";
import { StorageHelper } from "../../storage-helper";


// Mock the storage helper, can't be done in beforeEach
jest.mock('../../storage-helper');

describe("BackgroundMessageHandlers", () => {
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
            const result = await BackgroundMessageHandlers.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
            expect(result).toBe(MessageResponses.ERROR);
        });

        it('should return SUCCESS when addWorkspace succeeds', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(true);
            const result = await BackgroundMessageHandlers.processNewWorkspace({ payload: { workspaceName: 'test', windowId: 1 } });
            expect(result).toBe(MessageResponses.SUCCESS);
        });
    });

    describe('processNewWorkspaceFromWindow', () => {
        beforeEach(() => {
            jest.spyOn(Background, 'saveWindowTabsToWorkspace').mockResolvedValue(true);
        });
        it('should return SUCCESS when new workspace is created and tabs are saved', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(true);
            const request = { payload: { workspaceName: 'Test Workspace', windowId: 123 } };

            const response = await BackgroundMessageHandlers.processNewWorkspaceFromWindow(request);

            expect(response).toBe(MessageResponses.SUCCESS);
            expect(Background.saveWindowTabsToWorkspace).toHaveBeenCalledWith(123);
        });

        it('should return ERROR when processNewWorkspace fails', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(false); // Simulate failure in creating workspace
            const request = { payload: { workspaceName: 'Test Workspace', windowId: 123 } };

            const response = await BackgroundMessageHandlers.processNewWorkspaceFromWindow(request);

            expect(response).toBe(MessageResponses.ERROR);
            expect(Background.saveWindowTabsToWorkspace).not.toHaveBeenCalled();
        });
    });

    describe('messageListener', () => {
        it('should process new workspace and send response when request type is MSG_NEW_WORKSPACE', async () => {
            StorageHelper.addWorkspace.mockResolvedValue(true);
            const sendResponse = jest.fn();
            const request = { type: Messages.MSG_NEW_WORKSPACE, payload: { workspaceName: 'test', windowId: 1 } };

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
                    uuid: '123',
                    windowId: 1
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
            expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(mockWorkspace);
        });
    });

    describe("processClearWorkspaces", () => {
        it('should clear the workspaces, and report success', async () => {
            const request = {
                payload: {
                    uuid: '123'
                }
            };

            const mockWorkspace = {
                clearTabs: jest.fn()
            };

            (StorageHelper.getWorkspace).mockResolvedValue(mockWorkspace);

            const response = await BackgroundMessageHandlers.processClearWorkspaces(request);

            expect(StorageHelper.clearWorkspaces).toHaveBeenCalled();
            expect(response).toEqual(MessageResponses.SUCCESS);
        });
    });

    describe("processDeleteWorkspace", () => {
        it('should return an error response if uuid is not provided', async () => {
            const request = {
                payload: {
                    uuid: null
                }
            };

            const response = await BackgroundMessageHandlers.processDeleteWorkspace(request);
            expect(response).toEqual(MessageResponses.ERROR);
        });

        it('should get the workspace, delete it, and report success', async () => {
            const request = {
                payload: {
                    uuid: '123'
                }
            };

            (StorageHelper.removeWorkspace).mockResolvedValue(true);

            const response = await BackgroundMessageHandlers.processDeleteWorkspace(request);
            expect(StorageHelper.removeWorkspace).toHaveBeenCalledWith('123');
            expect(response).toEqual(MessageResponses.SUCCESS);
        });
    });

    describe("processRenameWorkspace", () => {
        it('should return an error response if uuid or newName is not provided', async () => {
            const request = {
                payload: {
                    uuid: null,
                    newName: 'test'
                }
            };

            const response = await BackgroundMessageHandlers.processRenameWorkspace(request);
            expect(response).toEqual(MessageResponses.ERROR);
        });

        it('should get the workspace, update its name, and report success', async () => {
            const request = {
                payload: {
                    uuid: '123',
                    newName: 'test'
                }
            };

            (StorageHelper.renameWorkspace).mockResolvedValue(true);

            const response = await BackgroundMessageHandlers.processRenameWorkspace(request);
            expect(StorageHelper.renameWorkspace).toHaveBeenCalledWith('123', 'test');
            expect(response).toEqual(MessageResponses.SUCCESS);
        });
    });

    describe("processGetWorkspace", () => {
        it('should return an error response if uuid is not provided', async () => {
            const request = {
                payload: {
                    uuid: null
                }
            };

            const response = await BackgroundMessageHandlers.processGetWorkspace(request);
            expect(response).toEqual(MessageResponses.ERROR);
        });

        it('should get the workspace, serialize it, and return the serialized data', async () => {
            const request = {
                payload: {
                    uuid: '123'
                }
            };

            const mockWorkspace = {
                serialize: jest.fn().mockReturnValue('serialized data')
            };
            (StorageHelper.getWorkspace).mockResolvedValue(mockWorkspace);

            const response = await BackgroundMessageHandlers.processGetWorkspace(request);
            expect(StorageHelper.getWorkspace).toHaveBeenCalledWith('123');
            expect(mockWorkspace.serialize).toHaveBeenCalled();
            expect(response).toEqual({ data: 'serialized data' });
        });
    });
});