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
  
      drawCell(doc, left, y, 200, 5.9, `FALECIDO: ${form.falecido}`, {
        bold: true,
        fontSize: 8.6,
      });
      y += 5.9;
  
      drawCell(doc, left, y, 150, 5.9, `LOCAL DO ÓBITO: ${form.localObito}`, {
        bold: true,
        fontSize: 8.2,
      });
      drawCell(
        doc,
        155,
        y,
        50,
        5.9,
        `DATA/SAÍDA: ${formatDateBR(form.dataSaida)}`,
        {
          bold: true,
          fontSize: 8.2,
        }
      );
      y += 5.9;
  
      drawCell(doc, left, y, 150, 5.9, `CEMITÉRIO: ${form.cemiterio}`, {
        bold: true,
        fontSize: 8.2,
      });
      drawCell(doc, 155, y, 50, 5.9, `HORA/SAÍDA: ${form.horaSaida}`, {
        bold: true,
        fontSize: 8.2,
      });
      y += 5.9;
  
      drawCell(doc, left, y, 200, 5.9, `HORA/ATEND: ${form.horaAtendimento}`, {
        bold: true,
        fontSize: 8.2,
      });
      y += 5.9;
  
      drawCell(
        doc,
        left,
        y,
        60,
        5.9,
        `DATA/ATEND: ${formatDateBR(form.dataAtendimento)}`,
        {
          bold: true,
          fontSize: 8,
        }
      );
      drawCell(
        doc,
        65,
        y,
        95,
        5.9,
        `CHEGOU NA CLÍNICA ÀS: ${form.chegouClinica}`,
        {
          bold: true,
          fontSize: 7.8,
        }
      );
      drawCell(doc, 160, y, 45, 5.9, `INÍCIO ÀS: ${form.inicioAs}`, {
        bold: true,
        fontSize: 8,
      });
      y += 5.9;
  
      if (form.tipoPlano === "socio") {
        drawCell(doc, left, y, 55, 5.9, `PLANO: ${form.plano}`, {
          fontSize: 8,
        });
        drawCell(doc, 60, y, 45, 5.9, `CÓDIGO: ${form.codigo}`, {
          fontSize: 8,
        });
        drawCell(doc, 105, y, 100, 5.9, `DEPENDENTE: ${form.dependente}`, {
          fontSize: 8,
        });
      } else {
        drawCell(doc, left, y, 200, 5.9, `PLANO: SERVIÇO PARTICULAR`, {
          fontSize: 8,
        });
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
        fontSize: 7.6,
        align: "center",
      });
      drawCell(doc, 185, y, 20, 5.1, "VALOR:", {
        fontSize: 7.6,
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
          fontSize: 8,
          bold: true,
          align: "center",
          offsetY: 1.1,
        });
  
        drawCell(doc, 13, y, 152, 4.8, label, {
          fontSize: item.name === "COROA DE FLORES" ? 6.8 : 7.6,
          paddingLeft: 1.5,
        });
  
        drawCell(doc, 165, y, 20, 4.8, item.qty || "", {
          fontSize: 7.3,
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
            fontSize: 7.3,
            align: "center",
          }
        );
  
        y += 4.8;
      });
  
      drawCell(doc, left, y, 180, 5.6, "VALOR TOTAL:", {
        bold: true,
        fontSize: 7.8,
      });
      drawCell(doc, 185, y, 20, 5.6, formatMoney(totalValue), {
        bold: true,
        fontSize: 7.5,
        align: "center",
      });
      y += 6.8;
  
      drawCell(doc, left, y, 200, 5.9, "DADOS DO RESPONSÁVEL", {
        bold: true,
        fontSize: 8.8,
        align: "center",
      });
      y += 5.9;
  
      drawCell(doc, left, y, 145, 5.9, `NOME: ${form.responsavelNome}`, {
        fontSize: 7.7,
      });
      drawCell(doc, 150, y, 55, 5.9, `CPF: ${form.responsavelCpf}`, {
        fontSize: 7.7,
      });
      y += 5.9;
  
      drawCell(doc, left, y, 200, 5.9, `RG: ${form.responsavelRg}`, {
        fontSize: 7.7,
      });
      y += 5.9;
  
      drawCell(doc, left, y, 160, 5.9, `ENDEREÇO: ${form.responsavelEndereco}`, {
        fontSize: 7.4,
      });
      drawCell(doc, 165, y, 40, 5.9, `CEP: ${form.responsavelCep}`, {
        fontSize: 7.4,
      });
      y += 5.9;
  
      drawCell(doc, left, y, 75, 5.9, `BAIRRO: ${form.responsavelBairro}`, {
        fontSize: 7.4,
      });
      drawCell(doc, 80, y, 60, 5.9, `CELULAR: ${form.responsavelCelular1}`, {
        fontSize: 7.4,
      });
      drawCell(doc, 140, y, 65, 5.9, `CELULAR: ${form.responsavelCelular2}`, {
        fontSize: 7.4,
      });
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
        fontSize: 7.4,
      });
      y += 6.8;
  
      function drawFinalBlock(titulo, atendente, motorista, carro, showDetails = false) {
        drawCell(
          doc,
          left,
          y,
          70,
          5.5,
          showDetails ? `ATENDENTE: ${atendente || ""}` : "",
          {
            bold: true,
            fontSize: 7.2,
          }
        );
        drawCell(
          doc,
          75,
          y,
          80,
          5.5,
          showDetails ? `${titulo} ${motorista || ""}` : titulo,
          {
            bold: true,
            fontSize: 7.2,
          }
        );
        drawCell(
          doc,
          155,
          y,
          50,
          5.5,
          showDetails ? `CARRO: ${carro || ""}` : "",
          {
            bold: true,
            fontSize: 7.2,
          }
        );
        y += 5.5;
  
        drawCell(doc, left, y, 70, 5.5, "", {});
        drawCell(doc, 75, y, 80, 5.5, "ASSINATURA:", {
          bold: true,
          fontSize: 7.2,
        });
        drawCell(doc, 155, y, 50, 5.5, "", {});
        y += 5.5;
      }
  
      drawFinalBlock(
        "REMOÇÃO:",
        form.atendenteRemocao,
        form.Remocao,
        form.carroRemocao,
        true
      );
  
      drawFinalBlock(
        "ENTREGA:",
        form.atendenteEntrega,
        form.Entrega,
        form.carroEntrega,
        false
      );
  
      drawFinalBlock(
        "SEPULTAMENTO:",
        form.atendenteSepultamento,
        form.Sepultamento,
        form.carroSepultamento,
        false
      );
  
      const assinaturaY = Math.min(y + 24, 287);
      doc.setFont("times", "bold");
      doc.setFontSize(8.2);
      doc.text("Responsável:", 45, assinaturaY + 0.5);
      doc.line(70, assinaturaY, 145, assinaturaY);
  
      const filename = `ficha-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;
  
  openPdfPreview(doc, filename, "Pré-visualização da Ficha");
    }