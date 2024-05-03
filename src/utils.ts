/**
 * Utility class containing various helper methods.
 */
export class Utils {
    /**
     * Checks if the code is running in a Jest test environment.
     * @returns A boolean indicating whether the code is running in a Jest test environment.
     */
    public static areWeTestingWithJest(): boolean {
        if (typeof process === 'undefined')
            return false;

        return process.env.JEST_WORKER_ID !== undefined;
    }

    /**
     * Interpolates variables into a template string.
     * @param template - The template string containing placeholders.
     * @param variables - An object containing the variables to be interpolated.
     * @returns The interpolated string.
     */
    public static interpolateTemplate(template: string, variables: Record<string, string | number>): string {
        return template.replace(/\$\{(\w+)\}/g, (_, variable) => String(variables[variable]));
    }

    /**
     * Determine if the given tab URL is one we don't want to keep track of, or if it's special and we should track it.
     * @param url - The URL of the tab. If undefined, the URL is considered trackable.
     */
    public static isUrlUntrackable(url: string | undefined): boolean {
        if (url === undefined)
            return true;
        return url.startsWith("chrome://") || url.startsWith("about:") || url.startsWith("chrome-extension://");
    }
}
