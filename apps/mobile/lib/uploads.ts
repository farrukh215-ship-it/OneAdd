import { api } from './api';

type UploadKind = 'image' | 'video';

type UploadDescriptor = {
  uri: string;
  kind: UploadKind;
  filename: string;
  mimeType: string;
  size: number;
};

function guessMimeType(uri: string, kind: UploadKind) {
  const value = uri.toLowerCase();
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic') || value.endsWith('.heif')) return 'image/heic';
  if (value.endsWith('.mov')) return 'video/quicktime';
  if (value.endsWith('.webm')) return 'video/webm';
  if (value.endsWith('.mp4')) return 'video/mp4';
  return kind === 'image' ? 'image/jpeg' : 'video/mp4';
}

function filenameFromUri(uri: string, kind: UploadKind) {
  const segment = uri.split('/').pop();
  if (segment && segment.includes('.')) return segment;
  return `${kind}-${Date.now()}.${kind === 'image' ? 'jpg' : 'mp4'}`;
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

  const presignResponse = await api.post('/uploads/r2/presign', {
    files: descriptors.map((descriptor) => ({
      filename: descriptor.filename,
      mimeType: descriptor.mimeType,
      size: descriptor.size,
      kind: descriptor.kind,
    })),
  });

  const presignedFiles = presignResponse.data?.files ?? [];

  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    const presigned = presignedFiles[index];
    if (!presigned?.uploadUrl || !presigned?.publicUrl) {
      throw new Error('Upload URL nahi mili');
    }

    const asset = await fetch(descriptor.uri);
    const blob = await asset.blob();
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': descriptor.mimeType,
      },
      body: blob,
    });
    if (!uploadResponse.ok) {
      throw new Error('Media upload fail hui');
    }

    if (descriptor.kind === 'image') imageUrls.push(presigned.publicUrl);
    else videoUrls.push(presigned.publicUrl);
  }

  return { imageUrls, videoUrls };
}
