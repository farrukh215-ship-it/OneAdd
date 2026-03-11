import Link from 'next/link';

export function SectionHeader({
  title,
  link,
}: {
  title: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-3 md:px-5">
      <h2 className="section-title">{title}</h2>
      {link ? (
        <Link href={link} className="text-sm font-semibold text-red">
          Sab dekho
        </Link>
      ) : null}
    </div>
  );
}
