export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Privacy:</span> All routes are automatically redacted to protect start/end locations.
          </p>
          <p className="text-sm text-gray-500">
            Powered by Strava • Built with Django + Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
