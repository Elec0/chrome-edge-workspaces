import { Workspace } from '../../obj/workspace';
import { StorageHelper } from '../../storage-helper';
import { TabStub } from '../../obj/tab-stub';
import { Utils } from "../../utils";
import { TabGroupStub } from "../../obj/tab-group-stub";

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

    describe('getTabGroupsFromWindow', () => {
        it('should return the tab groups of the window', async () => {
            const windowId = 1;
            const tabGroupData = [
                { collapsed: false, color: 'blue', title: 'group1', id: 1, windowId },
                { collapsed: false, color: 'grey', title: 'group2', id: 2, windowId },
                { collapsed: false, color: 'pink', title: 'group3', id: 3, windowId },
            ];
            global.chrome = {
                tabGroups: {
                    query: jest.fn().mockResolvedValue(tabGroupData),
                }
            };

            const tabGroups = await Utils.getTabGroupsFromWindow(windowId);

            expect(tabGroups).toEqual(tabGroupData);
        });
    });

    describe('setWorkspaceTabGroups', () => {
        it('should set the tab groups of the workspace and save it', async () => {
            const tabGroups = [
                { collapsed: false, color: 'blue', title: 'group1', id: 1 },
                { collapsed: false, color: 'grey', title: 'group2', id: 2 },
                { collapsed: false, color: 'pink', title: 'group3', id: 3 },
            ];
            const mockTabs = [{ id: 1, windowId: 1, url: 'http://test.com' }];
            const workspace = new Workspace('test', 1);

            StorageHelper.setWorkspace = jest.fn().mockResolvedValue(undefined);
            TabStub.fromTabs = jest.fn().mockReturnValue(mockTabs);
            TabGroupStub.fromTabGroups = jest.fn().mockReturnValue(tabGroups);

            await Utils.setWorkspaceTabsAndGroups(workspace, mockTabs, tabGroups);

            expect(workspace.getTabGroups()).toEqual(tabGroups);
            expect(StorageHelper.setWorkspace).toHaveBeenCalledWith(workspace);
        });
    });
});