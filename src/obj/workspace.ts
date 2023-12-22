import { TabStub } from "./tab-stub";
import { v4 as uuidv4 } from "uuid";

export class Workspace {

    public uuid: string;
    public windowId: number;
    public name: string;
    public tabs: TabStub[];

    constructor(windowId: number, name: string, tabs: chrome.tabs.Tab[] | undefined = undefined,
        tabStubs: TabStub[] | undefined = undefined, uuid: string | undefined = uuidv4()) {
        this.windowId = windowId;
        this.name = name;
        this.uuid = uuid;

        if (tabs != undefined) {
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
        return new Workspace(json.id, json.name, undefined, json.tabs);
      }
}