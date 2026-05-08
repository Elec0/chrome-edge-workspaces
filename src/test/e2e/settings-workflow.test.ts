import { E2ECommon } from "./utils/e2e-common";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Page } from "puppeteer";
import path from "path";

let common: E2ECommon;
const IMPORT_FIXTURE_PATH = path.resolve(process.cwd(), "src/test/data/import-settings-data.json");

async function openSettingsDialog(page: Page): Promise<void> {
    await page.bringToFront();

    let settingsDialog = await page.$("#modal-settings-bookmark-save");
    for (let attempt = 0; attempt < 3 && !settingsDialog; attempt++) {
        const settingsBtn = await page.waitForSelector("#settings-button");
        expect(await settingsBtn?.isVisible()).toBe(true);
        await page.evaluate(() => {
            const button = document.querySelector("#settings-button");
            if (button instanceof HTMLElement) {
                button.click();
            }
        });

        try {
            settingsDialog = await page.waitForSelector("#modal-settings-bookmark-save", { timeout: 10000 });
        }
        catch {
            settingsDialog = await page.$("#modal-settings-bookmark-save");
        }
    }

    expect(settingsDialog).toBeDefined();
    expect(await settingsDialog?.isVisible()).toBe(true);
}

async function closeSettingsDialog(page: Page): Promise<void> {
    const closeBtn = await page.waitForSelector("#modal-settings-close");
    expect(await closeBtn?.isVisible()).toBe(true);
    await closeBtn?.click();

    await page.waitForFunction(() => document.querySelector("dialog") === null, { timeout: 10000 });
}

async function setCheckboxState(page: Page, selector: string, checked: boolean): Promise<void> {
    await page.waitForFunction(
        (inputSelector, expected) => {
            const input = document.querySelector(inputSelector) as HTMLInputElement | null;
            return input !== null && input.checked === expected;
        },
        { timeout: 10000 },
        selector,
        checked
    ).catch(async () => {
        await page.click(selector);
        await page.waitForFunction(
            (inputSelector, expected) => {
                const input = document.querySelector(inputSelector) as HTMLInputElement | null;
                return input !== null && input.checked === expected;
            },
            { timeout: 10000 },
            selector,
            checked
        );
    });
}

async function isCheckboxChecked(page: Page, selector: string): Promise<boolean> {
    return await page.$eval(selector, (input) => (input as HTMLInputElement).checked);
}

async function getStorageValue(page: Page, key: string): Promise<string> {
    return await page.evaluate(async (storageKey) => {
        return await new Promise<string>((resolve) => {
            chrome.storage.local.get(storageKey, (result) => resolve(result[storageKey] ?? ""));
        });
    }, key);
}

async function waitForStorageValueToContain(page: Page, key: string, expectedSubstring: string, timeout = 15000): Promise<void> {
    await page.waitForFunction(
        async (storageKey, expected) => {
            const value = await new Promise<string>((resolve) => {
                chrome.storage.local.get(storageKey, (result) => resolve(result[storageKey] ?? ""));
            });
            return value.includes(expected);
        },
        { timeout },
        key,
        expectedSubstring
    );
}

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

async function captureExport(page: Page): Promise<{ download: string; href: string; text: string; }> {
    await page.evaluate(() => {
        const globalState = window as typeof window & {
            __e2eExportBlob?: Blob;
            __e2eExportDownload?: { download: string; href: string; };
        };

        URL.createObjectURL = ((object: Blob | MediaSource) => {
            if (object instanceof Blob) {
                globalState.__e2eExportBlob = object;
            }
            return "blob:e2e-export";
        }) as typeof URL.createObjectURL;

        HTMLAnchorElement.prototype.click = function () {
            globalState.__e2eExportDownload = {
                download: this.download,
                href: this.href,
            };
        };
    });

    const exportBtn = await page.waitForSelector("#modal-settings-export");
    expect(await exportBtn?.isVisible()).toBe(true);
    await exportBtn?.click();

    return await page.evaluate(async () => {
        const globalState = window as typeof window & {
            __e2eExportBlob?: Blob;
            __e2eExportDownload?: { download: string; href: string; };
        };

        return {
            download: globalState.__e2eExportDownload?.download ?? "",
            href: globalState.__e2eExportDownload?.href ?? "",
            text: globalState.__e2eExportBlob ? await globalState.__e2eExportBlob.text() : "",
        };
    });
}

async function preparePersistentImportInput(page: Page): Promise<void> {
    await page.evaluate(() => {
        const documentBody = document.body as HTMLBodyElement & {
            __e2eOriginalRemoveChild?: typeof document.body.removeChild;
        };

        if (!documentBody.__e2eOriginalRemoveChild) {
            documentBody.__e2eOriginalRemoveChild = document.body.removeChild.bind(document.body);
            document.body.removeChild = function <T extends Node>(child: T): T {
                if (child instanceof HTMLInputElement && child.type === "file") {
                    child.setAttribute("data-e2e-import-input", "true");
                    return child;
                }
                return documentBody.__e2eOriginalRemoveChild!(child);
            };
        }
    });
}

jest.setTimeout(60 * 1000);

beforeEach(async () => {
    common = new E2ECommon();
    await common.beforeEach();
});

afterEach(async () => {
    await common.afterEach();
});

test("opening and closing settings dialog works", async () => {
    const page = common.page;

    await openSettingsDialog(page);
    expect(await isCheckboxChecked(page, "#modal-settings-bookmark-save")).toBe(true);
    expect(await isCheckboxChecked(page, "#modal-settings-sync-save")).toBe(true);
    expect(await isCheckboxChecked(page, "#modal-settings-debug")).toBe(false);

    await closeSettingsDialog(page);
});

test("settings checkbox changes persist after reopening dialog", async () => {
    const page = common.page;

    await openSettingsDialog(page);

    await setCheckboxState(page, "#modal-settings-bookmark-save", false);
    await setCheckboxState(page, "#modal-settings-sync-save", false);
    await setCheckboxState(page, "#modal-settings-debug", true);

    await page.waitForFunction(() => {
        return Array.from(document.querySelectorAll(".debug-tool")).some((element) => {
            return (element as HTMLElement).style.display === "block";
        });
    }, { timeout: 10000 });

    expect(await getStorageValue(page, "settings.saveBookmarks")).toBe("false");
    expect(await getStorageValue(page, "settings.saveSync")).toBe("false");
    expect(await getStorageValue(page, "settings.debug")).toBe("true");

    await closeSettingsDialog(page);
    await openSettingsDialog(page);

    expect(await isCheckboxChecked(page, "#modal-settings-bookmark-save")).toBe(false);
    expect(await isCheckboxChecked(page, "#modal-settings-sync-save")).toBe(false);
    expect(await isCheckboxChecked(page, "#modal-settings-debug")).toBe(true);

    await closeSettingsDialog(page);
});

test("exporting settings creates a downloadable JSON payload", async () => {
    const page = common.page;

    await createWorkspaceFromCurrentWindow(page, "export workspace");
    await waitForWorkspaceName(page, "export workspace");

    await openSettingsDialog(page);
    const exportCapture = await captureExport(page);

    expect(exportCapture.download).toBe("workspaces-export.json");
    expect(exportCapture.href).toBe("blob:e2e-export");

    const exportedJson = JSON.parse(exportCapture.text) as { version: string; data: string; };
    expect(exportedJson.version).toBe("1.2.1");
    expect(exportedJson.data).toContain("export workspace");

    await closeSettingsDialog(page);
});

test("importing settings loads workspaces from a JSON file", async () => {
    const page = common.page;

    await openSettingsDialog(page);
    await page.evaluate(() => {
        window.confirm = () => true;
    });
    await preparePersistentImportInput(page);

    const importAlertPromise = new Promise<string>((resolve) => {
        page.once("dialog", async (dialog) => {
            const message = dialog.message();
            await dialog.accept();
            resolve(message);
        });
    });

    const importButton = await page.waitForSelector("#modal-settings-import");
    expect(await importButton?.isVisible()).toBe(true);

    await importButton?.click();

    const importInput = await page.waitForSelector('input[type="file"][data-e2e-import-input="true"]', { timeout: 10000 });
    expect(importInput).toBeDefined();
    await importInput?.uploadFile(IMPORT_FIXTURE_PATH);

    expect(await importAlertPromise).toContain("Settings imported successfully");

    await waitForStorageValueToContain(page, "workspaces", "imported workspace", 15000);
    await page.goto(page.url(), { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#workspaces-list", { timeout: 10000 });
    await waitForWorkspaceName(page, "imported workspace", 15000);
});
