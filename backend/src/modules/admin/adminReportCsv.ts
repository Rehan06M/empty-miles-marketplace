
export function csvCell(value: string): string {
  // Protect spreadsheet applications from interpreting
  // user-supplied text as formulas or commands.
  //
  // Examples:
  // =HYPERLINK(...)
  // +SUM(...)
  // -10+20
  // @SUM(...)
  const dangerous =
    /^[\s\uFEFF]*[=+\-@]/u.test(value);

  const safe = dangerous
    ? `'${value}`
    : value;

  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildCsv(
  headers: string[],
  rows: string[][]
): string {
  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error(
        "CSV row does not match header length"
      );
    }
  }

  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      row.map(csvCell).join(",")
    ),
  ];

  // UTF-8 BOM improves compatibility when
  // opening the downloaded CSV in Excel.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
