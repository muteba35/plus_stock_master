import test from "node:test";
import assert from "node:assert/strict";
import { requestPayloadGuard, corsOptions } from "../src/middlewares/securityMiddleware.js";
import { activateMockSubscription } from "../src/controllers/subscription.controller.js";

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("payload guard rejects Mongo operators and prototype keys in nested input", () => {
  for (const payload of ['{"email":{"$ne":null}}', '{"nested":{"__proto__":{"isOwner":true}}}', '{"nested":{"a.b":1}}']) {
    const res = response();
    requestPayloadGuard({ body: JSON.parse(payload), query: {}, params: {} }, res, () => assert.fail("must reject"));
    assert.equal(res.statusCode, 400);
  }
  let calls = 0;
  requestPayloadGuard({ body: { nom: "Test", logo: "" }, query: {}, params: {} }, response(), () => calls++);
  assert.equal(calls, 1);
});

test("CORS rejects unknown origins rather than returning a wildcard", () => {
  corsOptions.origin("https://untrusted.example.invalid", error => assert.ok(error));
});

test("test subscriptions cannot activate a paid plan in production", async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const res = response();
    await activateMockSubscription({ user: { isOwner: true }, body: { planCode: "BUSINESS" } }, res);
    assert.equal(res.statusCode, 403);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
