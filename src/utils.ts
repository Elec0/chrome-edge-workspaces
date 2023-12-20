
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
    public static interpolateTemplate(template: string, variables: any): string {
        return template.replace(/\$\{(\w+)\}/g, (_, variable) => variables[variable]);
    }
}
