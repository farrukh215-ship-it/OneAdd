'use client';

import { api } from './api';

type PresignFile = {
  filename: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'video';
};

type PresignResponse = {
  files: Array<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    kind: 'image' | 'video';
    mimeType: string;
    cacheControl: string;
  }>;
};

export type UploadItem = {
  id: string;
  kind: 'image' | 'video';
  file: File;
};

export async function uploadMediaToR2(items: UploadItem[]) {
  if (!items.length) {
    return [];
  }

  const presignPayload: PresignFile[] = items.map((item) => ({
    filename: item.file.name || `${item.kind}-${Date.now()}`,
    mimeType: item.file.type || (item.kind === 'image' ? 'image/jpeg' : 'video/mp4'),
    size: item.file.size,
    kind: item.kind,
  }));

  const presign = await api.post<PresignResponse>('/uploads/r2/presign', {
    files: presignPayload,
  });

  const targets = presign.data.files;
  if (targets.length !== items.length) {
    throw new Error('Upload target mismatch');
  }

  const uploaded = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const target = targets[i]!;
    let response: Response;
    try {
      response = await fetch(target.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': target.mimeType || item.file.type,
          'Cache-Control': target.cacheControl || 'public, max-age=86400',
        },
        body: item.file,
      });
    } catch {
      throw new Error('Media upload network/CORS failure');
    }

    if (!response.ok) {
      throw new Error(`Media upload failed (${response.status})`);
    }

    uploaded.push({
      id: item.id,
      kind: item.kind,
      url: target.publicUrl,
    });
  }

  return uploaded;
}
