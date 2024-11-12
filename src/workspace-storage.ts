import { IWorkspaceJson } from "./interfaces/i-workspace-json";
import { Workspace } from './obj/workspace';

/**
 * Represents a storage for workspaces, implementing the Map interface.
 * 
 * The keys are either the workspace uuid or the workspace's windowId.
 */
export class WorkspaceStorage implements Map<string | number, Workspace> {
    private workspaces: Map<string, Workspace>;
    private windowIdToUuid: Map<number, string>;

    [Symbol.toStringTag] = 'WorkspaceStorage' as const; // Initialize the property

    constructor() {
        this.workspaces = new Map();
        this.windowIdToUuid = new Map();
    }

    // #region Map implementation
    get size(): number {
        return this.workspaces.size;
    }

    clear(): void {
        this.workspaces.clear();
        this.windowIdToUuid.clear();
    }

    delete(key: string | number): boolean {
        if (typeof key === 'string') {
            const workspace = this.workspaces.get(key);
            if (workspace) {
                this.windowIdToUuid.delete(workspace.windowId);
                return this.workspaces.delete(key);
            }
        } else {
            const uuid = this.windowIdToUuid.get(key);
            if (uuid) {
                this.workspaces.delete(uuid);
                return this.windowIdToUuid.delete(key);
            }
        }
        return false;
    }

    forEach(callbackfn: (value: Workspace, key: string | number, map: Map<string | number, Workspace>) => void, thisArg?: unknown): void {
        this.workspaces.forEach((value, key) => {
            callbackfn.call(thisArg, value, key, this);
        });
    }

    get(key: string | number): Workspace | undefined {
        if (typeof key === 'string') {
            return this.workspaces.get(key);
        } else {
            const uuid = this.windowIdToUuid.get(key);
            return uuid ? this.workspaces.get(uuid) : undefined;
        }
    }

    has(key: string | number): boolean {
        if (typeof key === 'string') {
            return this.workspaces.has(key);
        } else {
            return this.windowIdToUuid.has(key) && this.workspaces.has(this.windowIdToUuid.get(key) as string);
        }
    }

    /**
     * Sets a workspace in the storage.
     * 
     * @param key - The key to associate with the workspace. Can be either the workspace uuid or the workspace's windowId.
     * @param value - The workspace to be stored.
     * @returns The updated instance of the workspace storage.
     */
    set(key: string | number, value: Workspace): this {
        if (typeof key === 'string') {
            this.workspaces.set(key, value);
            this.windowIdToUuid.set(value.windowId, key);
        } else {
            this.workspaces.set(value.uuid, value);
            this.windowIdToUuid.set(key, value.uuid);
        }
        return this;
    }

    [Symbol.iterator](): IterableIterator<[string | number, Workspace]> {
        return this.entries();
    }

    entries(): IterableIterator<[string | number, Workspace]> {
        const entries: [string | number, Workspace][] = [];
        this.workspaces.forEach((workspace, uuid) => {
            entries.push([uuid, workspace]);
            entries.push([workspace.windowId, workspace]);
        });
        return entries[Symbol.iterator]();
    }

    keys(): IterableIterator<string | number> {
        const keys: (string | number)[] = [];
        this.workspaces.forEach((workspace, uuid) => {
            keys.push(uuid);
            keys.push(workspace.windowId);
        });
        return keys[Symbol.iterator]();
    }

    values(): IterableIterator<Workspace> {
        return this.workspaces.values();
    }
    // #endregion

    // #region Serialization
    serialize(): string {
        const workspacesArray: [string, object][] = [];
        this.workspaces.forEach((workspace, uuid) => {
            workspacesArray.push([uuid, workspace.toJsonObject()]);
        });
        const windowIdToUuidArray = Array.from(this.windowIdToUuid.entries());
        return JSON.stringify({ workspaces: workspacesArray, windowIdToUuid: windowIdToUuidArray });
    }   

    deserialize(serialized: string): void {
        const data = JSON.parse(serialized);
        // This turns them into maps, but they're still just data objects, not Workspace objects.
        const workspaces = new Map(data.workspaces);

        // Convert the workspaces to Workspace objects, and set them in the storage.
        // This also sets the windowIdToUuid map.
        workspaces.forEach((workspace, uuid) => {
            this.set(uuid as string, Workspace.fromJson(workspace as IWorkspaceJson));
        });
    }
    // #endregion
}