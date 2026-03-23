import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

export default function TesteSupabase() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarAtendimentos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("atendimentos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Erro ao listar:", error);
      alert("Erro ao listar atendimentos");
      setCarregando(false);
      return;
    }

    setAtendimentos(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarAtendimentos();
  }, []);

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>ATENDIMENTOS SALVOS</h1>

      <button
        onClick={carregarAtendimentos}
        style={{
          padding: "12px 20px",
          fontSize: "16px",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        Atualizar lista
      </button>

      {carregando ? (
        <p>Carregando...</p>
      ) : atendimentos.length === 0 ? (
        <p>Nenhum atendimento encontrado.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {atendimentos.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 10,
                padding: 16,
                background: "#f7f7f7",
              }}
            >
              <div><strong>ID:</strong> {item.id}</div>
              <div><strong>Falecido:</strong> {item.falecido || "-"}</div>
              <div><strong>Responsável:</strong> {item.responsavel || "-"}</div>
              <div><strong>Data:</strong> {item.data_atendimento || "-"}</div>
              <div><strong>Status:</strong> {item.status || "-"}</div>
              <div><strong>Observações:</strong> {item.observacoes || "-"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
