export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        &laquo; Prev
      </button>

      <span className="pagination-info">
        Page {page} of {pages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
      >
        Next &raquo;
      </button>
    </nav>
  );
}
