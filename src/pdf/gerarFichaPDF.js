import jsPDF from "jspdf";

export default function gerarFichaPDF({
  form,
  services,
  totalValue,
  formatDateBR,
  formatMoney,
  openPdfPreview,
}) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);

  function drawCell(doc, x, y, w, h, text = "", opts = {}) {
    doc.rect(x, y, w, h);

    const fontSize = opts.fontSize || 13.5;
    doc.setFont("times", opts.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const tx =
      opts.align === "center" ? x + w / 2 : x + (opts.paddingLeft ?? 1.5);

    const ty = y + h / 2 + (opts.offsetY ?? 2.6);

    if (text) {
      doc.text(String(text), tx, ty, {
        maxWidth: w - 2,
        align: opts.align === "center" ? "center" : "left",
      });
    }
  }

  const left = 5;
  let y = 5;

  // 🔥 CABEÇALHO COMPLETO
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("FUNERÁRIA SÃO FRANCISCO DE ASSIS", 105, y + 5, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text("SUELY R. DO PRADO – EPP", 105, y + 10, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    "CNPJ: 84.522.143/0001-53 – Insc. Est. 04.105.072-0",
    105,
    y + 15,
    { align: "center" }
  );

  doc.text(
    "Fones: (092) 3633-8995 / 3234-4499 / 3308-3966 / 3308-3966 / CEP: 69065-000",
    105,
    y + 20,
    { align: "center" }
  );

  doc.text(
    "Avenida Carvalho Leal, Nº 1.000 – Cachoeirinha / Manaus - AM",
    105,
    y + 25,
    { align: "center" }
  );

  doc.text(
    "E-mail – safsaofrancisco@hotmail.com",
    105,
    y + 30,
    { align: "center" }
  );

  doc.line(5, y + 33, 205, y + 33);

  y += 38;

  // 🔥 FALECIDO
  drawCell(doc, left, y, 200, 7, `FALECIDO: ${form.falecido}`, {
    bold: true,
    fontSize: 14,
  });

  y += 7;

  // 🔥 CABEÇALHO DA TABELA
  drawCell(doc, left, y, 150, 6, "SERVIÇO", {
    bold: true,
    fontSize: 13.5,
  });

  drawCell(doc, 155, y, 25, 6, "QTD", {
    bold: true,
    align: "center",
    fontSize: 13.5,
  });

  drawCell(doc, 180, y, 25, 6, "VALOR", {
    bold: true,
    align: "center",
    fontSize: 13.5,
  });

  y += 6;

  // 🔥 SERVIÇOS
  services.forEach((item) => {
    drawCell(doc, left, y, 150, 6, item.name);
    drawCell(doc, 155, y, 25, 6, item.qty || "", { align: "center" });
    drawCell(doc, 180, y, 25, 6, item.value ? formatMoney(item.value) : "", {
      align: "center",
    });
    y += 6;
  });

  // 🔥 TOTAL
  drawCell(doc, left, y, 180, 7, "VALOR TOTAL:", {
    bold: true,
    fontSize: 14,
  });

  drawCell(doc, 180, y, 25, 7, formatMoney(totalValue), {
    bold: true,
    align: "center",
    fontSize: 14,
  });

  y += 15;

  // 🔥 ASSINATURA
  doc.line(40, y + 10, 160, y + 10);
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text("Responsável", 105, y + 15, { align: "center" });

  const filename = `ficha-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Ficha");
}