import assert from "node:assert/strict";
import { test } from "node:test";
import { matchTerm, rank } from "../src/finder/fuzzy.ts";
import type { Bookmark } from "../src/protocol.ts";

const bookmarks: Bookmark[] = [
  { path: "assist/gitlab", url: "https://gitlab.example.com/", tags: [] },
  { path: "dev/github", url: "https://github.com/x71c9", tags: [] },
  { path: "dev/graph-host", url: "https://graphs.local/", tags: [] },
  { path: "search/duck", url: "https://duckduckgo.com/", tags: [] },
  { path: "work/repo", url: "https://gitlab.work.com/repo", tags: [] },
];

const paths = (query: string, matchUrl = true) =>
  rank(bookmarks, query, matchUrl).map((result) => result.bookmark.path);

test("an empty query keeps every bookmark in order", () => {
  assert.deepEqual(
    paths(""),
    bookmarks.map((b) => b.path),
  );
  assert.deepEqual(
    paths("   "),
    bookmarks.map((b) => b.path),
  );
});

test("matches subsequences and drops the rest", () => {
  assert.deepEqual(paths("dck"), ["search/duck"]);
  assert.deepEqual(paths("zzz"), []);
});

test("consecutive characters rank higher", () => {
  assert.equal(paths("gith")[0], "dev/github");
});

test("word starts rank higher", () => {
  assert.equal(paths("dg")[0], "dev/github");
});

test("urls are searched only when enabled, below paths", () => {
  assert.deepEqual(paths("gitlab", false), ["assist/gitlab"]);
  assert.deepEqual(paths("gitlab"), ["assist/gitlab", "work/repo"]);
});

test("every space separated term must match", () => {
  assert.deepEqual(paths("dev hub"), ["dev/github"]);
  assert.deepEqual(paths("dev duck"), []);
});

test("matching is case insensitive and reports path positions", () => {
  assert.deepEqual(matchTerm("dev", "Dev/GitHub")?.positions, [0, 1, 2]);
  const [first] = rank(bookmarks, "DUCK", true);
  assert.deepEqual(first?.positions, [7, 8, 9, 10]);
});
