import Link from 'next/link';

export function PostAdCta() {
  return (
    <section className="mx-2 my-5 rounded-card bg-red px-4 py-5 text-white shadow-card md:mx-5 md:flex md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-extrabold">Apna saman bechna hai?</h3>
        <p className="mt-1 text-sm text-white/80">Free mein ad lagao aur asli buyer tak pohancho.</p>
      </div>
      <Link href="/post" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-red md:mt-0">
        + Ad Post Karo
      </Link>
    </section>
  );
}
