import { IStub } from "../interfaces/i-stub";

/**
 * Instead of trying to serialize the entire Tab object, we just serialize the
 * properties we need.
 */
export class TabStub implements IStub {
    public id: number = -1;
    public index: number = -1;
    public title: string = "";
    public url: string = "";
    public favIconUrl: string = "";
    public pinned: boolean = false;
    public windowId: number = -1;
    public active: boolean = false;
    public mutedInfo?: chrome.tabs.MutedInfo;
    public groupId?: number = chrome.tabGroups?.TAB_GROUP_ID_NONE;

    [key: string]: unknown;

    private static propertiesToExtract: string[] = [
        "id",
        "index",
        "title",
        "url",
        "favIconUrl",
        "pinned",
        "windowId",
        "active",
        "mutedInfo",
        "groupId"
    ];

    private constructor(tab: Partial<chrome.tabs.Tab>) {
        for (const prop of TabStub.propertiesToExtract) {
            if (tab[prop as keyof chrome.tabs.Tab] !== undefined) {
                this[prop] = tab[prop as keyof chrome.tabs.Tab];
            }
        }
    }

    /**
     * Used to serialize the TabStub to a JSON string.
     * 
     * @param replacer - An optional parameter that can be used to manipulate the serialization process.
     * @returns 
     */
    public toJson(replacer?: (this: unknown, key: string, value: unknown) => unknown): string {
        return JSON.stringify(this, replacer);
    }

    public static fromTab(tab: chrome.tabs.Tab): TabStub {
        return new TabStub(tab);
    }

    public static fromJson(json: string): TabStub {
        return new TabStub(JSON.parse(json));
    }

    public static fromTabs(tabs: chrome.tabs.Tab[]): TabStub[] {
        return tabs.map(tab => new TabStub(tab));
    }
}