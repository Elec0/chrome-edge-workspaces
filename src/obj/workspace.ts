import { TabStub } from "./tab-stub";

export class Workspace {
    public id: number;
    public name: string;
    public tabs: TabStub[];

    constructor(id: number, name: string, tabs: chrome.tabs.Tab[] | null = null, tabStubs: TabStub[] | null = null) {
        this.id = id;
        this.name = name;
        if (tabs != null) {
            this.tabs = [];
            tabs.forEach((tab: chrome.tabs.Tab) => {
                this.tabs.push(TabStub.fromTab(tab));
            });
        } else {
            this.tabs = tabStubs ?? [];
        }
    }

    public static fromJson(json: any): Workspace {
        let tabs: TabStub[] = [];
        if (json.tabs != null && json.tabs instanceof Array) {
            json.tabs.forEach((tab: any) => {
                tabs.push(TabStub.fromJson(tab));
            });
        }
        return new Workspace(json.id, json.name, json.tabs);
    }
}