export default function Home() {
  return (
    <div>
      <h1>PatchSignal backend</h1>
      <p>API proof: <code>GET /api/health</code>. Interactive docs: <a href="/docs">/docs</a> (Swagger UI) · raw spec: <a href="/api/openapi">/api/openapi</a>.</p>
      <h2>Start the backend</h2>
      <ol>
        <li>Fill <code>.env</code> (see <code>.env.example</code>): <code>DATABASE_URL</code>, <code>GEMINI_API_KEY</code>, <code>GITHUB_TOKEN</code>, <code>CLOUDINARY_*</code>, <code>RUNNER_TOKEN</code>.</li>
        <li><code>npm install</code> (first time), then <code>npx prisma migrate dev</code> once <code>DATABASE_URL</code> is set.</li>
        <li><code>npm run dev</code> → <code>http://localhost:3000</code> (restart after any <code>.env</code> change).</li>
        <li>Runner (separate terminal): set <code>RUNNER_TOKEN</code> to the same value, then <code>npm run runner:dev</code> → <code>:5001</code>.</li>
      </ol>
      <h2>Flow</h2>
      <ol>
        <li><code>POST /api/investigations</code> (multipart: repoUrl, description, screenshots[])</li>
        <li><code>POST /api/investigations/:id/analyze</code></li>
        <li><code>POST /api/investigations/:id/inspect</code></li>
        <li><code>POST /api/investigations/:id/hypotheses</code></li>
        <li><code>POST /api/investigations/:id/runs</code></li>
        <li><code>GET /api/investigations/:id/package</code></li>
      </ol>
    </div>
  );
}
