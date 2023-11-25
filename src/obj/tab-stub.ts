/**
 * Instead of trying to serialize the entire Tab object, we just serialize the
 * properties we need.
 */
export class TabStub {
    public id: number;
    public title: string;
    public url: string;
    public favIconUrl: string;
    public pinned: boolean;
    public windowId: number;

    constructor(id: number, title: string | undefined, url: string, favIconUrl: string | undefined, pinned: boolean, windowId: number) {
        this.id = id;
        this.title = title ?? "";
        this.url = url;
        this.favIconUrl = favIconUrl ?? "";
        this.pinned = pinned;
        this.windowId = windowId;
    }

    public static fromTab(tab: chrome.tabs.Tab): TabStub {
        if (tab.id == null || tab.id == undefined) {
            throw new Error("Tab id is null or undefined");
        }
        if (tab.url == null || tab.url == undefined) {
            throw new Error("Tab url is null or undefined");
        }
        return new TabStub(tab.id, tab?.title, tab.url, tab?.favIconUrl, tab.pinned, tab.windowId);
    }

    public static fromJson(json: any): TabStub {
        return new TabStub(json.id, json.title, json.url, json.favIconUrl, json.pinned, json.windowId);
    }
}