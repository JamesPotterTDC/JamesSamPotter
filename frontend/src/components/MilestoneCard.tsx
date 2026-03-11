interface MilestoneCardProps {
  title: string;
  description: string;
  progress?: number;
  achieved?: boolean;
}

export default function MilestoneCard({ title, description, progress, achieved }: MilestoneCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {achieved && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Achieved
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {progress !== undefined && !achieved && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
