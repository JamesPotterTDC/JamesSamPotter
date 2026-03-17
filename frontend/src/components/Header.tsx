import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition">
              Peaklog
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium transition">
                Dashboard
              </Link>
              <Link href="/activities" className="text-gray-600 hover:text-gray-900 font-medium transition">
                Activities
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Powered by Strava</span>
          </div>
        </div>
      </div>
    </header>
  );
}
