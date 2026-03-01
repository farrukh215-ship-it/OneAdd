export default function ListingLoadingPage() {
  return (
    <main className="listingDetailScreen" aria-busy="true">
      <div className="listingDetailLayout">
        <section className="listingMediaColumn">
          <div className="listingMainMedia skeletonMedia shimmer" />
          <div className="listingThumbRow">
            <div className="listingThumb skeletonMedia shimmer" />
            <div className="listingThumb skeletonMedia shimmer" />
            <div className="listingThumb skeletonMedia shimmer" />
          </div>
        </section>
        <aside className="listingInfoColumn">
          <div className="skeletonLine shimmer w40" />
          <div className="skeletonLine shimmer w90" />
          <div className="skeletonLine shimmer w60" />
          <div className="skeletonLine shimmer w90" />
          <div className="skeletonLine shimmer w90" />
        </aside>
      </div>
    </main>
  );
}

