import { TabStub } from "../../obj/tab-stub";
import { Workspace } from "../../obj/workspace";
import { WorkspaceStorage } from "../../workspace-storage";

describe('WorkspaceStorage', () => {
    let workspaceStorage;
    let workspace;

    beforeEach(() => {
        workspaceStorage = new WorkspaceStorage();
        workspace = new Workspace(); // Initialize Workspace with appropriate values
    });
    afterEach(() => {
        workspaceStorage.clear();
    });

    test('should initialize with size 0', () => {
        expect(workspaceStorage.size).toBe(0);
    });

    test('should add a workspace and increase size', () => {
        workspaceStorage.set('test', workspace);
        expect(workspaceStorage.size).toBe(1);
    });

    test('should retrieve a workspace by key', () => {
        workspaceStorage.set('test', workspace);
        expect(workspaceStorage.get('test')).toBe(workspace);
    });

    test('should delete a workspace by key', () => {
        workspaceStorage.set('test', workspace);
        workspaceStorage.delete('test');
        expect(workspaceStorage.get('test')).toBeUndefined();
    });

    test('should clear all workspaces', () => {
        workspaceStorage.set('test', workspace);
        workspaceStorage.clear();
        expect(workspaceStorage.size).toBe(0);
    });

    test('should check if a workspace exists', () => {
        workspaceStorage.set('test', workspace);
        expect(workspaceStorage.has('test')).toBe(true);
    });

    test('should iterate over workspaces', () => {
        workspaceStorage.set('test', workspace);
        const entries = [...workspaceStorage];
        expect(entries).toEqual([['test', workspace], [undefined, workspace]]);
    });

    test('should return all keys', () => {
        workspaceStorage.set('test', workspace);
        const keys = [...workspaceStorage.keys()];
        expect(keys).toEqual(['test']);
    });

    test('should return all values', () => {
        workspaceStorage.set('test', workspace);
        const values = [...workspaceStorage.values()];
        expect(values).toEqual([workspace]);
    });

    test('should get a workspace by UUID', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000'; // replace with actual UUID
        workspace.uuid = uuid;
        workspaceStorage.set(uuid, workspace);
        expect(workspaceStorage.get(uuid)).toBe(workspace);
    });

    test('should get a workspace by windowId', () => {
        const windowId = 1; // replace with actual windowId
        workspace.windowId = windowId;
        workspaceStorage.set('test', workspace);
        expect(workspaceStorage.get(windowId)).toBe(workspace);
    });

    test('should set workspace by UUID and get by windowId', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000'; // replace with actual UUID
        workspace.uuid = uuid;
        workspaceStorage.set(uuid, workspace);
        expect(workspaceStorage.get(uuid)).toBe(workspace);
        expect(workspaceStorage.get(workspace.windowId)).toBe(workspace);
    });

    test('should set workspace by windowId and get by UUID', () => {
        const windowId = 1; // replace with actual windowId
        workspace.windowId = windowId;
        workspaceStorage.set(windowId, workspace);
        expect(workspaceStorage.get(windowId)).toBe(workspace);
        expect(workspaceStorage.get(workspace.uuid)).toBe(workspace);
    });

    test('should serialize and deserialize correctly', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        workspace.uuid = uuid;
        workspace.windowId = 1;
        workspace.tabs = [new TabStub({ url: 'https://example.com', id: 12, index: 0})]
        workspaceStorage.set(uuid, workspace);

        const serialized = workspaceStorage.serialize();
        const newWorkspaceStorage = new WorkspaceStorage();
        newWorkspaceStorage.deserialize(serialized);

        expect(newWorkspaceStorage.get(uuid)).toEqual(workspace);
        expect(newWorkspaceStorage.get(workspace.windowId)).toEqual(workspace);
        expect(newWorkspaceStorage.size).toBe(1);
        expect(newWorkspaceStorage.get(uuid).tabs[0].url).toBe('https://example.com');
        expect(newWorkspaceStorage.get(uuid).tabs[0].id).toBe(12);
    });

    test('should handle serialization and deserialization of empty storage', () => {
        const serialized = workspaceStorage.serialize();
        const newWorkspaceStorage = new WorkspaceStorage();
        newWorkspaceStorage.deserialize(serialized);

        expect(newWorkspaceStorage.size).toBe(0);
    });
});