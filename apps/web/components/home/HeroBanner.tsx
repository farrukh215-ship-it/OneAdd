import Link from 'next/link';

export function HeroBanner() {
  return (
    <section className="mx-2 mt-3 rounded-card bg-red px-4 py-5 text-white shadow-card md:mx-5 md:px-6 md:py-7">
      <div className="flex items-center justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-[20px] font-extrabold leading-tight md:text-[28px]">
            OLX se tang? Yahan aao!
          </h1>
          <p className="mt-2 text-[12px] text-white/80">
            Sirf asli malik bechte hain, koi dealer nahi.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Verified Sellers', 'No Dealers', 'Free'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-medium text-white"
              >
                {item}
              </span>
            ))}
          </div>
          <Link
            href="/listings"
            className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-red"
          >
            Abhi Dhundein
          </Link>
        </div>
        <div className="text-center text-[52px] leading-none sm:text-[72px]">24H</div>
      </div>
    </section>
  );
}

