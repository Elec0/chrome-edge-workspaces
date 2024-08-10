import { E2ECommon } from "./utils/e2e-common";

let common: E2ECommon;

jest.setTimeout(30 * 1000);

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
    let btn = await page.waitForSelector("#addWorkspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();
    // Verify the dialog is visible
    let dialog = await page.waitForSelector("dialog");
    expect(await dialog?.isVisible()).toBe(true);

    // Click the button to add a new workspace
    btn = await page.waitForSelector("#modal-new-workspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();

    // Verify the dialog is visible
    dialog = await page.waitForSelector("dialog");
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
    const list = await page.waitForSelector("#workspaces-list");
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
    let btn = await page.waitForSelector("#addWorkspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();


    // Verify the dialog is visible
    let dialog = await page.waitForSelector("dialog");
    expect(await dialog?.isVisible()).toBe(true);

    
    // Click the button to add a new workspace
    btn = await page.waitForSelector("#modal-new-workspace");
    expect(await btn?.isVisible()).toBe(true);
    await btn?.click();

    // Verify the dialog is visible
    dialog = await page.waitForSelector("dialog");
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
    const list = await page.waitForSelector("#workspaces-list");
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

test("creating a new workspace from the current window adds it to the list with existing tabs", async () => {
    // This test is similar to the first test, but it uses the "New Workspace from Window" button
    // Steps:
    // 1. Open a few new tabs to specific URLs
    // 2. Switch to the popup page
    // 3. Click the '#settings-button' button
    // 4. Click the '#modal-new-workspace-from-window' button
    // 5. Enter a name for the new workspace in the prompt
    // 6. Verify the new workspace is in the list with the correct name and number of tabs

    const page = common.page;

    // Add a few tabs
    const urls = ["https://www.google.com", "https://www.bing.com", "https://www.yahoo.com"];
    for (const url of urls) {
        const newPage = await common.browser.newPage();
        await newPage.goto(url, { waitUntil: 'domcontentloaded' });
    }

    // Switch to the popup page
    await page.bringToFront();

    // Click the settings button
    const settingsBtn = await page.waitForSelector("#addWorkspace");
    expect(await settingsBtn?.isVisible()).toBe(true);
    await settingsBtn?.click();

    // Click the new workspace from window button
    const newWorkspaceBtn = await page.waitForSelector("#modal-new-workspace-from-window");
    expect(await newWorkspaceBtn?.isVisible()).toBe(true);
    await newWorkspaceBtn?.click();

    // Enter the name of the new workspace
    await page.type("#modal-input-name", "test workspace");

    // Click the submit input
    await page.click("#modal-submit");

    // Wait for all <dialog> elements to be gone
    await page.waitForSelector("dialog", { hidden: true });

    // Verify there is a new workspace in the list, and that it has the correct name
    const list = await page.waitForSelector("#workspaces-list");
    expect(await list?.isVisible()).toBe(true);

    // Use ElementHandler.waitForSelector to wait for the new workspace text to appear
    const workspaceBtn = await list?.waitForSelector("xpath///div[contains(text(), 'test workspace')]");
    expect(await workspaceBtn?.evaluate((el) => el.textContent)).toContain("3 tabs");
});