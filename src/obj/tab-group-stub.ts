import { IStub } from "../interfaces/i-stub";

/**
 * Instead of trying to serialize the entire TabGroup object, we just serialize the
 * properties we need.
 */
export class TabGroupStub implements IStub {
    public id: number = -1;
    public title: string = "";
    public color: string = "";
    public collapsed: boolean = false;
    public windowId: number = -1;

    [key: string]: unknown;

    private static propertiesToExtract: string[] = [
        "id",
        "title",
        "color",
        "collapsed",
        "windowId",
    ];

    private constructor(tabGroup: Partial<chrome.tabGroups.TabGroup>) {
        for (const prop of TabGroupStub.propertiesToExtract) {
            if (tabGroup[prop as keyof chrome.tabGroups.TabGroup] !== undefined) {
                this[prop] = tabGroup[prop as keyof chrome.tabGroups.TabGroup];
            }
        }
    }

    public toJson(): string {
        return JSON.stringify(this);
    }

    public static fromTabGroup(tabGroup: chrome.tabGroups.TabGroup): TabGroupStub {
        return new TabGroupStub(tabGroup);
    }

    public static fromJson(json: string): TabGroupStub {
        return new TabGroupStub(JSON.parse(json));
    }

    public static fromTabGroups(tabGroups: chrome.tabGroups.TabGroup[]): TabGroupStub[] {
        return tabGroups.map(tabGroup => new TabGroupStub(tabGroup));
    }
}