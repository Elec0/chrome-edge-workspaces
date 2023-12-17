
/**
 * Represents a collection of message responses.
 */
export class MessageResponses {
    private static readonly _key = "message";

    /**
     * Represents an OK response.
     */
    public static readonly OK = { [MessageResponses._key]: "OK" };

    /**
     * Represents an ERROR response.
     */
    public static readonly ERROR = { [MessageResponses._key]: "ERROR" };

    /**
     * Represents a SUCCESS response.
     */
    public static readonly SUCCESS = { [MessageResponses._key]: "SUCCESS"}

    /**
     * Represents a FAILURE response.
     */
    public static readonly FAILURE = { [MessageResponses._key]: "FAILURE" }

    public static readonly UNKNOWN_MSG = { [MessageResponses._key]: "UNKNOWN message" }
}