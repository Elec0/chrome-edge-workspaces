# <img src="public/icons/icon_48.png" width="45" align="left"> Edge Workspaces

**Edge Workspaces** is an extension that replicates the Microsoft Edge Workspaces feature. It allows you to save the state of a window, including all open tabs, and reopen it later as a workspace.

<a href="https://chromewebstore.google.com/detail/edge-workspaces/feehlkcbifmladjmmpkghfokcngfkkkp"><img src="images/Google_Play_Store_badge_EN.svg" target="_blank" height="55px" /></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/edge-workspaces/"><img src="images/Firefox_addon_store_badge_EN.png" target="_blank" height="55px" /></a>

<a href="images/extension-demo.gif" target="_blank" ><img src="images/extension-demo.gif" width="500px"></a>

## Key Features

- **Automatic Saving**: The extension automatically saves your workspace as you work, eliminating the need to manually save open tabs.
- **Import/Export**: Workspaces can be exported to a file and imported later on another device.
- **Workspaces copied as bookmarks**: Workspaces can be saved as bookmarks to allow for easier cross-platform access.
- **Internal Tab Exclusion**: Internal tabs, such as the new tab page, settings, or extensions, are not saved to workspaces.

## Usage

### Creating a Workspace

1. Open the extension popup by clicking the icon in the toolbar (pinning the extension is recommended).
2. Click the "+" icon to open the new workspace modal.
3. Select either "New workspace" or "New workspace from window".
4. Enter a name for the workspace.
5. Click "OK".
6. A new browser window will open with the New Tab page.
7. All tabs in the current window will be saved to the workspace as you work.
8. Close the window when finished.

### Opening a Workspace

1. Open the extension popup.
2. Click on a workspace to open it.
3. The saved tabs will be opened in a new browser window.

### Managing Workspaces

- Click the trashcan icon to delete a workspace.
- Click the pencil icon to rename a workspace.

### Saving Workspaces as Bookmarks

- Ensure "Save workspaces to bookmarks" option is checked in Settings.
- Workspaces will now be copied to `Other bookmarks -> Edge Workspaces (read-only) -> [Workspace Name]`.
- Note that changes to the bookmarks will **not** be reflected in the workspaces themselves, as they are just a copy. 
- When installing a new version, make sure to open old workspaces at least once to allow for them to be saved as bookmarks.

### Importing/Exporting Workspaces

1. Open the extension popup.
2. Click the hamburger icon to open the settings window.
3. Click "Export" to save all workspaces to a file.
4. Click "Import" to load workspaces from a file.

## Images
<img src="images/1-main-window.png">

<img src="images/2-new-workspace-dialog.png">

<img src="images/3-new-workspace-dialog-name.png">

<img src="images/4-settings-import-export-window.png">

## Install
### Chrome Web Store
<a href="https://chromewebstore.google.com/detail/edge-workspaces/feehlkcbifmladjmmpkghfokcngfkkkp"><img src="images/Google_Play_Store_badge_EN.svg" target="_blank" height="55px" /></a>

### Firefox Addon Store
<a href="https://addons.mozilla.org/en-US/firefox/addon/edge-workspaces/"><img src="images/Firefox_addon_store_badge_EN.png" target="_blank" height="55px" /></a>

## Contribution
Suggestions and pull requests are welcomed!

## Development
1. Clone the repository
2. Run `npm install`
3. Run `npm run build` to build the extension
4. Load the extension in Chrome by following the manual install instructions
5. Run `npm run watch` to automatically rebuild the extension when changes are made

### Chrome
Using VS Code, there are two tasks available for Chrome:
* `Run npm watch` - Runs `npm run watch`
* `Launch Chrome against localhost` - Launches a new Chrome window with the extension loaded
  * You will need to update extension ID in the `url` in `launch.json` to match the ID of the extension loaded in Chrome

### Firefox
Using VS Code, there are two tasks available for Firefox:
* `Run npm watch firefox` - Runs `npm run watch-firefox`
* `Launch Firefox with add-on` - Launches a new Firefox window with the extension loaded in debug mode
  * Firefox only supports temporary installation of addons in debug mode, so data will not be saved between sessions


## Credits
* Original extension icon made by [Yogi Aprelliyanto](https://www.flaticon.com/authors/yogi-aprelliyanto) from [Flaticon](https://www.flaticon.com/)
* This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)