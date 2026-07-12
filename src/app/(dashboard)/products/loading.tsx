export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-24 bg-gray-200 rounded" />
      </div>
      <div className="grid gap-4">
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
