import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactActions } from "../../../components/contact-actions";
import { ShareActions } from "../../../components/share-actions";
import { fetchListingById } from "../../../lib/api";

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params
}: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const listing = await fetchListingById(id);
    const firstImage = listing.media.find((item) => item.type === "IMAGE");

    return {
      title: `${listing.title} | Aikad Marketplace`,
      description: listing.description.slice(0, 150),
      openGraph: {
        title: listing.title,
        description: listing.description.slice(0, 150),
        type: "article",
        images: firstImage ? [firstImage.url] : []
      }
    };
  } catch {
    return {
      title: "Listing | Aikad Marketplace"
    };
  }
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  let listing;

  try {
    listing = await fetchListingById(id);
  } catch {
    notFound();
  }

  const phone = listing.user?.phone ?? "";

  return (
    <main className="screen">
      <section className="panel">
        <p className="kicker">Listing</p>
        <h1>{listing.title}</h1>
        <p className="priceTag">
          {listing.currency} {listing.price}
        </p>
        <p>{listing.description}</p>
        <div className="mediaStack">
          {listing.media.map((item) =>
            item.type === "IMAGE" ? (
              <img key={item.id} src={item.url} alt={listing.title} className="mediaImage" />
            ) : (
              <video
                key={item.id}
                src={item.url}
                className="mediaVideo"
                controls
                preload="metadata"
              />
            )
          )}
        </div>
        <ContactActions listing={listing} phone={phone} />
        <ShareActions listingId={listing.id} title={listing.title} />
      </section>
    </main>
  );
}
