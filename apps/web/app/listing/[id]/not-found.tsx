import Link from "next/link";

export default function ListingNotFound() {
  return (
    <main className="listingNotFoundWrap">
      <section className="listingNotFoundCard">
        <h1>Listing not found</h1>
        <p>Yeh listing remove ho chuki hai ya available nahi hai.</p>
        <Link href="/" className="retryBtn">
          Back to Home
        </Link>
      </section>
    </main>
  );
}

