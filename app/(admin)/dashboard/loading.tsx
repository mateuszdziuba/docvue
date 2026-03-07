export default function DashboardLoading() {
  return (
    <div className="space-y-5 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-5 w-48 bg-secondary rounded-md" />
        <div className="h-3.5 w-56 bg-secondary rounded-md" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border/60 border-l-4 border-l-border h-[88px]" />
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card rounded-xl p-5 border border-border/60 h-52" />
        <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border/60 h-52" />
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="h-3.5 w-36 bg-secondary rounded-md mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary/40 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="h-3.5 w-36 bg-secondary rounded-md mb-4" />
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-secondary/30 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
