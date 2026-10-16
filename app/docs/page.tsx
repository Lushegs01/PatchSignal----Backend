"use client";

import { useEffect, useState } from "react";

// Swagger UI via CDN (no npm dep). Falls back to endpoint list when offline.
export default function DocsPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SwaggerUIBundle?.({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
      });
    };
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
    const timer = setTimeout(() => {
      if (!document.querySelector("#swagger-ui .swagger-ui")) setFailed(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (failed) {
    return (
      <div>
        <h1>PatchSignal API (offline fallback)</h1>
        <p>Swagger UI CDN unreachable. Raw spec: <a href="/api/openapi">/api/openapi</a></p>
        <ul>
          <li>GET /api/health</li>
          <li>POST /api/investigations (multipart)</li>
          <li>GET /api/investigations/:id</li>
          <li>GET /api/investigations/:id/events (SSE)</li>
          <li>POST /api/investigations/:id/analyze</li>
          <li>POST /api/investigations/:id/inspect</li>
          <li>POST /api/investigations/:id/hypotheses</li>
          <li>POST /api/investigations/:id/runs</li>
          <li>GET /api/investigations/:id/package</li>
        </ul>
      </div>
    );
  }
  return <div id="swagger-ui" />;
}
