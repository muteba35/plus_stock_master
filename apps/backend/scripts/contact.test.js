import assert from "node:assert/strict";
import { createContactHandler } from "../src/routes/contact.routes.js";
let deliveries = [];
const handler = createContactHandler(async options => { deliveries.push(options); });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } });
const valid = { name: "Test User", email: "sender@example.invalid", subject: "Test contact", message: "A fictional test message <script>alert(1)</script>", consent: true };
let res = response(); await handler({ body: valid }, res);
assert.equal(res.statusCode, 200);
assert.equal(deliveries[0].email, "juniormuteba10@gmail.com");
assert.equal(deliveries[0].replyTo, valid.email);
assert.ok(!deliveries[0].html.includes("<script>"));
for (const bad of [{ email: "x\r\nBcc:spam@example.com" }, { consent: false }, { message: "short" }, { name: {} }, { message: "x".repeat(4001) }]) {
  res = response(); await handler({ body: { ...valid, ...bad } }, res); assert.equal(res.statusCode, 400);
}
res = response(); await handler({ body: { ...valid, website: "spam" } }, res); assert.equal(deliveries.length, 1);
res = response(); await createContactHandler(async () => { throw new Error("provider failure"); })({ body: valid }, res); assert.equal(res.statusCode, 503);
console.log("Contact: validation, fixed recipient, HTML escaping, honeypot and provider errors OK. No email sent.");
