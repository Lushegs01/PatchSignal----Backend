export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
