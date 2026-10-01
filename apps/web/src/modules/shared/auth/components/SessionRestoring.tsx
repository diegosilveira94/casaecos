export function SessionRestoring(): React.JSX.Element {
  return (
    <main className="session-restoring" aria-busy="true">
      <span className="spinner spinner--primary" aria-hidden="true" />
      <p>Carregando...</p>
    </main>
  );
}
