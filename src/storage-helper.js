function testSetup() {
    console.log("testSetup");
    chrome.storage.sync.get(['count'], function (result) {
        console.log('Value currently is ' + result.test);
    });
}

export { testSetup };