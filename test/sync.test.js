var assert = require("assert");

const API_URL = "http://localhost:8080";
const API_TOKEN = "123456";

// 测试工具函数
async function fetchWithAuth(url, options = {}, token = API_TOKEN) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

describe("Sync API", function () {
  let createdKey;
  let testKeyWithPrefix;

  describe("POST /sync/create-key", function () {
    it("should create key without prefix", async function () {
      const response = await fetchWithAuth(`${API_URL}/sync/create-key`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.syncKey);
      createdKey = result.data.syncKey;
    });

    it("should create key with prefix", async function () {
      const response = await fetchWithAuth(`${API_URL}/sync/create-key`, {
        method: "POST",
        body: JSON.stringify({ prefix: "test" }),
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.syncKey.startsWith("test_"));
      testKeyWithPrefix = result.data.syncKey;
    });

    it("should fail with invalid prefix", async function () {
      const response = await fetchWithAuth(`${API_URL}/sync/create-key`, {
        method: "POST",
        body: JSON.stringify({ prefix: "invalid prefix" }),
      });

      assert.equal(response.status, 400);
      const result = await response.json();
      assert.ok(!result.success);
    });

    it("should fail with too long prefix", async function () {
      const longPrefix = "a".repeat(21);
      const response = await fetchWithAuth(`${API_URL}/sync/create-key`, {
        method: "POST",
        body: JSON.stringify({ prefix: longPrefix }),
      });

      assert.equal(response.status, 400);
      const result = await response.json();
      assert.ok(!result.success);
    });
  });

  describe("GET /sync/keys", function () {
    it("should list all keys", async function () {
      const response = await fetchWithAuth(`${API_URL}/sync/keys`);

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(Array.isArray(result.data.keys));
      assert.ok(result.data.keys.length >= 2);
      
      // 验证创建的键存在于列表中
      const keys = result.data.keys.map(k => k.key);
      assert.ok(keys.includes(createdKey));
      assert.ok(keys.includes(testKeyWithPrefix));
    });
  });

  describe("GET /sync (Bearer Auth)", function () {
    it("should check sync status", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync/check`, {}, createdKey);

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(typeof result.data.lastSyncTime === "number");
    });

    it("should fetch empty data", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync`, {}, createdKey);

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.equal(result.data.data, null);
    });

    it("should fail with invalid key", async function () {
      const response = await fetchWithAuth(`${API_URL}/sync`, {}, "invalid_key");

      assert.equal(response.status, 404);
    });

    it("should fail without authorization header", async function () {
      const response = await fetch(`${API_URL}/sync`, {
        headers: { "Content-Type": "application/json" },
      });

      assert.equal(response.status, 401);
    });

    it("should fail with malformed authorization header", async function () {
      const response = await fetch(`${API_URL}/sync`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "InvalidBearer invalid_key",
        },
      });

      assert.equal(response.status, 401);
    });
  });

  describe("POST /sync (Push Data)", function () {
    it("should push data successfully", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync`, {
        method: "POST",
        body: JSON.stringify({ data: { test: "hello" } }),
      }, createdKey);

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.lastSyncTime);
    });

    it("should fetch pushed data", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync`, {}, createdKey);

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.deepEqual(result.data.data, { test: "hello" });
    });

    it("should push data with valid lastSyncTime", async function () {
      if (!createdKey) this.skip();

      // 获取当前同步时间
      const statusResponse = await fetchWithAuth(`${API_URL}/sync/check`, {}, createdKey);
      const statusResult = await statusResponse.json();
      const currentSyncTime = statusResult.data.lastSyncTime;

      // 推送数据，使用正确的 lastSyncTime
      const pushResponse = await fetchWithAuth(`${API_URL}/sync`, {
        method: "POST",
        body: JSON.stringify({ 
          data: { version: 3 },
          lastSyncTime: currentSyncTime
        }),
      }, createdKey);

      assert.equal(pushResponse.status, 200);
      const pushResult = await pushResponse.json();
      assert.ok(pushResult.success);
      assert.ok(pushResult.data.lastSyncTime > currentSyncTime);
    });
  });

  describe("DELETE /sync/keys/:key", function () {
    it("should delete key", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync/keys/${createdKey}`, {
        method: "DELETE",
      });

      assert.equal(response.status, 200);
    });

    it("key should not exist after delete", async function () {
      if (!createdKey) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync`, {}, createdKey);

      assert.equal(response.status, 404);
    });

    it("should fail to delete non-existent key", async function () {
      const nonExistentKey = "non_existent_key_123";
      const response = await fetchWithAuth(`${API_URL}/sync/keys/${nonExistentKey}`, {
        method: "DELETE",
      });

      assert.equal(response.status, 404);
    });
  });

  describe("Cleanup", function () {
    it("should delete test key with prefix", async function () {
      if (!testKeyWithPrefix) this.skip();

      const response = await fetchWithAuth(`${API_URL}/sync/keys/${testKeyWithPrefix}`, {
        method: "DELETE",
      });

      assert.equal(response.status, 200);
    });
  });
});
