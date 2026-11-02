import React from "react";
import ReactDOM from "react-dom/client";
import Raiz from "./Raiz.jsx";
import "./index.css";
import { registrarServiceWorker } from "./utils/push";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Raiz />
  </React.StrictMode>
);

registrarServiceWorker();
