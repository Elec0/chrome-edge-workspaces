
export type MessageResponse = { [key: string]: string };
/**
 * Represents a collection of message responses.
 * TODO: This is kinda ass. There's no way to pass in custom messages or anything. Should rework it.
 */
export class MessageResponses {
    private static readonly _key = "message";

    /**
     * Represents an OK response.
     */
    public static readonly OK: MessageResponse = { [MessageResponses._key]: "OK" };

    /**
     * Represents an ERROR response.
     */
    public static readonly ERROR: MessageResponse = { [MessageResponses._key]: "ERROR" };

    /**
     * Represents a DATA response, with the data being the value of the key.
     */
    public static readonly DATA: MessageResponse = { [MessageResponses._key]: "" };

    /**
     * Represents a SUCCESS response.
     */
    public static readonly SUCCESS: MessageResponse = { [MessageResponses._key]: "SUCCESS"}

    /**
     * Represents a FAILURE response.
     */
    public static readonly FAILURE: MessageResponse = { [MessageResponses._key]: "FAILURE" }

    public static readonly UNKNOWN_MSG: MessageResponse = { [MessageResponses._key]: "UNKNOWN message" }

}