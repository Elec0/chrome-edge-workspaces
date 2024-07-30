export interface IStub {
    toJson(): string;
    [key: string]: unknown;
}