import { E2ECommon } from "./utils/e2e-common";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Page } from "puppeteer";

let common: E2ECommon;

async function waitForWorkspaceName(page: Page, workspaceName: string, timeout = 10000): Promise<void> {
    await page.waitForFunction(
        (name) => {
            const workspaces = Array.from(document.querySelectorAll("#workspaces-list .workspace-item"));
            return workspaces.some((workspaceItem) => {
                const text = workspaceItem.textContent ?? "";
                return text.includes(name);
            });
        },
        { timeout },
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

async function createWorkspaceInNewWindow(page: Page, workspaceName: string): Promise<Page> {
    await page.bringToFront();

    let newWorkspaceBtn = await page.$("#modal-new-workspace");
    for (let attempt = 0; attempt < 2 && !newWorkspaceBtn; attempt++) {
        const addBtn = await page.waitForSelector("#addWorkspace");
        expect(await addBtn?.isVisible()).toBe(true);
        await addBtn?.click();

        try {
            newWorkspaceBtn = await page.waitForSelector("#modal-new-workspace", { timeout: 10000 });
        }
        catch {
            newWorkspaceBtn = null;
        }
    }

    expect(await newWorkspaceBtn?.isVisible()).toBe(true);
    const newWindowPromise = common.waitForNewWindowPage();
    await newWorkspaceBtn?.click();

    await page.type("#modal-input-name", workspaceName);
    await page.click("#modal-submit");
    await page.waitForSelector("dialog", { hidden: true });

    // Ensure the browser window creation path completed.
    return await newWindowPromise;
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

test("Material icon actions have accessible labels and open their dialogs from the keyboard", async () => {
    const page = common.page;
    await createWorkspaceFromCurrentWindow(page, "Keyboard workspace");
    await waitForWorkspaceName(page, "Keyboard workspace");

    const actions = [
        ["#addWorkspace", "Add workspace", "Enter", "#modal-new-workspace-from-window"],
        ["#settings-button", "Settings", "Space", "#modal-settings-debug"],
        ["#edit-button", "Rename Keyboard workspace", "Enter", "#modal-input-name"],
        ["#delete-button", "Delete Keyboard workspace", "Space", "#delete-workspace-message"],
    ] as const;

    for (const [selector, label, key, dialogControl] of actions) {
        const icon = await page.$eval(selector, element => ({
            role: element.getAttribute("role"),
            tabIndex: element.getAttribute("tabindex"),
            label: element.getAttribute("aria-label"),
            title: element.getAttribute("title"),
        }));
        expect(icon).toEqual({ role: "button", tabIndex: "0", label, title: label });
        await page.focus(selector);
        await page.keyboard.press(key);
        await page.waitForSelector(`dialog[open] ${dialogControl}`, { visible: true, timeout: 5000 });
        await page.keyboard.press("Escape");
        await page.waitForSelector("dialog[open]", { hidden: true, timeout: 5000 });
    }
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

    // Dismiss any browser prompt so a regression fails at the in-popup dialog assertion.
    page.on("dialog", (dialog) => void dialog.dismiss());
    await clickWorkspaceActionByName(page, "test workspace", "#delete-button");
    const confirmation = await page.waitForSelector("dialog[open]", { timeout: 5000 });
    expect(await confirmation?.evaluate((dialog) => dialog.textContent)).toContain("test workspace");
    await waitForWorkspaceName(page, "test workspace");
    await page.click("dialog[open] button[value='delete']");
    await page.waitForSelector("dialog", { hidden: true });

    await page.waitForFunction((name) => {
        const items = Array.from(document.querySelectorAll("#workspaces-list .workspace-item"));
        return items.every((workspaceItem) => !(workspaceItem.textContent ?? "").includes(name));
    }, { timeout: 10000 }, "test workspace");
});

test("creating a new workspace with 'New workspace' opens a new browser window", async () => {
    const page = common.page;

    const newWindowPage = await createWorkspaceInNewWindow(page, "new-window workspace");
    expect(newWindowPage).toBeDefined();
});

test.each(["Cancel", "Escape"])("dismissing workspace deletion with %s keeps it in the list", async (dismissal) => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "cancel-delete workspace");
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "cancel-delete workspace");

    page.on("dialog", (dialog) => void dialog.dismiss());
    await clickWorkspaceActionByName(page, "cancel-delete workspace", "#delete-button");
    await page.waitForSelector("dialog[open]", { timeout: 5000 });
    if (dismissal === "Escape") {
        await page.keyboard.press("Escape");
    } else {
        await page.click("dialog[open] button[value='cancel']");
    }
    await page.waitForSelector("dialog", { hidden: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForWorkspaceName(page, "cancel-delete workspace");
});

test("opening a workspace keeps the list stable", async () => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "open-workspace test");
    await page.waitForSelector("#workspaces-list");
    await waitForWorkspaceName(page, "open-workspace test");

    await clickWorkspaceByName(page, "open-workspace test");

    await page.waitForFunction((name) => {
        const items = Array.from(document.querySelectorAll("#workspaces-list .workspace-item"));
        return items.filter((workspaceItem) => (workspaceItem.textContent ?? "").includes(name)).length === 1;
    }, { timeout: 10000 }, "open-workspace test");
});
