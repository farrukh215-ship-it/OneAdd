import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetailView } from "../../../components/listing-detail-view";
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
      title: `${listing.title} | ZaroratBazar`,
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
      title: "Listing | ZaroratBazar"
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
  return <ListingDetailView listing={listing} />;
}
