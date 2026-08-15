export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-gray-200" />
        <div className="h-4 w-full max-w-xl rounded bg-gray-100" />
      </div>
      <div className="space-y-3">
        <div className="h-28 rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />
        <div className="h-28 rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />
      </div>
    </div>
  )
}
