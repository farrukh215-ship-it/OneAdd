export type ListingMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  durationSec?: number | null;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: string | number;
  currency: string;
  status: string;
  showPhone: boolean;
  allowChat: boolean;
  allowCall: boolean;
  allowSMS: boolean;
  media: ListingMedia[];
  user?: {
    id: string;
    fullName?: string;
    phone?: string;
  };
};

export type ChatThread = {
  id: string;
  listing?: { id: string; title: string } | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};
