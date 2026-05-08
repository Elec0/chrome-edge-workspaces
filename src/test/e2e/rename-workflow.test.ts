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
    const addBtn = await page.waitForSelector("#addWorkspace");
    expect(await addBtn?.isVisible()).toBe(true);
    await addBtn?.click();

    const newWorkspaceBtn = await page.waitForSelector("#modal-new-workspace-from-window");
    expect(await newWorkspaceBtn?.isVisible()).toBe(true);
    await newWorkspaceBtn?.click();

    await page.type("#modal-input-name", workspaceName);
    await page.click("#modal-submit");
    await page.waitForSelector("dialog", { hidden: true });
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

test("creating workspace and renaming it works", async () => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "test workspace");

    // Verify there is a new workspace in the list, and that it has the correct name
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "test workspace");

    // Edit the workspace name
    await clickEditByWorkspaceName(page, "test workspace");

    // Verify the dialog is visible
    const renameDialog = await page.waitForSelector("dialog");
    expect(await renameDialog?.isVisible()).toBe(true);

    // Enter the name of the new workspace
    await page.type("#modal-input-name", "renamed workspace");

    // Click the submit input
    await page.click("#modal-submit");

    // Verify the workspace name has been updated
    await waitForWorkspaceName(page, "renamed workspace");
});
