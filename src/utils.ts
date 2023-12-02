
export class Utils {
    public static areWeTestingWithJest(): boolean {
        return process.env.JEST_WORKER_ID !== undefined;
    }
}
