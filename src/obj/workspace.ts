import { TabStub } from "./tab-stub";
import { v4 as uuidv4 } from "uuid";

/**
 * Represents a workspace.
 */
export class Workspace {

    public uuid: string;
    public windowId: number;
    public name: string;
    private tabs: Map<number, TabStub>;
    // Future: May need a tab index => tab id map.

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

    
    /**
     * Adds a tab to the workspace.
     * @param tabStub - The tab stub to add. If not provided, it will be created from the chrome tab.
     * @param chromeTab - The chrome tab to create the tab stub from. If not provided, it will be created from the tab stub.
     * @throws Error if either tabStub or chromeTab is not defined.
     */
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

    public clearTabs(): void {
        this.tabs.clear();
    }

    /**
     * Retrieves a tab by its ID.
     * @param tabId The ID of the tab to retrieve.
     * @returns The tab with the specified ID, or undefined if not found.
     */
    public getTab(tabId: number): TabStub | undefined {
        return this.tabs.get(tabId);
    }

    /**
     * Retrieves an array of TabStub objects representing the tabs in the workspace.
     * 
     * @returns An array of TabStub objects.
     */
    public getTabs(): TabStub[] {
        return Array.from(this.tabs.values());
    }

    public toJsonObject(): any {
        let json = {
            id: this.windowId,
            name: this.name,
            uuid: this.uuid,
            tabs: this.getTabs().map((tab: TabStub) => tab.toJson())
        };
        return json;
    }

    /**
     * Creates a Workspace object from a JSON representation.
     * @param json - The JSON object representing the Workspace.
     * @returns A new Workspace object.
     */
    public static fromJson(json: any): Workspace {
        let workspace = new Workspace(json.id, json.name, undefined, undefined, json.uuid);
        if (json.tabs != null && json.tabs instanceof Array) {
            json.tabs.forEach((tab: any) => {
                workspace.addTab(TabStub.fromJson(tab));
            });
        }
        return workspace;
    }

    public serialize(): string {
        return JSON.stringify(this.toJsonObject());
    }

    public static deserialize(serialized: string): Workspace {
        return Workspace.fromJson(JSON.parse(serialized));
    }
}