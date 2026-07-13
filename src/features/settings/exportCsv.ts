export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const serialize = (value: unknown) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => serialize(row[header])).join(',')),
  ];

  return lines.join('\n');
}

export function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}
