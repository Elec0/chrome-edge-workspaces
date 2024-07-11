import { v4 as uuidv4 } from "uuid";
import { IWorkspaceJson } from "../interfaces/i-workspace-json";
import { TabStub } from "./tab-stub";
import { TabGroupStub } from "./tab-group-stub";


/**
 * Represents a workspace.
 */
export class Workspace {

    public uuid: string;
    public windowId: number;
    public name: string;
    private tabs: Map<number, TabStub>;
    /** The tab groups that exist in this workspace/window, mapped by their IDs */
    private tabGroups: Map<number, TabGroupStub>;

    constructor(windowId: number, name: string, tabs: chrome.tabs.Tab[] | undefined = undefined,
        tabStubs: TabStub[] | undefined = undefined, uuid: string | undefined = uuidv4(), 
        tabGroups: Map<number, TabGroupStub> | undefined = undefined) {
        this.windowId = windowId;
        this.name = name;
        this.uuid = uuid;
        this.tabs = new Map<number, TabStub>();
        this.tabGroups = new Map<number, TabGroupStub>();

        if (tabs != undefined) {
            tabs.forEach((tab: chrome.tabs.Tab) => {
                this.addTab(undefined, tab);
            });
        } else if (tabStubs != undefined) {
            tabStubs.forEach((tabStub: TabStub) => {
                this.tabs.set(tabStub.id, tabStub);
            });
        }

        if (tabGroups != undefined) {
            this.tabGroups = tabGroups;
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
        if (tabStubToAdd.url == undefined || tabStubToAdd.url.length == 0) {
            console.warn(`Tab id=${ tabStubToAdd.id } URL is empty. This tab will not be added to the workspace.`);
        }
        else {
            this.tabs.set(tabStubToAdd.id, tabStubToAdd);
        }
    }

    public removeTab(tabId: number): void {
        this.tabs.delete(tabId);
    }

    public clearTabs(): void {
        this.tabs.clear();
    }

    /**
     * Retrieves a tab by its ID.
     * @param tabId - The ID of the tab to retrieve.
     * @returns The tab with the specified ID, or undefined if not found.
     */
    public getTab(tabId: number): TabStub | undefined {
        return this.tabs.get(tabId);
    }

    /**
     * Retrieves an array of TabStub objects representing the tabs in the workspace.
     * The tabs are ordered by their index property.
     * 
     * @returns An array of TabStub objects.
     */
    public getTabs(): TabStub[] {
        const tabs = Array.from(this.tabs.values());
        tabs.sort((a: TabStub, b: TabStub) => a.index - b.index);
        return tabs;
    }

    /**
     * Retrieves the tab groups in the workspace.
     * @returns An array of TabGroupStub objects.
     */
    public getTabGroups(): TabGroupStub[] {
        return Array.from(this.tabGroups.values());
    }

    /**
     * Adds a tab group to the workspace.
     * @param tabGroup - The tab group to add.
     */
    public addTabGroup(tabGroup: TabGroupStub): void {
        this.tabGroups.set(tabGroup.id, tabGroup);
    }

    /**
     * Removes a tab group from the workspace.
     * @param tabGroupId - The ID of the tab group to remove.
     */
    public removeTabGroup(tabGroupId: number): void {
        this.tabGroups.delete(tabGroupId);
    }

    /**
     * Renames the workspace.
     * @param newName - The new name of the workspace.
     */
    public updateName(newName: string): void {
        this.name = newName;
    }

    /**
     * Replace the tabs in the workspace with the provided tabs.
     */
    public setTabs(tabs: TabStub[]): void {
        this.clearTabs();
        tabs.forEach((tab: TabStub) => {
            this.addTab(tab);
        });
        this.ensureTabIndexesOrdered();
    }

    /**
     * Ensure that the tab.index values are ordered correctly from 0 to n.
     * 
     * The indexes can be out of order if there is an untrackable tab open.
     */
    private ensureTabIndexesOrdered(): void {
        let index = 0;
        this.getTabs().forEach(tab => {
            tab.index = index;
            index++;
        });
    }

    public toJsonObject(): object {
        this.ensureTabIndexesOrdered();
        return {
            id: this.windowId,
            name: this.name,
            uuid: this.uuid,
            tabs: this.getTabs().map((tab: TabStub) => tab.toJson()),
            tabGroups: this.getTabGroups().map((tabGroup: TabGroupStub) => tabGroup.toJson())
        };
    }

    /**
     * Creates a Workspace object from a JSON representation.
     * @param json - The JSON object representing the Workspace.
     * @returns A new Workspace object.
     */
    public static fromJson(json: IWorkspaceJson): Workspace {
        const workspace = new Workspace(json.id, json.name, undefined, undefined, json.uuid);
        if (json.tabs != null && json.tabs instanceof Array) {
            json.tabs.forEach((tab: string) => {
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