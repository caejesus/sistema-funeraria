import jsPDF from "jspdf";
import { getCemiterioNome, formatPeso, formatAltura } from "../utils/format";

function maskCpf(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return n.slice(0, 3) + "." + n.slice(3);
  if (n.length <= 9) return n.slice(0, 3) + "." + n.slice(3, 6) + "." + n.slice(6);
  return n.slice(0, 3) + "." + n.slice(3, 6) + "." + n.slice(6, 9) + "-" + n.slice(9);
}

function maskRg(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 9);
  if (n.length <= 2) return n;
  if (n.length <= 5) return n.slice(0, 2) + "." + n.slice(2);
  if (n.length <= 8) return n.slice(0, 2) + "." + n.slice(2, 5) + "." + n.slice(5);
  return n.slice(0, 2) + "." + n.slice(2, 5) + "." + n.slice(5, 8) + "-" + n.slice(8);
}

function maskCelular(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return "(" + n;
  if (n.length <= 7) return "(" + n.slice(0, 2) + ") " + n.slice(2);
  if (n.length <= 10) return "(" + n.slice(0, 2) + ") " + n.slice(2, 6) + "-" + n.slice(6);
  return "(" + n.slice(0, 2) + ") " + n.slice(2, 7) + "-" + n.slice(7);
}

export function gerarFichaPdf({
  form,
  services,
  totalValue,
  drawCell,
  formatDateBR,
  formatMoney,
  openPdfPreview,
  operationalStages = {},
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
      doc.text("CNPJ: 84.522.143/0001-53 – Insc. 04.105.072-0", 105, y + 14, {
        align: "center",
      });
      doc.text(
        "Fones: (092) 3633-8095 / 3234-4499 / 3308-3966 / 3308-3966  CEP: 69065-000",
        105,
        y + 18.2,
        {
          align: "center",
        }
      );
      doc.text(
        "Avenida Carvalho Leal, N°1.000 – Cachoeirinha / Manaus – AM",
        105,
        y + 22.4,
        {
          align: "center",
        }
      );
  
      y += 26;
  
      // L1 — FALECIDO + NASC.
      drawCell(doc, left, y, 150, 5.9, `FALECIDO: ${form.falecido}`, { bold: true, fontSize: 12 });
      drawCell(doc, 155, y, 50, 5.9, `NASC.: ${form.dataNascimento ? formatDateBR(form.dataNascimento) : ""}`, { bold: false, fontSize: 10 });
      y += 5.9;

      // L2 — SEXO, PESO, ALTURA
      drawCell(doc, left, y, 65, 5.9, `SEXO: ${form.sexo || ""}`, { bold: false, fontSize: 10 });
      drawCell(doc, 70,   y, 65, 5.9, `PESO: ${formatPeso(form.peso)}`, { bold: false, fontSize: 10 });
      drawCell(doc, 135,  y, 70, 5.9, `ALTURA: ${formatAltura(form.altura)}`, { bold: false, fontSize: 10 });
      y += 5.9;

      // L3 — LOCAL DO ÓBITO + DATA/SAÍDA
      const localObitoDisplay = String(form.localObito || "").toUpperCase().startsWith("SVO")
        ? "SVO"
        : (form.localObito || "");
      drawCell(doc, left, y, 150, 5.9, `LOCAL DO ÓBITO: ${localObitoDisplay}`, { bold: true, fontSize: 12 });
      drawCell(doc, 155,  y, 50,  5.9, `DATA/SAÍDA: ${formatDateBR(form.dataSaida)}`, { bold: true, fontSize: 12 });
      y += 5.9;

      // L4 — CEMITÉRIO + HORA/SAÍDA
      drawCell(doc, left, y, 150, 5.9, `CEMITÉRIO: ${getCemiterioNome(form.cemiterio)}`, { bold: true, fontSize: 12 });
      drawCell(doc, 155,  y, 50,  5.9, `HORA/SAÍDA: ${form.horaSaida}`, { bold: true, fontSize: 12 });
      y += 5.9;

      // L5 — HORA/ATEND
      drawCell(doc, left, y, 200, 5.9, `HORA/ATEND: ${form.horaAtendimento}`, { bold: true, fontSize: 12 });
      y += 5.9;

      // L6 — DATA/ATEND + CHEGOU NA CLÍNICA + INÍCIO ÀS
      drawCell(doc, left, y, 60, 5.9, `DATA/ATEND: ${formatDateBR(form.dataAtendimento)}`, { bold: true, fontSize: 12 });
      drawCell(doc, 65,   y, 95, 5.9, `CHEGOU NA CLÍNICA ÀS: ${form.chegouClinica}`, { bold: true, fontSize: 7.8 });
      drawCell(doc, 160,  y, 45, 5.9, `INÍCIO ÀS: ${form.inicioAs}`, { bold: true, fontSize: 12 });
      y += 5.9;

      // L7 — TIPO DE SERVIÇO
      const TIPO_LABELS = {
        particular:            "PARTICULAR",
        socio_especial:        "SÓCIO ESPECIAL",
        socio_luxo:            "SÓCIO LUXO",
        socio_premium:         "SÓCIO PREMIUM",
        pm:                    "POLÍCIA MILITAR (DPS AM)",
        tokyo:                 "TOKYO MARINE",
        seguradora:            "SEGURADORA",
        orgao_publico:         "ÓRGÃO PÚBLICO",
        prefeitura_conveniada: "PREFEITURA CONVENIADA",
        casai:                 "CASAI (DSEI MANAUS)",
        autazes:               "PREFEITURA DE AUTAZES",
      };

      const isSocio = ["socio_especial", "socio_luxo", "socio_premium"].includes(form.tipoPlano);

      if (isSocio) {
        const planoLabel = TIPO_LABELS[form.tipoPlano] || form.tipoPlano;
        drawCell(doc, left, y, 65, 5.9, `PLANO: ${planoLabel}`, { fontSize: 12 });
        drawCell(doc, 70,   y, 65, 5.9, `CÓD: ${form.codigo || ""}`, { fontSize: 12 });
        drawCell(doc, 135,  y, 70, 5.9, `DEPENDENTE: ${form.dependente || ""}`, { fontSize: 12 });
      } else {
        const tipoLabel = TIPO_LABELS[form.tipoPlano] || "PARTICULAR";
        drawCell(doc, left, y, 200, 5.9, `TIPO DE SERVIÇO: ${tipoLabel}`, { fontSize: 12 });
      }
      y += 6.6;
  
      drawCell(doc, left, y, 200, 5.9, "SERVIÇOS PRESTADOS", {
        bold: true,
        fontSize: 8.8,
        align: "center",
      });
      y += 5.9;
  
      drawCell(doc, left, y, 8, 5.1, "", {});
      drawCell(doc, 13, y, 152, 5.1, "", {});
      drawCell(doc, 165, y, 20, 5.1, "QUANT.", {
        fontSize: 8.5,
        align: "center",
      });
      drawCell(doc, 185, y, 20, 5.1, "VALOR:", {
        fontSize: 8.5,
        align: "center",
      });
      y += 5.1;
  
      services.forEach((item) => {
        let label = item.name;
  
        if (item.name === "COROA DE FLORES" && item.note) {
          label += `     FRASE: ${item.note}`;
        }
  
        if (item.name === "OUTRAS DESPESAS" && item.note) {
          label += ` ${item.note}`;
        }
  
        drawCell(doc, left, y, 8, 4.8, item.checked ? "X" : "", {
          fontSize: 12,
          bold: true,
          align: "center",
          offsetY: 1.1,
        });
  
        drawCell(doc, 13, y, 152, 4.8, label, {
          fontSize: item.name === "COROA DE FLORES" ? 7.7 : 9.8,
          paddingLeft: 1.5,
        });
  
        drawCell(doc, 165, y, 20, 4.8, item.qty || "", {
          fontSize: 7.8,
          align: "center",
        });
  
        drawCell(
          doc,
          185,
          y,
          20,
          4.8,
          item.value ? formatMoney(item.value) : "",
          {
            fontSize: 10,
            align: "center",
          }
        );
  
        y += 4.8;
      });
  
      drawCell(doc, left, y, 180, 5.6, "VALOR TOTAL:", {
        bold: true,
        fontSize: 12,
      });
      drawCell(doc, 185, y, 20, 5.6, formatMoney(totalValue), {
        bold: true,
        fontSize: 10,
        align: "center",
      });
      y += 6.8;
  
      drawCell(doc, left, y, 200, 5.9, "DADOS DO RESPONSÁVEL", {
        bold: true,
        fontSize: 10,
        align: "center",
      });
      y += 5.9;
  
      drawCell(doc, left, y, 145, 5.9, `NOME: ${form.responsavelNome}`, { fontSize: 12 });
      drawCell(doc, 150, y, 55, 5.9, `CPF: ${maskCpf(form.responsavelCpf)}`, { fontSize: 12 });
      y += 5.9;

      drawCell(doc, left, y, 200, 5.9, `RG: ${maskRg(form.responsavelRg)}`, { fontSize: 12 });
      y += 5.9;

      const enderecoCompleto = [
        form.responsavelEndereco,
        form.responsavelNumero ? `, ${form.responsavelNumero}` : "",
        form.responsavelComplemento ? ` - ${form.responsavelComplemento}` : "",
      ].join("");
      drawCell(doc, left, y, 160, 5.9, `ENDEREÇO: ${enderecoCompleto}`, { fontSize: 12 });
      drawCell(doc, 165, y, 40, 5.9, `CEP: ${form.responsavelCep}`, { fontSize: 12 });
      y += 5.9;

      drawCell(doc, left, y, 75, 5.9, `BAIRRO: ${form.responsavelBairro}`, { fontSize: 12 });
      drawCell(doc, 80,  y, 60, 5.9, `CELULAR: ${maskCelular(form.responsavelCelular1)}`, { fontSize: 12 });
      drawCell(doc, 140, y, 65, 5.9, `CELULAR: ${maskCelular(form.responsavelCelular2)}`, { fontSize: 12 });
      y += 5.9;
  
      const velorioTexto =
        form.velorioTipo === "funeraria"
          ? [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" - ")
          : [
              form.velorioNomeLocal,
              form.velorioEndereco,
              form.velorioNumero,
              form.velorioBairro,
            ]
              .filter(Boolean)
              .join(", ");
  
      drawCell(doc, left, y, 200, 6, `LOCAL DO VELÓRIO: ${velorioTexto}`, {
        fontSize: 12,
      });
      y += 6.8;
  
      function drawTransporteBlock(label, atendenteCol1, driver, car) {
        drawCell(doc, left, y, 70, 5.5, atendenteCol1, { bold: true, fontSize: 10 });
        drawCell(doc, 75,   y, 80, 5.5, `${label} ${driver || ""}`, { bold: true, fontSize: 10 });
        drawCell(doc, 155,  y, 50, 5.5, `CARRO: ${car || ""}`, { bold: true, fontSize: 7.2 });
        y += 5.5;
        drawCell(doc, left, y, 70, 5.5, "", {});
        drawCell(doc, 75,   y, 80, 5.5, "ASSINATURA:", { bold: true, fontSize: 7.2 });
        drawCell(doc, 155,  y, 50, 5.5, "", {});
        y += 5.5;
      }

      drawTransporteBlock(
        "REMOÇÃO:",
        `ATENDENTE: ${form.atendenteGeral || ""}`,
        operationalStages?.remocao?.driver || form.Remocao || "",
        operationalStages?.remocao?.car    || form.carroRemocao || ""
      );

      drawTransporteBlock(
        "ENTREGA:",
        "ATENDENTE:",
        operationalStages?.entrega?.driver || form.Entrega || "",
        operationalStages?.entrega?.car    || form.carroEntrega || ""
      );

      drawTransporteBlock(
        "SEPULTAMENTO:",
        "ATENDENTE:",
        operationalStages?.sepultamento?.driver || form.Sepultamento || "",
        operationalStages?.sepultamento?.car    || form.carroSepultamento || ""
      );
  
      const assinaturaY = Math.min(y + 40, 297);
      doc.setFont("times", "bold");
      doc.setFontSize(8.2);
      doc.text("Responsável:", 45, assinaturaY + 0.5);
      doc.line(70, assinaturaY, 145, assinaturaY);
  
      const filename = `ficha-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;
  
  openPdfPreview(doc, filename, "Pré-visualização da Ficha");
    }