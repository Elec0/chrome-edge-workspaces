import { TabStub } from "./tab-stub";

export class Workspace {
    public id: number;
    public name: string;
    public tabs: TabStub[];
  
    constructor(id: number, name: string, tabs: TabStub[]) {
      this.id = id;
      this.name = name;
      this.tabs = tabs;
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