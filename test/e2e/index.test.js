const puppeteer = require('puppeteer');

const EXTENSION_PATH = `${process.cwd()}/build`;
const EXTENSION_ID = 'laobpiaijpjcdllfnphlmjoaofilopmi';

let browser;

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
    await browser.close();
    browser = undefined;
});


test('popup renders correctly', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);

    const btn = await page.$('.button-container > button');
    // const list = await page.$('ul');
    // const children = await list.$$('li');  
    // console.debug(await btn.isVisible());
    // console.debug(await btn.$eval('button', el => el.innerText));

    expect(await btn.isVisible()).toBe(true);
  });