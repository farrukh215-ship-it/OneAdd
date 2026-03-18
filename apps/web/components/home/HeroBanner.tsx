import Link from 'next/link';

export function HeroBanner() {
  return (
    <section className="mx-2 mt-4 overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(135deg,#C62828_0%,#E53935_45%,#EF5350_100%)] px-5 py-6 text-white shadow-[0_18px_46px_rgba(198,40,40,0.35)] md:mx-5 md:px-8 md:py-8">
      <div className="relative flex items-center justify-between gap-4">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-2xl">
          <h1 className="text-[24px] font-extrabold leading-tight md:text-[32px]">
            OLX se tang? Yahan aao!
          </h1>
          <p className="mt-2 text-[13px] text-white/85 md:text-sm">
            Sirf asli malik bechte hain, koi dealer nahi.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Verified Sellers', 'No Dealers', 'Free'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {item}
              </span>
            ))}
          </div>
          <Link
            href="/listings"
            className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-red shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
          >
            Abhi Dhundein
          </Link>
        </div>
        <div className="rounded-2xl border border-white/35 bg-white/10 px-5 py-4 text-center text-[58px] font-extrabold leading-none tracking-tight sm:text-[74px]">
          24H
        </div>
      </div>
    </section>
  );
}
