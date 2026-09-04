export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="skeleton h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
