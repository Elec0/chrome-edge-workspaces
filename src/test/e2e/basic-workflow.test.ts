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

async function clickWorkspaceByName(page: Page, workspaceName: string): Promise<void> {
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

        const openButton = workspace?.querySelector(".workspace-item-interior");
        if (openButton instanceof HTMLElement) {
            openButton.click();
        }
    }, workspaceName);
}

async function clickWorkspaceActionByName(page: Page, workspaceName: string, actionSelector: string): Promise<void> {
    await page.waitForFunction(
        (name) => {
            return Array.from(document.querySelectorAll("#workspaces-list .workspace-item")).some((workspaceItem) => {
                return (workspaceItem.textContent ?? "").includes(name);
            });
        },
        { timeout: 10000 },
        workspaceName
    );

    await page.evaluate((name, selector) => {
        const workspace = Array.from(document.querySelectorAll("#workspaces-list .workspace-item")).find((workspaceItem) => {
            return (workspaceItem.textContent ?? "").includes(name);
        });

        const actionButton = workspace?.querySelector(selector);
        if (actionButton instanceof HTMLElement) {
            actionButton.click();
        }
    }, workspaceName, actionSelector);
}

async function createWorkspaceFromCurrentWindow(page: Page, workspaceName: string): Promise<void> {
    await page.bringToFront();

    let newWorkspaceBtn = await page.$("#modal-new-workspace-from-window");
    for (let attempt = 0; attempt < 2 && !newWorkspaceBtn; attempt++) {
        const settingsBtn = await page.waitForSelector("#addWorkspace");
        expect(await settingsBtn?.isVisible()).toBe(true);
        await settingsBtn?.click();

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

test("creating a new workspace from the current window adds it to the list", async () => {
    const page = common.page;

    // Add a few tabs in the current window to ensure the workspace has content.
    const urls = ["https://www.google.com", "https://www.bing.com", "https://www.yahoo.com"];
    for (const url of urls) {
        const newPage = await common.browser.newPage();
        await newPage.goto(url, { waitUntil: "domcontentloaded" });
    }

    await page.bringToFront();
    await createWorkspaceFromCurrentWindow(page, "test workspace");
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "test workspace");
});

test("clicking an existing workspace does not error", async () => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "test workspace");
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "test workspace");

    // Clicking the workspace should be safe and not remove it from the list.
    await clickWorkspaceByName(page, "test workspace");
    await waitForWorkspaceName(page, "test workspace");
});

test("deleting a workspace removes it from the list", async () => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "test workspace");
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "test workspace");

    await page.evaluate(() => {
        window.confirm = () => true;
    });

    await clickWorkspaceActionByName(page, "test workspace", "#delete-button");

    await page.waitForFunction((name) => {
        const items = Array.from(document.querySelectorAll("#workspaces-list .workspace-item"));
        return items.every((workspaceItem) => !(workspaceItem.textContent ?? "").includes(name));
    }, { timeout: 10000 }, "test workspace");
});