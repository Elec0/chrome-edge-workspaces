/**
 * Instead of trying to serialize the entire Tab object, we just serialize the
 * properties we need.
 */
export class TabStub {
    public id: number = -1;
    public index: number = -1;;
    public title: string = "";
    public url: string = "";
    public favIconUrl: string = "";
    public pinned: boolean = false;
    public windowId: number = -1;

    [key: string]: any;

    private static propertiesToExtract: string[] = [
        "id",
        "index",
        "title",
        "url",
        "favIconUrl",
        "pinned",
        "windowId",
    ];

    private constructor(tab: Partial<chrome.tabs.Tab>) {
        for (const prop of TabStub.propertiesToExtract) {
            if (tab[prop as keyof chrome.tabs.Tab] !== undefined) {
                this[prop] = tab[prop as keyof chrome.tabs.Tab];
            }
        }
    }

    public toJson(): any {
        return JSON.stringify(this);
    }

    public static fromTab(tab: chrome.tabs.Tab): TabStub {
        return new TabStub(tab);
    }

    public static fromJson(json: any): TabStub {
        return new TabStub(json);
    }

    public static fromTabs(tabs: chrome.tabs.Tab[]): TabStub[] {
        return tabs.map(tab => new TabStub(tab));
    }
}