import { assert } from "console";
import puppeteer, { Browser, Page } from 'puppeteer';

const EXTENSION_PATH = `${ process.cwd() }/build`;
const EXTENSION_ID = 'laobpiaijpjcdllfnphlmjoaofilopmi';

let browser: Browser;
let page: Page;

beforeEach(async () => {
    // https://pptr.dev/guides/debugging
    browser = await puppeteer.launch({
        // slowMo: 250, // slow down by 250ms
        // headless: false,
        headless: "new",
        args: [
            `--disable-extensions-except=${ EXTENSION_PATH }`,
            `--load-extension=${ EXTENSION_PATH }`
        ]
    });

    if (!browser) {
        assert(browser);
        return;
    }

    page = await browser.newPage();
    await page.goto(`chrome-extension://${ EXTENSION_ID }/popup.html`);

    if (!page) {
        assert(page);
        return;
    }

    // Clear the local and sync storage before each test
    await page.evaluate(() => {
        chrome.storage.local.clear();
        chrome.storage.sync.clear();
    });
});

// Note: this is how you can get console logs from the page.
// page.on('console', msg => console.log('PAGE LOG:', msg.text()));

afterEach(async () => {
    await browser?.close();
});

test("creating a new workspace adds it to the list", async () => {
    // Setup listener for the new window (browser) popup
    const newWindowPagePromise = new Promise<Page>((resolve) => {
        browser?.on("targetcreated", async (target) => {
            const newPage = await target.page();
            if (newPage) {
                resolve(newPage);
            }
        });
    });

    // Click the button to add a workspace
    const btn = await page.$("#addWorkspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();

    // Verify the dialog is visible
    const dialog = await page.$("dialog");
    expect(await dialog?.isVisible()).toBe(true);

    // Enter the name of the new workspace
    await page.type("#modal-input-name", "test workspace");

    // Click the submit input
    await page.click("#modal-submit");

    // Wait for the new window to open
    const newPage = await newWindowPagePromise;
    expect(newPage).toBeDefined();

    // Navigate to google.com
    await newPage?.goto("https://www.google.com", { waitUntil: 'domcontentloaded' });

    // Close the new window
    await newPage?.close();

    // Verify there is a new workspace in the list, and that it has the correct name
    const list = await page.$("#workspaces-list");
    expect(await list?.isVisible()).toBe(true);

    // Use ElementHandler.waitForSelector to wait for the new workspace text to appear
    const workspaceBtn = await list?.waitForSelector("xpath///div[contains(text(), 'test workspace')]");
    expect(await workspaceBtn?.evaluate((el) => el.textContent)).toContain("1 tabs");

    await browser?.close();
});

test("clicking a workspace opens it", async () => {
    // Setup listener for the new window (browser) popup
    const newWindowPagePromise = new Promise<Page>((resolve) => {
        browser?.on("targetcreated", async (target) => {
            const newPage = await target.page();
            if (newPage) {
                resolve(newPage);
            }
        });
    });

    // Add a workspace
    const btn = await page.$("#addWorkspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();

    // Verify the dialog is visible
    const dialog = await page.$("dialog");
    expect(await dialog?.isVisible()).toBe(true);

    // Enter the name of the new workspace
    await page.type("#modal-input-name", "test workspace");

    // Click the submit input
    await page.click("#modal-submit");

    // Wait for the new window to open
    let newPage = await newWindowPagePromise;
    expect(newPage).toBeDefined();

    // Navigate to google.com
    await newPage?.goto("https://www.google.com", { waitUntil: 'domcontentloaded' });

    // Close the new window
    await newPage?.close();

    // Verify there is a new workspace in the list, and that it has the correct name
    const list = await page.$("#workspaces-list");
    expect(await list?.isVisible()).toBe(true);

    // Use ElementHandler.waitForSelector to wait for the new workspace text to appear
    const workspaceBtn = await list?.waitForSelector("xpath///div[contains(text(), 'test workspace')]");
    // Click the workspace
    expect(await workspaceBtn?.isVisible()).toBe(true);
    await workspaceBtn?.click();

    // Wait for the new window to open
    newPage = await newWindowPagePromise;
    expect(newPage).toBeDefined();

    // Verify the new page is google.com
    expect(await newPage?.url()).toBe("https://www.google.com/");
});