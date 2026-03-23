import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import AcompanhamentoPublico from "./AcompanhamentoPublico";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/acompanhamento/:id" element={<AcompanhamentoPublico />} />
    </Routes>
  </BrowserRouter>
);