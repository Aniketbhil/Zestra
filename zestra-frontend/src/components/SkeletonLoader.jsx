const SkeletonLoader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background) p-4">
      <div className="w-full max-w-md bg-(--surface) p-8 rounded-[20px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] border border-(--border) animate-pulse">
        
        {/* Header Skeleton */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-8 bg-(--surface-secondary) rounded-md w-48 mb-3"></div>
          <div className="h-4 bg-(--surface-secondary) rounded-md w-64"></div>
        </div>

        {/* Form Fields Skeleton */}
        <div className="space-y-5">
          <div>
            <div className="h-4 bg-(--surface-secondary) rounded-md w-16 mb-2"></div>
            <div className="h-12 bg-(--surface-secondary) rounded-[14px] w-full"></div>
          </div>

          <div>
            <div className="h-4 bg-(--surface-secondary) rounded-md w-20 mb-2"></div>
            <div className="h-12 bg-(--surface-secondary) rounded-[14px] w-full"></div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="h-4 bg-(--surface-secondary) rounded-md w-24"></div>
            <div className="h-4 bg-(--surface-secondary) rounded-md w-28"></div>
          </div>

          {/* Button Skeleton */}
          <div className="h-12 bg-(--primary) opacity-20 rounded-[14px] w-full mt-4"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;