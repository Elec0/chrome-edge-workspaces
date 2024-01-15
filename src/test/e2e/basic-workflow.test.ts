import { assert } from "console";
import puppeteer, { Browser } from 'puppeteer';

const EXTENSION_PATH = `${process.cwd()}/build`;
const EXTENSION_ID = 'laobpiaijpjcdllfnphlmjoaofilopmi';

let browser: Browser | undefined;

beforeEach(async () => {
    // https://pptr.dev/guides/debugging
    browser = await puppeteer.launch({
        // slowMo: 250, // slow down by 250ms
        headless: "new",
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    });
});

// Note: this is how you can get console logs from the page.
// page.on('console', msg => console.log('PAGE LOG:', msg.text()));

afterEach(async () => {
    await browser?.close();
    browser = undefined;
});

test("creating a new workspace adds it to the list", async () => {
    if (!browser) {
        assert(browser);
        return;
    }
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);

    // Enter 'test workspace' in the input box, when it appears
    page.on("dialog", async (dialog) => {
        await dialog.accept("test workspace");
    });

    // Click the button to add a workspace
    const btn = await page.$("#addBtn");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();

    // Verify there is a new workspace in the list, and that it has the correct name
    const list = await page.$("#workspaces");
    expect(await list?.isVisible()).toBe(true);
    // Find the text of the workspace name
    const workspaceBtn = await list?.waitForSelector("xpath///div[contains(text(), 'test workspace')]");
    // Verify there are "1 tabs" in the workspace button text, since it's a new workspace
    expect(await workspaceBtn?.evaluate((el) => el.textContent)).toContain("1 tabs");

    await browser.close();
});