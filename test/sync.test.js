var assert = require("assert");

const API_URL = "http://localhost:8080";
const API_TOKEN = "123456";

describe("Sync API", function () {
  let createdKey;

  describe("POST /sync/create-key", function () {
    it("should create key without prefix", async function () {
      const response = await fetch(`${API_URL}/sync/create-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.syncKey);
      createdKey = result.data.syncKey;
    });

    it("should create key with prefix", async function () {
      const response = await fetch(`${API_URL}/sync/create-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ prefix: "test" }),
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.syncKey.startsWith("test_"));
    });
  });

  describe("GET /sync/keys", function () {
    it("should list all keys", async function () {
      const response = await fetch(`${API_URL}/sync/keys`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(Array.isArray(result.data.keys));
      assert.ok(result.data.keys.length >= 2);
    });
  });

  describe("GET /sync (Bearer Auth)", function () {
    it("should fetch empty data", async function () {
      if (!createdKey) this.skip();

      const response = await fetch(`${API_URL}/sync`, {
        headers: { Authorization: `Bearer ${createdKey}` },
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.equal(result.data.data, null);
    });

    it("should fail with invalid key", async function () {
      const response = await fetch(`${API_URL}/sync`, {
        headers: { Authorization: "Bearer invalid_key" },
      });

      assert.equal(response.status, 404);
    });
  });

  describe("POST /sync (Push Data)", function () {
    it("should push data successfully", async function () {
      if (!createdKey) this.skip();

      const response = await fetch(`${API_URL}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${createdKey}`,
        },
        body: JSON.stringify({ data: { test: "hello" } }),
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.ok(result.success);
      assert.ok(result.data.lastSyncTime);
    });

    it("should fetch pushed data", async function () {
      if (!createdKey) this.skip();

      const response = await fetch(`${API_URL}/sync`, {
        headers: { Authorization: `Bearer ${createdKey}` },
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.deepEqual(result.data.data, { test: "hello" });
    });
  });

  describe("DELETE /sync/keys/:key", function () {
    it("should delete key", async function () {
      if (!createdKey) this.skip();

      const response = await fetch(`${API_URL}/sync/keys/${createdKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      assert.equal(response.status, 200);
    });

    it("key should not exist after delete", async function () {
      if (!createdKey) this.skip();

      const response = await fetch(`${API_URL}/sync`, {
        headers: { Authorization: `Bearer ${createdKey}` },
      });

      assert.equal(response.status, 404);
    });
  });
});
