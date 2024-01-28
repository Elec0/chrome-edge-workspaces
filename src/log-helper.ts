import * as util from 'util';

export class LogHelper {
    public static log(message: string, ...optionalParams: unknown[]): void {
        console.log(message, ...optionalParams);
    }

    /**
     * Log an error to the console and display an alert.
     * @param message - The message to log.
     * @param optionalParams - Optional parameters to pass to util.format
     */
    public static errorAlert(message: string, ...optionalParams: unknown[]): void {
        const formattedMessage = util.format(message, ...optionalParams);
        console.error(formattedMessage);
        alert(formattedMessage);        
    }

    public static successAlert(message: string, ...optionalParams: unknown[]): void {
        const formattedMessage = util.format(message, ...optionalParams);
        console.log(formattedMessage);
        alert(formattedMessage);        
    }

    public static warn(message: string, ...optionalParams: unknown[]): void {
        console.warn(message, ...optionalParams);
    }
}