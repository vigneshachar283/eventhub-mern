export default function Loader({ fullPage = false }) {
  if (fullPage) {
    return (
      <div className="loader-overlay" role="status" aria-label="Loading">
        <span className="spinner" />
      </div>
    );
  }
  return <span className="spinner" role="status" aria-label="Loading" />;
}
