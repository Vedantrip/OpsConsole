export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-line rounded"></div>
          <div className="h-8 w-48 bg-line rounded"></div>
          <div className="h-3 w-64 bg-line/50 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-line rounded"></div>
          <div className="h-8 w-24 bg-line rounded"></div>
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 h-32 bg-panel border border-line rounded-xl"></div>
        <div className="lg:col-span-3 h-32 bg-panel border border-line rounded-xl"></div>
        <div className="lg:col-span-2 h-32 bg-panel border border-line rounded-xl"></div>
        <div className="lg:col-span-3 h-32 bg-panel border border-line rounded-xl"></div>
      </div>

      {/* Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 bg-panel border border-line rounded-xl"></div>
        <div className="h-64 bg-panel border border-line rounded-xl"></div>
      </div>
    </div>
  );
}
