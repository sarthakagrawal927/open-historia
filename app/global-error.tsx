"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0f172a", color: "#f1f5f9", fontFamily: "monospace", margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", padding: 32 }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ fontSize: 24, color: "#f59e0b", marginBottom: 16 }}>
              Critical Error
            </h2>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
              The application encountered a critical error. Your local saves are safe.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#b45309",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
