import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetailView } from "../../../components/listing-detail-view";
import { ApiError, fetchListingById } from "../../../lib/api";
import { resolveMediaUrl } from "../../../lib/media-url";

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
      title: `${listing.title} | TGMG`,
      description: listing.description.slice(0, 150),
      alternates: {
        canonical: `/listing/${id}`
      },
      openGraph: {
        title: listing.title,
        description: listing.description.slice(0, 150),
        type: "article",
        images: firstImage ? [resolveMediaUrl(firstImage.url)] : []
      }
    };
  } catch {
    return {
      title: "Listing | TGMG"
    };
  }
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  let listing;

  try {
    listing = await fetchListingById(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const firstImage = listing.media.find((item) => item.type === "IMAGE");
  const listingStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: firstImage?.url ? [resolveMediaUrl(firstImage.url)] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: listing.currency,
      price: String(listing.price),
      availability: listing.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://www.teragharmeraghar.com/listing/${listing.id}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingStructuredData) }}
      />
      <ListingDetailView listing={listing} />
    </>
  );
}
