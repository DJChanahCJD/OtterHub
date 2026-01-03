var assert = require('assert');
describe('Get File API Endpoint', function () {
    describe('/files', function () {
        it('should return the file without error', async function () {
            const response = await fetch("http://localhost:8080/file/img_1767415762743-chj9bs2xh.png");
            assert.equal(response.status, 200);
        });
    });
});