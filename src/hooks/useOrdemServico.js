import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useOrdemServico() {
  const [ordens, setOrdens] = useState([]);

  useEffect(() => {
    carregarOrdens();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-ordens-servico")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordens_servico" },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const novaOrdem = payload.new;
          const novoRecordId = String(novaOrdem.record_id || "");
          if (!novoRecordId) return;
          setOrdens((prev) => {
            const exists = prev.some((o) => o.record_id === novoRecordId);
            if (exists) return prev.map((o) => o.record_id === novoRecordId ? novaOrdem : o);
            return [novaOrdem, ...prev];
          });
        }
      )
      .subscribe((status) => console.log("Realtime OS:", status));

    return () => supabase.removeChannel(channel);
  }, []);

  async function carregarOrdens() {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("Erro ao carregar OS:", error); return; }
    setOrdens(data || []);
  }

  function getNextOsNumber(lista) {
    const year = new Date().getFullYear();
    const yearItems = lista.filter((o) =>
      String(o.numero || "").startsWith(`OS-${year}-`)
    );
    const next = yearItems.length + 1;
    return `OS-${year}-${String(next).padStart(4, "0")}`;
  }

  async function criarOrdem(dados) {
    const now = new Date().toISOString();
    const recordId = String(Date.now());
    const numero = getNextOsNumber(ordens);

    const ordem = {
      record_id: recordId,
      numero,
      status: "aguardando_remocao",
      falecido: dados.falecido || "",
      local_obito: dados.local_obito || "",
      endereco: dados.local_obito === "SVO" ? (dados.endereco || "") : "",
      observacoes: dados.observacoes || "",
      motorista: dados.motorista || "",
      carro: dados.carro || "",
      prioridade: dados.prioridade || "normal",
      dados: { ...dados, criado_em: now },
      updated_at: now,
    };

    const { error } = await supabase.from("ordens_servico").insert([ordem]);
    if (error) {
      console.error("Erro ao criar OS:", error);
      alert("Erro ao criar OS no banco.");
      return false;
    }
    setOrdens((prev) => [ordem, ...prev]);
    return true;
  }

  async function atualizarStatus(recordId, status) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ordens_servico")
      .update({ status, updated_at: now })
      .eq("record_id", String(recordId));
    if (error) {
      console.error("Erro ao atualizar status OS:", error);
      alert("Erro ao atualizar status.");
      return false;
    }
    setOrdens((prev) =>
      prev.map((o) =>
        o.record_id === String(recordId) ? { ...o, status, updated_at: now } : o
      )
    );
    return true;
  }

  async function cancelarOrdem(recordId, motivo) {
    const now = new Date().toISOString();
    const ordem = ordens.find((o) => o.record_id === String(recordId));
    const dadosAtualizados = {
      ...(ordem?.dados || {}),
      motivo_cancelamento: motivo,
      cancelado_em: now,
    };
    const novaObs = motivo ? `[CANCELADA] ${motivo}` : (ordem?.observacoes || "");

    const { error } = await supabase
      .from("ordens_servico")
      .update({ status: "cancelada", updated_at: now, dados: dadosAtualizados, observacoes: novaObs })
      .eq("record_id", String(recordId));
    if (error) {
      console.error("Erro ao cancelar OS:", error);
      alert("Erro ao cancelar OS.");
      return false;
    }
    setOrdens((prev) =>
      prev.map((o) =>
        o.record_id === String(recordId)
          ? { ...o, status: "cancelada", updated_at: now, dados: dadosAtualizados, observacoes: novaObs }
          : o
      )
    );
    return true;
  }

  async function marcarComoConvertida(recordId) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ordens_servico")
      .update({ status: "finalizada", convertida_em: now, updated_at: now })
      .eq("record_id", String(recordId));
    if (error) {
      console.error("Erro ao marcar OS como convertida:", error);
      return false;
    }
    setOrdens((prev) =>
      prev.map((o) =>
        o.record_id === String(recordId)
          ? { ...o, status: "finalizada", convertida_em: now, updated_at: now }
          : o
      )
    );
    return true;
  }

  function converterEmAtendimento(recordId) {
    const ordem = ordens.find((o) => o.record_id === String(recordId));
    if (!ordem) return null;

    const d = ordem.dados || {};
    const isSvo = (ordem.local_obito || "").toUpperCase() === "SVO";

    return {
      falecido:            ordem.falecido    || d.falecido    || "",
      localObito:          isSvo ? "" : (ordem.local_obito || d.local_obito || ""),
      sexo:                d.sexo            || "",
      peso:                d.peso            || "",
      altura:              d.altura          || "",
      responsavelNome:     d.responsavel_nome     || "",
      responsavelTelefone: d.responsavel_telefone || "",
      motorista:           ordem.motorista   || d.motorista   || "",
      carroGeral:          ordem.carro       || d.carro       || "",
      observacaoTermo:     ordem.observacoes || d.observacoes || "",
      isSvo,
      cep:         d.cep         || "",
      endereco:    d.endereco    || "",
      numero:      d.numero      || "",
      _osNumero:   ordem.numero,
      _osRecordId: ordem.record_id,
    };
  }

  const ordensAtivas = ordens.filter(
    (o) => o.status !== "finalizada" && o.status !== "cancelada"
  );

  return {
    ordens,
    ordensAtivas,
    criarOrdem,
    atualizarStatus,
    cancelarOrdem,
    converterEmAtendimento,
    marcarComoConvertida,
  };
}
