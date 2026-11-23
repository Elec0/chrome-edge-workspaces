import { E2ECommon } from "./utils/e2e-common";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Page } from "puppeteer";

let common: E2ECommon;

async function waitForWorkspaceName(page: Page, workspaceName: string): Promise<void> {
    await page.waitForFunction(
        (name) => {
            const workspaces = Array.from(document.querySelectorAll("#workspaces-list .workspace-item"));
            return workspaces.some((workspaceItem) => {
                const text = workspaceItem.textContent ?? "";
                return text.includes(name);
            });
        },
        { timeout: 10000 },
        workspaceName
    );
}

async function clickEditByWorkspaceName(page: Page, workspaceName: string): Promise<void> {
    await page.waitForFunction(
        (name) => {
            return Array.from(document.querySelectorAll("#workspaces-list .workspace-item")).some((workspaceItem) => {
                return (workspaceItem.textContent ?? "").includes(name);
            });
        },
        { timeout: 10000 },
        workspaceName
    );

    await page.evaluate((name) => {
        const workspace = Array.from(document.querySelectorAll("#workspaces-list .workspace-item")).find((workspaceItem) => {
            return (workspaceItem.textContent ?? "").includes(name);
        });

        const editButton = workspace?.querySelector("#edit-button");
        if (editButton instanceof HTMLElement) {
            editButton.click();
        }
    }, workspaceName);
}

async function createWorkspaceFromCurrentWindow(page: Page, workspaceName: string): Promise<void> {
    await page.bringToFront();

    let newWorkspaceBtn = await page.$("#modal-new-workspace-from-window");
    for (let attempt = 0; attempt < 2 && !newWorkspaceBtn; attempt++) {
        const addBtn = await page.waitForSelector("#addWorkspace");
        expect(await addBtn?.isVisible()).toBe(true);
        await addBtn?.click();

        try {
            newWorkspaceBtn = await page.waitForSelector("#modal-new-workspace-from-window", { timeout: 10000 });
        }
        catch {
            newWorkspaceBtn = null;
        }
    }

    expect(await newWorkspaceBtn?.isVisible()).toBe(true);
    await newWorkspaceBtn?.click();

    await page.type("#modal-input-name", workspaceName);
    await page.click("#modal-submit");
    await page.waitForSelector("dialog", { hidden: true });
}

async function openTestTab(url: string): Promise<void> {
    const tab = await common.browser.newPage();
    await tab.setRequestInterception(true);
    tab.on("request", request => void request.respond({ body: "Workspace test page" }));
    await tab.goto(url);
}

async function waitForBookmark(page: Page, url: string): Promise<void> {
    await page.waitForFunction(async (bookmarkUrl) => (await chrome.bookmarks.search({ url: bookmarkUrl })).length > 0,
        { polling: 100, timeout: 10000 }, url);
}

async function renameWorkspace(page: Page, oldName: string, newName: string): Promise<void> {
    await clickEditByWorkspaceName(page, oldName);
    const renameDialog = await page.waitForSelector("dialog");
    expect(await renameDialog?.isVisible()).toBe(true);
    await page.type("#modal-input-name", newName);
    await page.click("#modal-submit");
    await waitForWorkspaceName(page, newName);
}

jest.setTimeout(60 * 1000);

beforeEach(async () => {
    common = new E2ECommon();
    await common.beforeEach();
});

// Note: this is how you can get console logs from the page.
// page.on('console', msg => console.log('PAGE LOG:', msg.text()));

afterEach(async () => {
    await common.afterEach();
});

test("renaming a workspace updates its bookmark folder immediately", async () => {
    const page = common.page;
    const firstUrl = "https://example.test/first";
    await openTestTab(firstUrl);

    await createWorkspaceFromCurrentWindow(page, "test workspace");

    // Verify there is a new workspace in the list, and that it has the correct name
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "test workspace");
    await waitForBookmark(page, firstUrl);

    const getBookmarkFolders = () => page.evaluate(async () => {
        const [root] = await chrome.bookmarks.getTree();
        const extensionFolder = root.children?.flatMap(node => node.children ?? [])
            .find(node => node.title === "Edge Workspaces (read-only)");
        return extensionFolder?.children ?? [];
    });
    const [originalFolder] = await getBookmarkFolders();
    expect(originalFolder.title).toBe("test workspace");
    expect(originalFolder.children?.map(node => node.url)).toContain(firstUrl);

    await renameWorkspace(page, "test workspace", "renamed workspace");
    expect(await getBookmarkFolders()).toEqual([
        expect.objectContaining({
            id: originalFolder.id,
            title: "renamed workspace",
            children: originalFolder.children,
        }),
    ]);

    const nextUrl = "https://example.test/second";
    await openTestTab(nextUrl);
    await waitForBookmark(page, nextUrl);
    expect((await getBookmarkFolders()).map(node => node.title)).toEqual(["renamed workspace"]);
});

test("a rejected bookmark update shows a warning and keeps the new workspace name", async () => {
    const page = common.page;
    const url = "https://example.test/bookmark-warning";
    await openTestTab(url);
    await createWorkspaceFromCurrentWindow(page, "test workspace");
    await waitForBookmark(page, url);

    const extensionHost = new URL(page.url()).host;
    const target = await common.browser.waitForTarget(candidate => candidate.type() === "service_worker" &&
        new URL(candidate.url()).host === extensionHost);
    const worker = await target.worker();
    expect(worker).not.toBeNull();
    await worker!.evaluate(() => {
        chrome.bookmarks.update = async () => { throw new Error("Cannot modify this bookmark folder."); };
    });

    await renameWorkspace(page, "test workspace", "renamed workspace");
    const warning = await page.waitForSelector('[role="alert"]', { visible: true });
    const warningText = await warning?.evaluate(element => element.textContent);
    expect(warningText).toContain("Workspace renamed.");
    expect(warningText).toContain("Cannot modify this bookmark folder.");
});
