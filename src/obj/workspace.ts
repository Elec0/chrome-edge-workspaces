import { TabStub } from "./tab-stub";
import { v4 as uuidv4 } from "uuid";

export class Workspace {
    
    public uuid: string = "";
    public id: number;
    public name: string;
    public tabs: TabStub[];

    constructor(id: number, name: string, tabs: chrome.tabs.Tab[] | null = null, tabStubs: TabStub[] | null = null, uuid: string | undefined = "") {
        this.id = id;
        this.name = name;

        this.handleUUID(uuid);

        if (tabs != null) {
            this.tabs = [];
            tabs.forEach((tab: chrome.tabs.Tab) => {
                this.tabs.push(TabStub.fromTab(tab));
            });
        } else {
            this.tabs = tabStubs ?? [];
        }
    }
    
    /** Generate a UUID if one is not provided. */
    private handleUUID(uuid: string | undefined): void {
        if (uuid == undefined || uuid == "") {
            this.uuid = uuidv4();
        } 
        else {
            this.uuid = uuid;
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
        return new Workspace(json.id, json.name, null, json.tabs);
    }
}