import { api } from './api';

type UploadKind = 'image' | 'video' | 'document';

type UploadDescriptor = {
  uri: string;
  kind: UploadKind;
  filename: string;
  mimeType: string;
  size: number;
};

const MAX_UPLOAD_ATTEMPTS = 3;

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function putWithRetry(url: string, mimeType: string, blob: Blob) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: blob,
      });

      if (response.ok) return;

      lastError = new Error(`Upload HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_UPLOAD_ATTEMPTS) {
      await wait(attempt * 600);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Media upload fail hui');
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
    await putWithRetry(presigned.uploadUrl, descriptor.mimeType, blob);

    if (descriptor.kind === 'image') imageUrls.push(presigned.publicUrl);
    else videoUrls.push(presigned.publicUrl);
  }

  return { imageUrls, videoUrls };
}

export async function uploadDocumentToR2(uri: string) {
  const descriptor = await toDescriptor(uri, 'document');
  const presignResponse = await api.post('/uploads/r2/presign', {
    files: [
      {
        filename: descriptor.filename,
        mimeType: descriptor.mimeType,
        size: descriptor.size,
        kind: descriptor.kind,
      },
    ],
  });

  const presigned = presignResponse.data?.files?.[0];
  if (!presigned?.uploadUrl || !presigned?.publicUrl) {
    throw new Error('PDF upload URL nahi mili');
  }

  const asset = await fetch(descriptor.uri);
  const blob = await asset.blob();
  await putWithRetry(presigned.uploadUrl, descriptor.mimeType, blob);
  return presigned.publicUrl as string;
}
