
import assert from "node:assert/strict";
import test from "node:test";

import {
  csvCell,
  buildCsv,
} from "./adminReportCsv.js";

test("quotes ordinary CSV values", () => {
  assert.equal(
    csvCell("Mumbai"),
    '"Mumbai"'
  );
});

test("escapes double quotation marks", () => {
  assert.equal(
    csvCell('ACME "Logistics"'),
    '"ACME ""Logistics"""'
  );
});

test("preserves commas within one cell", () => {
  assert.equal(
    csvCell("Mumbai, Maharashtra"),
    '"Mumbai, Maharashtra"'
  );
});

test("neutralizes formula-like values", () => {
  const dangerous = [
    "=HYPERLINK(\"https://example.com\")",
    "+SUM(1,2)",
    "-10+20",
    "@SUM(1,2)",
    "  =SUM(1,2)",
  ];

  for (const value of dangerous) {
    assert.ok(
      csvCell(value).startsWith('"\'')
    );
  }
});

test("builds a CSV with UTF-8 BOM", () => {
  const csv = buildCsv(
    ["Route", "Weight"],
    [["Mumbai → Pune", "2500"]]
  );

  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Mumbai → Pune"'));
  assert.ok(csv.includes('"2500"'));
});

test("rejects mismatched row lengths", () => {
  assert.throws(() =>
    buildCsv(
      ["Route", "Weight"],
      [["Mumbai"]]
    )
  );
});
