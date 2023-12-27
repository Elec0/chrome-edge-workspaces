import { TabStub } from "./tab-stub";
import { v4 as uuidv4 } from "uuid";

export class Workspace {

    public uuid: string;
    public windowId: number;
    public name: string;
    private tabs: Map<number, TabStub>;

    constructor(windowId: number, name: string, tabs: chrome.tabs.Tab[] | undefined = undefined,
        tabStubs: TabStub[] | undefined = undefined, uuid: string | undefined = uuidv4()) {
        this.windowId = windowId;
        this.name = name;
        this.uuid = uuid;
        this.tabs = new Map<number, TabStub>();

        if (tabs != undefined) {
            tabs.forEach((tab: chrome.tabs.Tab) => {
                this.addTab(undefined, tab);
            });
        } else if (tabStubs != undefined) {
            tabStubs.forEach((tabStub: TabStub) => {
                this.tabs.set(tabStub.id, tabStub);
            });
        }
    }

    public addTab(tabStub?: TabStub, chromeTab?: chrome.tabs.Tab): void {
        let tabStubToAdd: TabStub;
        if (tabStub != undefined) {
            tabStubToAdd = tabStub;
        } else if (chromeTab != undefined) {
            tabStubToAdd = TabStub.fromTab(chromeTab);
        } else {
            throw new Error("Either tabStub or tab must be defined.");
        }
        this.tabs.set(tabStubToAdd.id, tabStubToAdd);
    }

    public removeTab(tabId: number): void {
        this.tabs.delete(tabId);
    }

    public getTab(tabId: number): TabStub | undefined {
        return this.tabs.get(tabId);
    }

    public getTabs(): TabStub[] {
        return Array.from(this.tabs.values());
    }

    public static fromJson(json: any): Workspace {
        let workspace = new Workspace(json.id, json.name, undefined, undefined, json.uuid);
        if (json.tabs != null && json.tabs instanceof Array) {
            json.tabs.forEach((tab: any) => {
                workspace.addTab(TabStub.fromJson(tab));
            });
        }
        return workspace;
    }
}