import jsPDF from "jspdf";

export function gerarFichaPdf({
  form,
  services,
  totalValue,
  drawCell,
  formatDateBR,
  formatMoney,
  openPdfPreview,
}) {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);

  const left = 5;
  let y = 5;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("FUNERÁRIA SÃO FRANCISCO DE ASSIS", 105, y + 5, { align: "center" });

  doc.setFontSize(11);
  doc.text("SUELY R. DO PRADO – EPP", 105, y + 9.7, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("CNPJ: 84.522.143/0001-53 – Insc. 04.105.072-0", 105, y + 14, { align: "center" });
  doc.text("Fones: (092) 3633-8095 / 3234-4499", 105, y + 18.2, { align: "center" });
  doc.text("Avenida Carvalho Leal – Manaus – AM", 105, y + 22.4, { align: "center" });

  y += 26;

  drawCell(doc, left, y, 200, 5.9, `FALECIDO: ${form.falecido}`, { bold: true, fontSize: 8.6 });
  y += 5.9;

  drawCell(doc, left, y, 150, 5.9, `LOCAL DO ÓBITO: ${form.localObito}`, { bold: true, fontSize: 8.2 });
  drawCell(doc, 155, y, 50, 5.9, `DATA/SAÍDA: ${formatDateBR(form.dataSaida)}`, { bold: true, fontSize: 8.2 });
  y += 5.9;

  drawCell(doc, left, y, 150, 5.9, `CEMITÉRIO: ${form.cemiterio}`, { bold: true, fontSize: 8.2 });
  drawCell(doc, 155, y, 50, 5.9, `HORA/SAÍDA: ${form.horaSaida}`, { bold: true, fontSize: 8.2 });
  y += 5.9;

  // 👉 PLANO AJUSTADO
  const PLAN_LABELS = {
    particular: "SERVIÇO PARTICULAR",
    pm: "POLICIA MILITAR (DPS AM)",
    tokyo: "TOKYO MARINE (ASSEGURADORA)",
    casai: "CASAI (DSEI MANAUS)",
    autazes: "PREFEITURA DE AUTAZES",
  };

  if (form.tipoPlano === "socio") {
    drawCell(doc, left, y, 55, 5.9, `PLANO: ${form.plano}`, { fontSize: 8 });
    drawCell(doc, 60, y, 45, 5.9, `CÓDIGO: ${form.codigo}`, { fontSize: 8 });
    drawCell(doc, 105, y, 100, 5.9, `DEPENDENTE: ${form.dependente}`, { fontSize: 8 });
  } else {
    drawCell(doc, left, y, 200, 5.9,
      `PLANO: ${PLAN_LABELS[form.tipoPlano] || "SERVIÇO PARTICULAR"}`,
      { fontSize: 8 }
    );
  }

  y += 6;

  // 👉 SERVIÇOS
  services.forEach((item) => {
    drawCell(doc, left, y, 8, 4.8, item.checked ? "X" : "", { align: "center" });
    drawCell(doc, 13, y, 152, 4.8, item.name);
    drawCell(doc, 165, y, 20, 4.8, item.qty || "", { align: "center" });
    drawCell(doc, 185, y, 20, 4.8, item.value ? formatMoney(item.value) : "", { align: "center" });

    y += 4.8;
  });

  drawCell(doc, left, y, 180, 5.6, "VALOR TOTAL:", { bold: true });
  drawCell(doc, 185, y, 20, 5.6, formatMoney(totalValue), { bold: true, align: "center" });

  const filename = `ficha-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Pré-visualização da Ficha");
}