interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-primary-500 opacity-80">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className={`text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-sm text-gray-500 ml-2">vs last period</span>
        </div>
      )}
    </div>
  );
}
