export function LoadingSpinner({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem',
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2.5px solid var(--rule)`,
        borderTopColor: 'var(--saffron)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
