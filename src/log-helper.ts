import * as util from 'util';

export class LogHelper {
    public static log(message: string, ...optionalParams: any[]): void {
        console.log(message, ...optionalParams);
    }

    /**
     * Log an error to the console and display an alert.
     * @param message 
     * @param optionalParams 
     */
    public static errorAlert(message: string, ...optionalParams: any[]): void {
        let formattedMessage = util.format(message, ...optionalParams);
        console.error(formattedMessage);
        alert(formattedMessage);        
    }

    public static warn(message: string, ...optionalParams: any[]): void {
        console.warn(message, ...optionalParams);
    }
}