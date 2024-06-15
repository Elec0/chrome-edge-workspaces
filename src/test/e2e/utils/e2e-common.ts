import puppeteer, { Browser, Page } from "puppeteer";
import { E2EConstants } from "./e2e-constants";
import assert from "assert";

export class E2ECommon {
    public browser!: Browser;
    public page!: Page;

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

        this.page = await this.browser.newPage();

        await this.page.goto(`chrome-extension://${ E2EConstants.EXTENSION_ID }/popup.html`);

        if (!this.page) {
            assert(this.page);
            return;
        }
        
        // Clear the local and sync storage before each test
        await this.page.evaluate(() => {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
        });
    }

    public async afterEach() {
        await this.browser?.close();
    }

    /**
     * Get a promise that resolves to a new page when a new window is created.
     * @returns A promise that resolves to a new page when a new window is created.
     */
    public getNewWindowPagePromise(): Promise<Page> {
        return new Promise<Page>((resolve) => {
            this.browser?.on("targetcreated", async (target) => {
                const newPage = await target.page();
                if (newPage) {
                    resolve(newPage);
                }
            });
        });
    }
}

// (name: string, fn?: jest.ProvidesCallback | undefined, timeout?: number | undefined) => void
export function ignore(_name: string, _fn?: (() => void) | undefined, _timeout?: number): void {
    // Do nothing
}