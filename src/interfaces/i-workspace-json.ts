
// Define an interface for the JSON object
export interface IWorkspaceJson {
    id: number;
    name: string;
    uuid: string;
    tabs: string[];
    tabGroups: string[];
    lastUpdated?: number;
    /** Zero-based display position. Older exports may omit it. */
    order?: number;
}

