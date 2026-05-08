import { E2ECommon } from "./utils/e2e-common";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import type { Page } from "puppeteer";

let common: E2ECommon;

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
