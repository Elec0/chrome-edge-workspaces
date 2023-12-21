import { Workspace } from './obj/workspace';

export class WorkspaceStorage implements Map<string | number, Workspace> {
    private workspaces: Map<string, Workspace>;
    private windowIdToUuid: Map<number, string>;

    [Symbol.toStringTag]: 'WorkspaceStorage' = 'WorkspaceStorage'; // Initialize the property

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

    forEach(callbackfn: (value: Workspace, key: string | number, map: Map<string | number, Workspace>) => void, thisArg?: any): void {
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
            return this.windowIdToUuid.has(key);
        }
    }

    set(key: string | number, value: Workspace): this {
        if (typeof key === 'string') {
            this.workspaces.set(key, value);
        } else {
            this.windowIdToUuid.set(key, value.uuid);
            this.workspaces.set(value.uuid, value);
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


}