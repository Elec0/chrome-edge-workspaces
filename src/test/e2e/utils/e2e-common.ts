import puppeteer, { Browser, Page } from "puppeteer";
import { E2EConstants } from "./e2e-constants";
import assert from "assert";

export class E2ECommon {
    public browser!: Browser;
    public page!: Page;
    private popupUrl!: string;

    /*
    // Use this to debug in the browser, with devtools: true:
        await page.evaluate(() => {
            debugger;
        });
    */
    public async beforeEach() {
        // https://pptr.dev/guides/debugging
        this.browser = await puppeteer.launch({
            // slowMo: 250, // slow down by 250ms
            // headless: false,
            headless: "new",
            args: [
                `--disable-extensions-except=${ E2EConstants.EXTENSION_PATH }`,
                `--load-extension=${ E2EConstants.EXTENSION_PATH }`
            ],
            // devtools: true
        });

        if (!this.browser) {
            assert(this.browser);
            return;
        }

        this.popupUrl = `chrome-extension://${E2EConstants.EXTENSION_ID}/popup.html`;

        this.page = await this.browser.newPage();

        await this.page.goto(this.popupUrl, { waitUntil: "domcontentloaded" });

        // Clear the local and sync storage before each test
        await this.page.evaluate(async () => {
            await new Promise<void>((resolve) => chrome.storage.local.clear(() => resolve()));
            await new Promise<void>((resolve) => chrome.storage.sync.clear(() => resolve()));
        });

        await this.page.reload({ waitUntil: "domcontentloaded" });
        await this.page.waitForSelector("#workspaces-list", { timeout: 10000 });

        if (!this.page) {
            assert(this.page);
            return;
        }
    }

    public async afterEach() {
        await this.browser?.close();
    }

    /**
     * Get a promise that resolves to a new page when a new window is created.
     * @returns A promise that resolves to a new page when a new window is created.
     */
    public async waitForNewWindowPage(timeout = 10000): Promise<Page> {
        const target = await this.browser.waitForTarget((candidate) => {
            if (candidate.type() !== "page") {
                return false;
            }

            const targetUrl = candidate.url();
            return targetUrl === "" || targetUrl === "about:blank" || !targetUrl.startsWith("chrome-extension://");
        }, { timeout });

        const newPage = await target.page();
        assert(newPage);
        return newPage;
    }
}

// (name: string, fn?: jest.ProvidesCallback | undefined, timeout?: number | undefined) => void
export function ignore(_name: string, _fn?: (() => void) | undefined, _timeout?: number): void {
    // Do nothing
}