import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { styles } from "../styles/appStyles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EstrelasDisplay({ nota, size = 13 }) {
  if (nota == null) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s}
           className={s <= Math.round(nota) ? "fa-solid fa-star" : "fa-regular fa-star"}
           style={{ fontSize: size, color: s <= Math.round(nota) ? "#f59e0b" : "#334155" }} />
      ))}
    </span>
  );
}

function getBadge(media) {
  if (media == null) return null;
  if (media >= 4.5) return { label: "Excelente", color: "#15803d", bg: "rgba(34,197,94,0.1)" };
  if (media >= 3.5) return { label: "Bom",       color: "#1d4ed8", bg: "rgba(59,130,246,0.1)" };
  if (media >= 2.5) return { label: "Regular",   color: "#b45309", bg: "rgba(245,158,11,0.1)" };
  return                    { label: "Atenção",   color: "#c2410c", bg: "rgba(239,68,68,0.1)"  };
}

function formatDataCurta(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AvaliacoesTab() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim,    setDataFim]    = useState("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setAvaliacoes(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    let list = avaliacoes;
    if (dataInicio) list = list.filter(a => (a.created_at || "") >= dataInicio);
    if (dataFim)    list = list.filter(a => (a.created_at || "") <= dataFim + "T23:59:59");
    return list;
  }, [avaliacoes, dataInicio, dataFim]);

  const mediaGeral = useMemo(() => {
    const vals = filtradas.map(a => a.media_geral).filter(v => v != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [filtradas]);

  const rankingAtendentes = useMemo(() => {
    const map = {};
    filtradas.forEach(a => {
      if (!a.atendente) return;
      if (!map[a.atendente]) map[a.atendente] = { notas: [], total: 0 };
      if (a.nota_atendimento) map[a.atendente].notas.push(a.nota_atendimento);
      map[a.atendente].total++;
    });
    return Object.entries(map)
      .map(([nome, { notas, total }]) => ({
        nome,
        media: notas.length ? +(notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : 0,
        total,
      }))
      .sort((a, b) => b.media - a.media);
  }, [filtradas]);

  const melhorAtendente = rankingAtendentes[0]?.nome || "—";

  if (loading) {
    return (
      <section style={styles.moduleCard}>
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Carregando avaliações...</div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Avaliações</h2>
          <p style={styles.moduleSub}>Satisfação dos clientes por atendimento</p>
        </div>
      </div>

      {/* Filtro de período */}
      <div style={{ ...styles.card, marginBottom: 20, background: "var(--card-bg-alt)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div style={styles.field}>
            <label style={styles.label}>Data início</label>
            <input type="date" style={styles.input} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Data fim</label>
            <input type="date" style={styles.input} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <button style={{ ...styles.outlineDarkBtn, alignSelf: "flex-end", marginBottom: 14 }} onClick={() => { setDataInicio(""); setDataFim(""); }}>
            Limpar
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total de avaliações", value: filtradas.length },
          { label: "Média geral",         value: mediaGeral != null ? `${mediaGeral} / 5` : "—" },
          { label: "Melhor avaliado",     value: melhorAtendente },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--card-bg-alt)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
          </div>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhuma avaliação encontrada</div>
          <div style={styles.modulePlaceholderText}>As avaliações dos clientes aparecerão aqui após o envio pelo link de acompanhamento.</div>
        </div>
      ) : (
        <>
          {/* Ranking de atendentes */}
          {rankingAtendentes.length > 0 && (
            <div style={{ ...styles.card, marginBottom: 24 }}>
              <h3 style={{ ...styles.cardTitle, fontSize: 17, marginBottom: 16 }}>Ranking de Atendentes</h3>
              {rankingAtendentes.map(({ nome, media, total }, idx) => {
                const badge = getBadge(media);
                const pct   = (media / 5) * 100;
                return (
                  <div key={nome} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", width: 26, textAlign: "center", flexShrink: 0 }}>{idx + 1}º</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <EstrelasDisplay nota={media} size={12} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{media}</span>
                          {badge && <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 999, padding: "2px 8px" }}>{badge.label}</span>}
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({total})</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "var(--border-soft)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: 6, width: `${pct}%`, background: "linear-gradient(90deg, #26b1c4, #1d8ea0)", borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Avaliações recentes */}
          <div style={styles.card}>
            <h3 style={{ ...styles.cardTitle, fontSize: 17, marginBottom: 16 }}>Avaliações Recentes</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtradas.map((a) => {
                const categorias = [
                  { label: "Atendimento",  nota: a.nota_atendimento,  comentario: a.comentario_atendimento  },
                  a.nota_velorio   != null ? { label: "Velório",      nota: a.nota_velorio,      comentario: a.comentario_velorio      } : null,
                  { label: "Remoção",      nota: a.nota_remocao,      comentario: a.comentario_remocao      },
                  { label: "Encerramento", nota: a.nota_encerramento,  comentario: a.comentario_encerramento },
                ].filter(c => c && c.nota != null);

                return (
                  <div key={a.id} style={{ background: "var(--card-bg-alt)", border: "1px solid var(--border-soft)", borderRadius: 14, padding: "14px 16px" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{a.falecido || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {a.atendente && `Atendente: ${a.atendente}`}
                          {a.atendente && a.created_at && " · "}
                          {a.created_at && formatDataCurta(a.created_at)}
                        </div>
                      </div>
                      {a.media_geral != null && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <EstrelasDisplay nota={a.media_geral} size={13} />
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginTop: 2 }}>Média: {a.media_geral.toFixed(1)}</div>
                        </div>
                      )}
                    </div>

                    {/* Categorias com nota + comentário inline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {categorias.map(({ label, nota, comentario }, idx) => (
                        <div key={label} style={{ paddingBottom: idx < categorias.length - 1 ? 10 : 0, borderBottom: idx < categorias.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                          <EstrelasDisplay nota={nota} size={13} />
                          {comentario && (
                            <div style={{ fontSize: 12, color: "var(--text-soft)", fontStyle: "italic", marginTop: 5 }}>"{comentario}"</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
