export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-28 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero skeleton */}
        <div className="mb-16">
          <div className="skeleton h-4 w-32 mb-10 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-12">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="skeleton h-20 sm:h-24 lg:h-28 w-full rounded mb-3" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
        {/* Card skeletons */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
