import { tgmgContact } from '../../lib/contact';

const actions = [
  { label: 'Website', value: 'www.teragharmeraghar.com', url: tgmgContact.website, accent: '#E53935' },
  { label: 'Facebook', value: 'teragharmeraghar', url: tgmgContact.facebook, accent: '#1877F2' },
  { label: 'Instagram', value: '@teragharmeraghar', url: tgmgContact.instagram, accent: '#C13584' },
  { label: 'WhatsApp', value: tgmgContact.phone, url: tgmgContact.whatsapp, accent: '#25D366' },
];

export default function ContactPage() {
  return (
    <div className="page-wrap px-4 py-6 md:px-5">
      <div className="surface p-6">
        <div className="text-3xl font-extrabold text-red">TGMG.</div>
        <h1 className="mt-3 text-3xl font-extrabold text-ink">Contact</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink2">
          Website ke tamam official contact links ek jagah. Facebook, Instagram, WhatsApp aur direct website access yahan se open karein.
        </p>

        <div className="mt-6 rounded-3xl bg-[#FFF5F3] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-ink2">Office</div>
          <div className="mt-2 text-lg font-bold text-ink">{tgmgContact.office}</div>
          <div className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-ink2">Email</div>
          <a className="mt-2 inline-block text-lg font-bold text-red" href={`mailto:${tgmgContact.email}`}>
            {tgmgContact.email}
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {actions.map((item) => (
            <a
              key={item.label}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5"
              style={{ borderColor: item.accent }}
            >
              <div className="text-lg font-extrabold text-ink">{item.label}</div>
              <div className="mt-2 text-sm text-ink2">{item.value}</div>
              <div className="mt-4 text-sm font-bold" style={{ color: item.accent }}>
                Open
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
