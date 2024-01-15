import { assert } from "console";
import puppeteer, { Browser } from 'puppeteer';

const EXTENSION_PATH = `${process.cwd()}/build`;
const EXTENSION_ID = 'laobpiaijpjcdllfnphlmjoaofilopmi';

let browser: Browser | undefined;

beforeEach(async () => {
    // https://pptr.dev/guides/debugging
    browser = await puppeteer.launch({
        // slowMo: 250, // slow down by 250ms
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    });
});

afterEach(async () => {
    await browser?.close();
    browser = undefined;
});

test("popup renders correctly", async () => {
    if (!browser) {
        assert(browser);
        return;
    }
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
    
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

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
    await list?.waitForXPath("//div[contains(text(), 'test workspace')]");

    await browser.close();
});