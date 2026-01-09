// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // αν χρησιμοποιείς Tailwind
import { AuthProvider } from "./auth/AuthContext";
import { AuthGate } from "./auth/AuthGate";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </React.StrictMode>
);
