import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const colorMap = {
  green: "from-green-500 to-green-600",
  amber: "from-amber-500 to-amber-600",
  blue: "from-blue-500 to-blue-600",
  red: "from-red-500 to-red-600",
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-none">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} bg-opacity-20`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}