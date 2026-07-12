import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "./escape-html";

test("escapes all HTML-significant characters", () => {
  assert.equal(
    escapeHtml(`<b onmouseover="alert('x')">&티비</b>`),
    "&lt;b onmouseover=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;티비&lt;/b&gt;",
  );
});

test("passes plain Korean product titles through unchanged", () => {
  assert.equal(escapeHtml("신라면 멀티팩 5+1"), "신라면 멀티팩 5+1");
});

test("empty string stays empty", () => {
  assert.equal(escapeHtml(""), "");
});
