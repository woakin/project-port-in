import { Card } from "@/components/shared/Card";
import { Skeleton } from "@/components/ui/skeleton";

export function KPICardSkeleton() {
  return (
    <Card variant="content" className="p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </Card>
  );
}

export function KPISparklineCardSkeleton() {
  return (
    <Card variant="content" className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </Card>
  );
}