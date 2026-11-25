import { IWorkspaceJson } from "./interfaces/i-workspace-json";
import { Workspace } from './obj/workspace';

/** Position of a moved workspace relative to the destination workspace. */
export type WorkspacePlacement = 'before' | 'after';

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
        });
        return entries[Symbol.iterator]();
    }

    keys(): IterableIterator<string | number> {
        const keys: (string | number)[] = [];
        this.workspaces.forEach((_workspace, uuid) => {
            keys.push(uuid);
        });
        return keys[Symbol.iterator]();
    }

    values(): IterableIterator<Workspace> {
        return this.workspaces.values();
    }
    // #endregion

    /** Return display order while preserving map iteration order and window lookups. */
    public listInOrder(): Workspace[] {
        return this.orderedEntries().map(([, workspace]) => workspace);
    }

    private orderedEntries(): [string, Workspace][] {
        // Unranked workspaces follow explicit positions. Stable sorting preserves the sequence within ties.
        return [...this.workspaces].sort(([, left], [, right]) =>
            (left.order ?? Number.MAX_VALUE) - (right.order ?? Number.MAX_VALUE)
        );
    }

    /**
     * Move a workspace relative to another UUID and renumber the list after a successful move.
     *
     * @returns `moved` if positions changed, `unchanged` if the workspace was already
     * in that position, or `missing` if the UUIDs do not refer to two distinct entries.
     */
    public moveWorkspace(uuid: string, targetUuid: string, placement: WorkspacePlacement): "moved" | "unchanged" | "missing" {
        const entries = this.orderedEntries();
        const from = entries.findIndex(([key]) => key === uuid);
        const target = entries.findIndex(([key]) => key === targetUuid);
        if (from < 0 || target < 0 || from === target) {
            return "missing";
        }

        // Removing a source above the destination shifts the destination one slot earlier.
        const insertAt = target + (placement === 'after' ? 1 : 0) - (from < target ? 1 : 0);
        if (insertAt === from) return "unchanged";

        const [moved] = entries.splice(from, 1);
        entries.splice(insertAt, 0, moved);
        entries.forEach(([, workspace], index) => { workspace.order = index; });
        return "moved";
    }

    // #region Serialization
    /**
     * Serialize workspace records in map order. Deserialization rebuilds the window
     * lookup in that sequence, so sorting here could change which workspace owns a shared window ID.
     */
    serialize(): string {
        const workspacesArray = [...this.workspaces].map(([uuid, workspace]) => [uuid, workspace.toJsonObject()]);
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
