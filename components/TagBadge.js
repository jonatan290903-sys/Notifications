export default function TagBadge({ tag, small = false }) {
  if (!tag) return null;
  const size = small ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${size}`}
      style={{
        backgroundColor: tag.color + '18',
        borderColor:     tag.color + '55',
        color:           tag.color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.nombre}
    </span>
  );
}
