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

test("creating workspace and renaming it works", async () => {
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

    // Edit the workspace name
    const editBtn = await page.waitForSelector("#edit-button");
    expect(await editBtn?.isVisible()).toBe(true);
    await editBtn?.click();

    // Verify the dialog is visible
    const renameDialog = await page.waitForSelector("dialog");
    expect(await renameDialog?.isVisible()).toBe(true);

    // Enter the name of the new workspace
    await page.type("#modal-input-name", "renamed workspace");

    // Click the submit input
    await page.click("#modal-submit");

    // Verify the workspace name has been updated
    const renamedWorkspaceBtn = await list?.waitForSelector("xpath///div[contains(text(), 'renamed workspace')]");
    expect(await renamedWorkspaceBtn?.evaluate((el) => el.textContent)).toContain("1 tabs");
});
