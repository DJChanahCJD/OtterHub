var assert = require("assert");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

const API_URL = "http://localhost:8080";
const PASSWORD = "123456";
const trashPrefix = "trash:";

describe("File API Endpoints", function () {
  // Shared state across tests
  let uploadedFileKey;
  let uploadedFileUrl;
  let authCookie;

  // 登录
  describe("POST /api/login", function () {
    it("should login successfully and get auth cookie", async function () {
      const response = await fetch(`${API_URL}/v1/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: PASSWORD }),
      });

      assert.equal(response.status, 200);

      const result = await response.json();
      assert.ok(result.success);

      // Extract the auth cookie from the Set-Cookie header
      const setCookieHeader = response.headers.get("Set-Cookie");
      assert.ok(setCookieHeader, "No Set-Cookie header in response");

      // Parse the auth cookie value
      const authMatch = setCookieHeader.match(/auth=([^;]+)/);
      assert.ok(authMatch, "No auth cookie found");
      authCookie = `auth=${authMatch[1]}`;
    });
  });

  // 上传
  describe("POST /api/upload", function () {
    it("should upload the file successfully", async function () {
      const filePath = path.join(__dirname, "../public/otterhub-icon.svg");
      const fileBuffer = fs.readFileSync(filePath);

      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: "otterhub-icon.svg",
        contentType: "image/svg+xml",
      });

      // Get headers from form-data and add auth cookie
      const formHeaders = form.getHeaders();
      const headers = {
        ...formHeaders,
        Cookie: authCookie,
      };

      const response = await fetch(`${API_URL}/v1/api/upload`, {
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
      uploadedFileUrl = `${API_URL}/v1/file/${result.data}`;
    });
  });

  // 获取
  describe("GET /file/:key", function () {
    it("should return the uploaded file without error", async function () {
      // Skip if the upload test didn't store a URL
      if (!uploadedFileKey) {
        this.skip();
      }

      const response = await fetch(`${API_URL}/v1/file/${uploadedFileKey}`, {
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(response.status, 200);

      // Check that the response is the SVG we uploaded
      const responseText = await response.text();
      assert.ok(
        responseText.includes("otterhub-icon.svg") ||
          responseText.includes("svg"),
      );
    });
  });

  // 回收站测试
  describe("Trash API Endpoints", function () {
    it("should move the file to trash successfully", async function () {
      if (!uploadedFileKey) {
        this.skip();
      }

      const response = await fetch(`${API_URL}/v1/api/trash/moveToTrash/${uploadedFileKey}`, {
        method: "POST",
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(response.status, 200);

      const result = await response.json();
      assert.ok(result.success);
    });

    it("should fetch the file from trash", async function () {
      if (!uploadedFileKey) {
        this.skip();
      }

      // 移入回收站后，原始路径应该返回 404
      const originalResponse = await fetch(`${API_URL}/v1/file/${uploadedFileKey}`, {
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(originalResponse.status, 404);

      // 从回收站路径应该可以获取
      const trashResponse = await fetch(`${API_URL}/v1/api/trash/${trashPrefix}${uploadedFileKey}`, {
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(trashResponse.status, 200);
      const text = await trashResponse.text();
      assert.ok(text.includes("svg"));
    });

    it("should restore the file from trash successfully", async function () {
      if (!uploadedFileKey) {
        this.skip();
      }

      const trashKey = `${trashPrefix}${uploadedFileKey}`;
      const response = await fetch(`${API_URL}/v1/api/trash/restore/${trashKey}`, {
        method: "POST",
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(response.status, 200);

      const result = await response.json();
      assert.ok(result.success);

      // 还原后，原始路径应该恢复访问
      const restoredResponse = await fetch(`${API_URL}/v1/file/${uploadedFileKey}`, {
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(restoredResponse.status, 200);
    });
  });

  // 删除
  describe("POST /api/delete/:key", function () {
    it("should delete the uploaded file successfully", async function () {
      // Skip if the upload test didn't store a URL
      if (!uploadedFileKey) {
        this.skip();
      }

      const response = await fetch(`${API_URL}/v1/api/delete/${uploadedFileKey}`, {
        method: "POST",
        headers: {
          Cookie: authCookie,
        },
      });
      assert.equal(response.status, 200);

      const result = await response.json();
      assert.ok(result.success);
    });
  });
});
