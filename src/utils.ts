
export class Utils {
    public static areWeTestingWithJest(): boolean {
        if (typeof process === 'undefined')
            return false;
        
        return process.env.JEST_WORKER_ID !== undefined;
    }
}
