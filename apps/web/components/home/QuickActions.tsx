const items = ['+ Ad Post Karo', '🔥 Taaza Listings', '📍 Mere Paas', '⭐ Top Deals', '🆕 Naye Items'];

export function QuickActions() {
  return (
    <section className="hide-scrollbar flex gap-2 overflow-x-auto px-2 py-3 md:px-5">
      {items.map((item, index) => (
        <button
          key={item}
          className={`chip shrink-0 ${index === 0 ? '!border-red !bg-red !text-white' : ''}`}
          type="button"
        >
          {item}
        </button>
      ))}
    </section>
  );
}
