import { Constants } from '../../constants/constants';
import { TabStub } from "../../obj/tab-stub";
import { Workspace } from '../../obj/workspace';
import { BookmarkStorageHelper } from '../../storage/bookmark-storage-helper';

jest.mock('../../storage-helper');

describe('BookmarkStorageHelper', () => {
    beforeEach(() => {
        // Mock chrome.bookmarks API
        global.chrome = {
            bookmarks: {
                getTree: jest.fn().mockResolvedValue([
                    {
                        id: '1',
                        title: 'Bookmarks bar',
                        children: [
                            {
                                id: '2',
                                title: Constants.BOOKMARKS_OTHER_NAME,
                                children: []
                            }
                        ]
                    }
                ]),
                create: jest.fn().mockImplementation((bookmark) => Promise.resolve({ id: '3', ...bookmark })),
                search: jest.fn().mockResolvedValue([]),
            }
        };

        jest.spyOn(BookmarkStorageHelper, "isBookmarkSaveEnabled").mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getExtensionBookmarkFolder should retrieve or create the extension bookmark folder', async () => {
        const folder = await BookmarkStorageHelper.getExtensionBookmarkFolder();
        expect(folder).toBeDefined();
        expect(folder?.title).toBe(Constants.BOOKMARKS_FOLDER_NAME);
    });

    test('saveWorkspace should save the workspace bookmark folder correctly', async () => {
        const workspace = new Workspace(1, 'Test Workspace', []);
        await BookmarkStorageHelper.saveWorkspace(workspace);
        
        expect(chrome.bookmarks.create).toHaveBeenCalledWith({title: 'Test Workspace', parentId: expect.any(String)});
    });

    test('saveWorkspace should save the workspace bookmark tabs', async () => {
        const workspace = new Workspace(1, 'Test Workspace', [
            TabStub.fromTab({ id: '1', title: 'Tab 1', url: 'http://example.com' }),
            TabStub.fromTab({ id: '2', title: 'Tab 2', url: 'http://example2.com' })
        ]);
        await BookmarkStorageHelper.saveWorkspace(workspace);
        
        expect(chrome.bookmarks.create).toHaveBeenCalledWith({title: 'Test Workspace', parentId: expect.any(String)});
        expect(chrome.bookmarks.create).toHaveBeenCalledWith({title: 'Tab 1', url: 'http://example.com', parentId: expect.any(String)});
        expect(chrome.bookmarks.create).toHaveBeenCalledWith({title: 'Tab 2', url: 'http://example2.com', parentId: expect.any(String)});
    });

    test('nothing should be saved to bookmarks when the setting is disabled', async () => {
        jest.spyOn(BookmarkStorageHelper, "isBookmarkSaveEnabled").mockResolvedValue(false);

        const workspace = new Workspace(1, 'Test Workspace', []);
        await BookmarkStorageHelper.saveWorkspace(workspace);

        expect(chrome.bookmarks.create).not.toHaveBeenCalled();
    });
});