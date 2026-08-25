/**
 * Minimal dependency-free PDF writer for text fixtures.
 * Emits a spec-compliant single-font, uncompressed PDF whose text
 * layer pdf.js (via unpdf) can extract deterministically.
 */

function escapePdfString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

export function buildTextPdf(pages: string[][]): Uint8Array {
  const objects: (string | undefined)[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let next = 4;

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageIds.push(next++);
    contentIds.push(next++);
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;
  objects[fontId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  pages.forEach((lines, i) => {
    const pid = pageIds[i]!;
    const cid = contentIds[i]!;
    objects[pid] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] ` +
      `/Contents ${cid} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;

    const body =
      "BT\n/F1 11 Tf\n72 720 Td\n14 TL\n" +
      lines.map((l) => `(${escapePdfString(l)}) Tj T*`).join("\n") +
      "\nET";
    objects[cid] =
      `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets = new Map<number, number>();
  const maxId = objects.length - 1;

  for (let id = 1; id <= maxId; id++) {
    const obj = objects[id];
    if (!obj) continue;
    offsets.set(id, out.length);
    out += `${id} 0 obj\n${obj}\nendobj\n`;
  }

  const xrefStart = out.length;
  out += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    const offset = offsets.get(id);
    out += offset !== undefined
      ? `${String(offset).padStart(10, "0")} 00000 n \n`
      : "0000000000 65535 f \n";
  }
  out +=
    `trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(out);
}
