import { Workspace } from '../../obj/workspace';
import { StorageHelper } from '../../storage-helper';
import { TabStub } from '../../obj/tab-stub';
import { Utils } from "../../utils";

jest.mock('../../storage-helper');
jest.mock('../../obj/tab-stub');

describe('Utils', () => {
    describe('getTabsFromWindow', () => {
        it('should call chrome.tabs.query with the correct windowId', async () => {
            const mockTabs = [{ id: 1, windowId: 1, url: 'http://test.com' }];
            global.chrome = {
                tabs: {
                    query: jest.fn().mockResolvedValue(mockTabs),
                },
            };

            const windowId = 1;
            const tabs = await Utils.getTabsFromWindow(windowId);

            expect(global.chrome.tabs.query).toHaveBeenCalledWith({ windowId });
            expect(tabs).toEqual(mockTabs);
        });
    });

    describe('setWorkspaceTabs', () => {
        it('should set the tabs of the workspace and save it', async () => {
            const mockTabs = [{ id: 1, windowId: 1, url: 'http://test.com' }];
            const workspace = new Workspace('test', 1);

            TabStub.fromTabs = jest.fn().mockReturnValue(mockTabs);
            StorageHelper.setWorkspace = jest.fn().mockResolvedValue(undefined);

            await Utils.setWorkspaceTabs(workspace, mockTabs);

            expect(workspace.getTabs()).toEqual(mockTabs);
            expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(workspace);
        });
    });
});