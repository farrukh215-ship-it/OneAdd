import { api } from './api';

type UploadKind = 'image' | 'video';

type PresignPayloadFile = {
  filename: string;
  mimeType: string;
  size: number;
  kind: UploadKind;
};

type PresignResponse = {
  files: Array<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    kind: UploadKind;
    mimeType: string;
  }>;
};

type UploadDescriptor = {
  uri: string;
  kind: UploadKind;
  filename: string;
  mimeType: string;
  size: number;
  blob: Blob;
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
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = filenameFromUri(uri, kind);
  const mimeType = blob.type || guessMimeType(filename, kind);
  return {
    uri,
    kind,
    filename,
    mimeType,
    size: blob.size,
    blob,
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

  const payloadFiles: PresignPayloadFile[] = descriptors.map((file) => ({
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    kind: file.kind,
  }));

  const presign = await api.post<PresignResponse>('/uploads/r2/presign', {
    files: payloadFiles,
  });

  if (presign.data.files.length !== descriptors.length) {
    throw new Error('Upload target mismatch');
  }

  const imageUrls: string[] = [];
  const videoUrls: string[] = [];

  for (let i = 0; i < descriptors.length; i += 1) {
    const descriptor = descriptors[i]!;
    const target = presign.data.files[i]!;
    const uploadResponse = await fetch(target.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': target.mimeType || descriptor.mimeType,
      },
      body: descriptor.blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    if (descriptor.kind === 'image') imageUrls.push(target.publicUrl);
    else videoUrls.push(target.publicUrl);
  }

  return { imageUrls, videoUrls };
}

