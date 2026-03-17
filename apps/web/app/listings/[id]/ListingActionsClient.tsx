'use client';

type Props = {
  title: string;
  url: string;
};

export function ListingActionsClient({ title, url }: Props) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      window.alert('Link copy ho gaya');
    } catch {
      window.alert(url);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      } catch {
        // Fall through to copy.
      }
    }

    await copyLink();
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="btn-red" onClick={shareLink}>
        Share Listing
      </button>
      <button type="button" className="btn-white" onClick={copyLink}>
        Copy Link
      </button>
    </div>
  );
}
