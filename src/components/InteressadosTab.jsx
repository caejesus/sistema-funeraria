import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Pedidos de informação deixados nos tablets das salas
export function InteressadosTab({ session }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("pendentes");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("interessados")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) console.error("Erro ao carregar interessados:", error);
    setLista(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

  async function marcar(item, atendido) {
    const mudancas = atendido
      ? { atendido: true, atendido_por: session?.name || "", atendido_em: new Date().toISOString() }
      : { atendido: false, atendido_por: "", atendido_em: null };
    const { error } = await supabase.from("interessados").update(mudancas).eq("id", item.id);
    if (error) { alert("Não foi possível salvar."); return; }
    setLista((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...mudancas } : i)));
  }

  function linkWhats(item) {
    const dig = String(item.contato || "").replace(/\D/g, "");
    if (dig.length < 10) return "";
    const numero = dig.length <= 11 ? `55${dig}` : dig;
    const texto = `Olá, ${String(item.nome || "").split(" ")[0]}! Aqui é do Grupo São Francisco. Você pediu informações sobre ${String(item.assunto || "nossos serviços").toLowerCase()}. Posso te ajudar?`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  const pendentes = lista.filter((i) => !i.atendido);
  const visiveis = filtro === "pendentes" ? pendentes : lista;

  const chip = (ativo) => ({
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid var(--border-soft)",
    background: ativo ? "var(--brand-accent)" : "var(--card-bg)",
    color: ativo ? "#fff" : "var(--text-main)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <section style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-main)" }}>Interessados</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Pedidos de informação deixados nos tablets das salas</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" style={chip(filtro === "pendentes")} onClick={() => setFiltro("pendentes")}>Para atender ({pendentes.length})</button>
        <button type="button" style={chip(filtro === "todos")} onClick={() => setFiltro("todos")}>Todos ({lista.length})</button>
        <button type="button" style={{ ...chip(false), marginLeft: "auto" }} onClick={carregar}>
          <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }} />Atualizar
        </button>
      </div>

      {carregando && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</div>}
      {!carregando && visiveis.length === 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          {filtro === "pendentes" ? "Nenhum pedido esperando contato." : "Nenhum pedido ainda."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visiveis.map((item) => {
          const whats = linkWhats(item);
          return (
            <div key={item.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: item.atendido ? 0.65 : 1 }}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>{item.nome}</div>
                <div style={{ fontSize: 13, color: "var(--text-main)" }}>{item.assunto || "Informações gerais"} · {item.contato}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {new Date(item.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {item.sala ? ` · ${item.sala}` : ""}{item.unidade ? ` · ${item.unidade}` : ""}
                  {item.atendido ? ` · atendido por ${item.atendido_por || "—"}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {whats && (
                  <a href={whats} target="_blank" rel="noopener noreferrer" style={{ minHeight: 40, padding: "0 14px", borderRadius: 10, background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <i className="fa-brands fa-whatsapp" />WhatsApp
                  </a>
                )}
                <button type="button" onClick={() => marcar(item, !item.atendido)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--card-bg)", color: "var(--text-main)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {item.atendido ? "Reabrir" : "Marcar como atendido"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
