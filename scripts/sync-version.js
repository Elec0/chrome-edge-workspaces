/**
 * This script updates the version in the manifest.json file with the version from package.json.
 */
const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
// Update the manifest files for the provided browser
function updateManifest(browser) {
    const manifestPath = path.join(__dirname, '..', 'public', browser, 'manifest.json');
    const manifest = require(manifestPath);
    
    manifest.version = packageJson.version;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

updateManifest('chrome');
updateManifest('firefox');