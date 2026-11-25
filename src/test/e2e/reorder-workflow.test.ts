import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { Constants } from "../../constants/constants";
import { E2ECommon } from "./utils/e2e-common";

const common = new E2ECommon();
const list = "#workspaces-list .workspace-name";

jest.setTimeout(30000);
beforeEach(async () => {
    await common.beforeEach();
    common.page.setDefaultTimeout(7000);
    // Let the initial workspace load finish before seeding local data.
    await common.page.waitForFunction(() => document.querySelector("#workspaces-list")?.textContent?.trim() === "");
    await common.page.evaluate(async (key, syncSetting) => {
        const workspaces = ["First", "Second", "Third"].map((name, index) => {
            const uuid = String(index + 1);
            return [uuid, { uuid, name, id: -index - 1, lastUpdated: 100 }];
        });
        await chrome.storage.local.set({ [key]: JSON.stringify({ workspaces }), [syncSetting]: "false" });
    }, Constants.KEY_STORAGE_WORKSPACES, Constants.STORAGE_KEYS.settings.saveSync);
    await common.page.reload({ waitUntil: "domcontentloaded" });
});
afterEach(async () => common.afterEach());

test("shows the move confirmation only when debug tools are enabled", async () => {
    const page = common.page;
    const status = "#workspace-reorder-status";
    await page.waitForSelector(list);
    await page.click("#workspace-reorder-toggle");
    await page.click('button[aria-label="Move Third up"]');
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent?.includes("position 2"), {}, status);
    expect(await page.$eval(status, message => message.getBoundingClientRect().height)).toBeLessThanOrEqual(1);

    await page.click("#settings-button");
    await page.waitForSelector("#modal-settings-debug", { visible: true });
    await page.click("#modal-settings-debug");
    await page.click("#modal-settings-close");
    await page.waitForFunction(selector => (document.querySelector(selector)?.getBoundingClientRect().height ?? 0) > 1, {}, status);

    await page.click("#settings-button");
    await page.waitForSelector("#modal-settings-debug", { visible: true });
    await page.click("#modal-settings-debug");
    await page.click("#modal-settings-close");
    await page.waitForFunction(selector => (document.querySelector(selector)?.getBoundingClientRect().height ?? 0) <= 1, {}, status);
});

test("keyboard and drag moves save the new order across popup reloads", async () => {
    const page = common.page;
    const names = () => page.$$eval(list, rows => rows.map(row => row.textContent));
    await page.waitForSelector(list);
    expect(await names()).toEqual(["First", "Second", "Third"]);

    const reorder = '.header-bar-right > span[role="button"][aria-label="Reorder workspaces"]';
    await page.waitForSelector(reorder, { visible: true });
    expect(await page.$eval(reorder, button => button.getAttribute("title"))).toBe("Reorder workspaces");
    expect(await page.$eval(reorder, button => button.getAttribute("aria-pressed"))).toBe("false");
    await page.focus(reorder);
    await page.keyboard.press("Enter");
    expect(await page.$eval(reorder, button => button.getAttribute("aria-pressed"))).toBe("true");
    expect(await page.$eval('button[aria-label="Move First up"]', button => button.matches(":disabled"))).toBe(true);
    expect(await page.$eval('button[aria-label="Move Third down"]', button => button.matches(":disabled"))).toBe(true);
    const thirdUp = 'button[aria-label="Move Third up"]';
    await page.focus(thirdUp);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#workspace-reorder-status")?.textContent?.includes("position 2"));
    expect(await names()).toEqual(["First", "Third", "Second"]);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Move Third up");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#workspace-reorder-status")?.textContent?.includes("position 1"));
    expect(await names()).toEqual(["Third", "First", "Second"]);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Move Third down");

    await page.setDragInterception(true);
    const handle = await page.waitForSelector('[title="Drag First to reorder"]');
    const target = await page.waitForSelector('[data-workspace-uuid="2"]');
    const start = await handle?.boundingBox();
    const bounds = await target?.boundingBox();
    expect(start).toBeTruthy();
    expect(bounds).toBeTruthy();
    await page.mouse.dragAndDrop(
        { x: start!.x + start!.width / 2, y: start!.y + start!.height / 2 },
        { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height - 2 }
    );
    await page.waitForFunction(() => document.querySelector("#workspace-reorder-status")?.textContent?.includes("position 3"));
    expect(await names()).toEqual(["Third", "Second", "First"]);

    await page.focus(reorder);
    await page.keyboard.press("Space");
    expect(await page.$eval(reorder, button => button.getAttribute("aria-pressed"))).toBe("false");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(list);
    expect(await names()).toEqual(["Third", "Second", "First"]);
});
