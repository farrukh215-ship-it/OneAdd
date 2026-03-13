'use client';

import { api } from './api';

export type UploadItem = {
  id: string;
  kind: 'image' | 'video';
  file: File;
};

export async function uploadMediaToR2(items: UploadItem[]) {
  if (!items.length) {
    return [];
  }

  const uploaded = [];
  for (const item of items) {
    const formData = new FormData();
    formData.append('kind', item.kind);
    formData.append('file', item.file, item.file.name || `${item.kind}-${Date.now()}`);

    const response = await api.post('/uploads/proxy', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    uploaded.push({
      id: item.id,
      kind: item.kind,
      url: response.data.publicUrl,
    });
  }

  return uploaded;
}
