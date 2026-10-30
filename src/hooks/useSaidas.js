import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getSaidaTipoLabel } from "../constants/saidas";

const LIMITE_HISTORICO = 300;

function normalizarDestino(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

async function atualizarFrota(carro, status, motivo, updatedBy) {
  if (!carro) return;
  const { error } = await supabase.from("frota").upsert(
    {
      carro,
      status,
      motivo: motivo || "",
      atendimento_id: null,
      updated_by: updatedBy || "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "carro" }
  );
  if (error) console.error("Erro ao atualizar frota:", error);
}

export function useSaidas(session) {
  const [saidas, setSaidas] = useState([]);
  const [frota, setFrota] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(true);

  const nomeUsuario = session?.name || "";

  // ── Load ───────────────────────────────────────────────────────────────────

  const carregarSaidas = useCallback(async () => {
    const { data, error } = await supabase
      .from("frota_saidas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LIMITE_HISTORICO);
    if (error) {
      console.error("Erro ao carregar saídas:", error);
    } else {
      setSaidas(data || []);
    }
    setLoading(false);
  }, []);

  const carregarFrota = useCallback(async () => {
    const { data } = await supabase.from("frota").select("*");
    setFrota(data || []);
  }, []);

  const carregarDestinos = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("items").eq("key", "destinos").maybeSingle();
    setDestinos(Array.isArray(data?.items) ? data.items : []);
  }, []);

  useEffect(() => {
    carregarSaidas();
    carregarFrota();
    carregarDestinos();

    const ch = supabase
      .channel("frota-saidas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "frota_saidas" }, carregarSaidas)
      .on("postgres_changes", { event: "*", schema: "public", table: "frota" }, carregarFrota)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregarSaidas, carregarFrota, carregarDestinos]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const abertas = useMemo(
    () =>
      saidas
        .filter((s) => s.status === "aguardando" || s.status === "em_andamento")
        .sort((a, b) => {
          // Em andamento primeiro; depois aguardando por horário agendado (sem horário = agora)
          if (a.status !== b.status) return a.status === "em_andamento" ? -1 : 1;
          const ta = new Date(a.agendado_para || a.created_at).getTime();
          const tb = new Date(b.agendado_para || b.created_at).getTime();
          return ta - tb;
        }),
    [saidas]
  );

  const historico = useMemo(
    () => saidas.filter((s) => s.status === "concluida" || s.status === "cancelada"),
    [saidas]
  );

  // Carros que não podem sair agora (em serviço, manutenção etc.)
  const carrosIndisponiveis = useMemo(() => {
    const map = {};
    frota.forEach((f) => {
      if (f.status && f.status !== "disponivel") map[f.carro] = f.status;
    });
    saidas.forEach((s) => {
      if (s.status === "em_andamento" && s.carro) map[s.carro] = "em_servico";
    });
    return map;
  }, [frota, saidas]);

  const ultimoKmPorCarro = useMemo(() => {
    const map = {};
    saidas.forEach((s) => {
      if (!s.carro) return;
      const km = Math.max(Number(s.km_retorno) || 0, Number(s.km_saida) || 0);
      if (km && (!map[s.carro] || km > map[s.carro])) map[s.carro] = km;
    });
    return map;
  }, [saidas]);

  // ── Destinos ───────────────────────────────────────────────────────────────

  async function registrarDestino(destino) {
    const d = normalizarDestino(destino);
    if (!d || destinos.includes(d)) return;
    const lista = [...destinos, d].sort((a, b) => a.localeCompare(b, "pt-BR"));
    setDestinos(lista);
    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key: "destinos", items: lista }], { onConflict: "key" });
    if (error) console.error("Erro ao salvar destino:", error);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  // Atendente lança um serviço para os motoristas
  async function criarSaida(dados) {
    const registro = {
      tipo: dados.tipo,
      status: "aguardando",
      falecido: String(dados.falecido || "").trim().toUpperCase(),
      local_tipo: dados.local_tipo || "",
      local_ident: String(dados.local_ident || "").trim(),
      destino: normalizarDestino(dados.destino),
      descricao: String(dados.descricao || "").trim(),
      agendado_para: dados.agendado_para || null,
      criado_por: nomeUsuario,
    };
    const { error } = await supabase.from("frota_saidas").insert([registro]);
    if (error) {
      console.error("Erro ao lançar saída:", error);
      return { ok: false, erro: error.message };
    }
    if (registro.destino) registrarDestino(registro.destino);
    carregarSaidas();
    return { ok: true };
  }

  // Motorista assume e inicia um serviço lançado
  async function iniciarSaida(id, { carro, kmSaida }) {
    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("frota_saidas")
      .update({
        status: "em_andamento",
        motorista: nomeUsuario,
        carro,
        km_saida: kmSaida,
        iniciado_em: agora,
        updated_at: agora,
      })
      .eq("id", id)
      .eq("status", "aguardando") // impede que dois motoristas assumam o mesmo serviço
      .select();
    if (error) {
      console.error("Erro ao iniciar saída:", error);
      return { ok: false, erro: error.message };
    }
    if (!data || !data.length) {
      carregarSaidas();
      return { ok: false, erro: "Este serviço já foi assumido por outro motorista." };
    }
    await atualizarFrota(carro, "em_servico", getSaidaTipoLabel(data[0].tipo), nomeUsuario);
    carregarSaidas();
    return { ok: true };
  }

  // Motorista cria uma saída avulsa (já sai em andamento)
  async function criarSaidaAvulsa({ descricao, carro, kmSaida }) {
    const agora = new Date().toISOString();
    const { error } = await supabase.from("frota_saidas").insert([
      {
        tipo: "avulsa",
        status: "em_andamento",
        descricao: String(descricao || "").trim(),
        criado_por: nomeUsuario,
        motorista: nomeUsuario,
        carro,
        km_saida: kmSaida,
        iniciado_em: agora,
      },
    ]);
    if (error) {
      console.error("Erro ao criar saída avulsa:", error);
      return { ok: false, erro: error.message };
    }
    await atualizarFrota(carro, "em_servico", `SAÍDA AVULSA: ${descricao}`, nomeUsuario);
    carregarSaidas();
    return { ok: true };
  }

  // Motorista conclui (retorno)
  async function concluirSaida(id, { kmRetorno, obs }) {
    const saida = saidas.find((s) => s.id === id);
    if (!saida) return { ok: false, erro: "Saída não encontrada." };
    if (saida.km_saida != null && kmRetorno < saida.km_saida) {
      return { ok: false, erro: "O KM de retorno não pode ser menor que o KM de saída." };
    }
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("frota_saidas")
      .update({
        status: "concluida",
        km_retorno: kmRetorno,
        obs_retorno: String(obs || "").trim(),
        concluido_em: agora,
        updated_at: agora,
      })
      .eq("id", id);
    if (error) {
      console.error("Erro ao concluir saída:", error);
      return { ok: false, erro: error.message };
    }
    await atualizarFrota(saida.carro, "disponivel", "", nomeUsuario);
    carregarSaidas();
    return { ok: true };
  }

  // Atendente cancela um serviço que ainda não saiu
  async function cancelarSaida(id) {
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("frota_saidas")
      .update({ status: "cancelada", updated_at: agora })
      .eq("id", id)
      .eq("status", "aguardando");
    if (error) {
      console.error("Erro ao cancelar saída:", error);
      return { ok: false, erro: error.message };
    }
    carregarSaidas();
    return { ok: true };
  }

  return {
    saidas,
    abertas,
    historico,
    destinos,
    loading,
    carrosIndisponiveis,
    ultimoKmPorCarro,
    criarSaida,
    iniciarSaida,
    criarSaidaAvulsa,
    concluirSaida,
    cancelarSaida,
  };
}
