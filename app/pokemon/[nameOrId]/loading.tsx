export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-full" />
      <div className="skeleton h-64 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-72 w-full" />
        <div className="skeleton h-72 w-full" />
      </div>
      <div className="skeleton h-40 w-full" />
      <p className="animate-blink text-center font-pixel text-[10px] text-dex-yellow">
        Cargando ficha...
      </p>
    </div>
  );
}
