import { api } from './api';

type UploadKind = 'image' | 'video' | 'document';

type UploadDescriptor = {
  uri: string;
  kind: UploadKind;
  filename: string;
  mimeType: string;
  size: number;
};

function guessMimeType(uri: string, kind: UploadKind) {
  const value = uri.toLowerCase();
  if (value.endsWith('.pdf')) return 'application/pdf';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic') || value.endsWith('.heif')) return 'image/heic';
  if (value.endsWith('.mov')) return 'video/quicktime';
  if (value.endsWith('.webm')) return 'video/webm';
  if (value.endsWith('.mp4')) return 'video/mp4';
  if (kind === 'document') return 'application/pdf';
  return kind === 'image' ? 'image/jpeg' : 'video/mp4';
}

function filenameFromUri(uri: string, kind: UploadKind) {
  const segment = uri.split('/').pop();
  if (segment && segment.includes('.')) return segment;
  return `${kind}-${Date.now()}.${kind === 'image' ? 'jpg' : kind === 'video' ? 'mp4' : 'pdf'}`;
}

async function toDescriptor(uri: string, kind: UploadKind): Promise<UploadDescriptor> {
  const filename = filenameFromUri(uri, kind);
  const mimeType = guessMimeType(filename, kind);
  const asset = await fetch(uri);
  const blob = await asset.blob();
  return {
    uri,
    kind,
    filename,
    mimeType,
    size: blob.size,
  };
}

async function uploadViaProxy(descriptor: UploadDescriptor) {
  const formData = new FormData();
  formData.append('kind', descriptor.kind);
  formData.append('file', {
    uri: descriptor.uri,
    name: descriptor.filename,
    type: descriptor.mimeType,
  } as never);

  const response = await api.post('/uploads/proxy', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data?.publicUrl as string | undefined;
}

export async function uploadPostMediaToR2(input: { images: string[]; videos: string[] }) {
  const descriptors: UploadDescriptor[] = [
    ...(await Promise.all(input.images.map((uri) => toDescriptor(uri, 'image')))),
    ...(await Promise.all(input.videos.map((uri) => toDescriptor(uri, 'video')))),
  ];

  if (!descriptors.length) {
    return { imageUrls: [] as string[], videoUrls: [] as string[] };
  }

  const imageUrls: string[] = [];
  const videoUrls: string[] = [];

  for (const descriptor of descriptors) {
    const publicUrl = await uploadViaProxy(descriptor);
    if (!publicUrl) {
      throw new Error('Upload URL nahi mili');
    }

    if (descriptor.kind === 'image') imageUrls.push(publicUrl);
    else videoUrls.push(publicUrl);
  }

  return { imageUrls, videoUrls };
}

export async function uploadDocumentToR2(uri: string) {
  const descriptor = await toDescriptor(uri, 'document');
  const publicUrl = await uploadViaProxy(descriptor);
  if (!publicUrl) {
    throw new Error('PDF upload URL nahi mili');
  }
  return publicUrl;
}
