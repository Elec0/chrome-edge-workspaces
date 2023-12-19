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

    public addTab(tab: chrome.tabs.Tab): void {
        this.tabs.push(TabStub.fromTab(tab));
    }

    public removeTab(tabId: number): void {
        let index = this.tabs.findIndex((tab: TabStub) => tab.id == tabId);
        if (index != -1) {
            this.tabs.splice(index, 1);
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