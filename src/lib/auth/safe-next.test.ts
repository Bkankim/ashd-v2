import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSafeNext } from "./safe-next";

const BASE = "https://ashd.bkan.dev/auth/callback";

test("allows plain relative paths, preserving query and hash", () => {
  assert.equal(resolveSafeNext("/products/42", BASE), "/products/42");
  assert.equal(resolveSafeNext("/upload?retry=1#top", BASE), "/upload?retry=1#top");
});

test("rejects absolute URLs", () => {
  assert.equal(resolveSafeNext("https://evil.com/phish", BASE), "/dashboard");
});

test("rejects protocol-relative URLs", () => {
  assert.equal(resolveSafeNext("//evil.com", BASE), "/dashboard");
});

test("rejects backslash normalization bypass", () => {
  assert.equal(resolveSafeNext("/\\evil.com", BASE), "/dashboard");
  assert.equal(resolveSafeNext("/\\\\evil.com", BASE), "/dashboard");
});

test("rejects control characters", () => {
  assert.equal(resolveSafeNext("/ok\u0000path", BASE), "/dashboard");
  assert.equal(resolveSafeNext("/ok\tpath", BASE), "/dashboard");
});

test("null/empty falls back", () => {
  assert.equal(resolveSafeNext(null, BASE), "/dashboard");
  assert.equal(resolveSafeNext("", BASE), "/dashboard");
});
