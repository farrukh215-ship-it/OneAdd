import { ListingsFeed } from "../components/listings-feed";

export default function HomePage() {
  return (
    <main className="screen">
      <section className="hero">
        <p className="kicker">Marketplace</p>
        <h1>Find trusted deals around you.</h1>
        <p>
          Browse active listings ranked by quality and seller trust signals.
        </p>
      </section>
      <ListingsFeed title="Latest Listings" />
    </main>
  );
}
