const { MessageResponses } = require("../../constants/message-responses");


describe('MessageResponses', () => {
    function testMessageResponse(response, val) {
        expect(response).not.toBeUndefined();
        expect(response).toHaveProperty("message");
        expect(response.message).toBe(val);
    }

    it('should correctly construct OK response', () => {
        const response = MessageResponses.OK;

        testMessageResponse(response, 'OK');
    });

    it('should correctly construct ERROR response', () => {
        const response = MessageResponses.ERROR;
        testMessageResponse(response, 'ERROR');
    });

    it('should correctly construct SUCCESS response', () => {
        const response = MessageResponses.SUCCESS;
        testMessageResponse(response, 'SUCCESS');
    });

    it('should correctly construct FAILURE response', () => {
        const response = MessageResponses.FAILURE;
        testMessageResponse(response, 'FAILURE');
    });
});