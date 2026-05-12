export default function BibleReaderLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="text-center mb-8">
          <div className="h-12 bg-gray-200 rounded mb-4 max-w-xs mx-auto animate-pulse"></div>
          <div className="h-6 bg-gray-100 rounded max-w-sm mx-auto animate-pulse"></div>
        </div>

        {/* Search skeleton */}
        <div className="max-w-md mx-auto mb-8">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Books grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border border-gray-100">
              <div className="h-5 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
