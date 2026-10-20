import '../../styles/components/spinner.css';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
