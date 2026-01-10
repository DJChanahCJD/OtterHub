var assert = require("assert");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

describe("File API Endpoints", function () {
  // Shared state across tests
  let uploadedFileKey;
  let uploadedFileUrl;

  describe("POST /api/upload", function () {
    it("should upload the file successfully", async function () {
      const filePath = path.join(__dirname, "../public/otterhub-icon.svg");
      const fileBuffer = fs.readFileSync(filePath);

      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: "otterhub-icon.svg",
        contentType: "image/svg+xml",
      });

      // Get headers from form-data and add authorization
      const formHeaders = form.getHeaders();
      const headers = {
        ...formHeaders,
        Authorization: "Basic YWRtaW46MTIzNDU2",  // BASIC_USER=admin && BASIC_PASS=123456
      };

      const response = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: form.getBuffer(),
        headers,
      });

      assert.equal(response.status, 200);

      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data);

      // Store the uploaded file key for the next test
      // API returns { success: true, data: "img:xxx.svg" } (key only, not full URL)
      uploadedFileKey = result.data;
      uploadedFileUrl = `http://localhost:8080/file/${result.data}`;
    });
  });

  describe("GET /file/:key", function () {
    it("should return the uploaded file without error", async function () {
      // Skip if the upload test didn't store a URL
      if (!uploadedFileKey) {
        this.skip();
      }

      const response = await fetch(
        `http://localhost:8080/file/${uploadedFileKey}`,
        {
          headers: {
            Authorization: "Basic YWRtaW46MTIzNDU2",
          },
        },
      );
      assert.equal(response.status, 200);

      // Check that the response is the SVG we uploaded
      const responseText = await response.text();
      assert.ok(
        responseText.includes("otterhub-icon.svg") ||
          responseText.includes("svg"),
      );
    });
  });
});
