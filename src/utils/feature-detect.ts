
export class FeatureDetect {
    public static supportsTabGroups(): boolean {
        return typeof chrome.tabGroups !== 'undefined';
    }
}