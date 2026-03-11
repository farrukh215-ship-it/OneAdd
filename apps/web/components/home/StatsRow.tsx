const stats = [
  { value: '12K+', label: 'Active Listings' },
  { value: '0', label: 'Dealers Allowed' },
  { value: 'Free', label: 'Ad Lagao' },
];

export function StatsRow() {
  return (
    <section className="grid grid-cols-3 gap-2 px-2 py-1 md:px-5">
      {stats.map((stat) => (
        <div key={stat.label} className="surface py-3 text-center">
          <div className="text-[20px] font-extrabold text-red">{stat.value}</div>
          <div className="text-[11px] text-ink2">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}
