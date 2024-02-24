import { E2ECommon } from "./utils/e2e-common";

let common: E2ECommon;

beforeEach(async () => {
    common = new E2ECommon();
    await common.beforeEach();
});

// Note: this is how you can get console logs from the page.
// page.on('console', msg => console.log('PAGE LOG:', msg.text()));

afterEach(async () => {
    await common.afterEach();
});

test("creating a new workspace adds it to the list", async () => {
    // Setup listener for the new window (browser) popup
    const newWindowPagePromise = common.getNewWindowPagePromise();
    const page = common.page;

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
});

test("clicking a workspace opens it", async () => {
    // Setup listener for the new window (browser) popup
    const newWindowPagePromise = common.getNewWindowPagePromise();
    const page = common.page;

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