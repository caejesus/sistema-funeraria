export function drawCell(doc, x, y, w, h, text = "", opts = {}) {
  doc.rect(x, y, w, h);

  const fontSize = opts.fontSize || 8;
  doc.setFont("times", opts.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);

  const tx =
    opts.align === "center"
      ? x + w / 2
      : opts.align === "right"
      ? x + w - 2
      : x + 2;

  const ty = y + h / 2 + (opts.offsetY ?? 1.25);

  if (text) {
    doc.text(String(text), tx, ty, {
      maxWidth: w - 2,
      align: opts.align === "center" ? "center" : "left",
    });
  }
}