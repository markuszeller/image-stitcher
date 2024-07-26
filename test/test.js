const {Builder, Browser, By, until, Key} = require('selenium-webdriver');
const chrome                             = require('selenium-webdriver/chrome');

(async function example() {
    let driver = new Builder()
        .forBrowser(Browser.CHROME)
        .build();

    try {
        await driver.get('https://markuszeller.com');
        let canvasElement = await driver.findElement(By.tagName('canvas'));
        await driver.wait(until.elementIsVisible(canvasElement), 4000);
        await driver.sleep(10000);
    } finally {
        await driver.quit();
    }
})();
