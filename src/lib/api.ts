import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
}

export async function listDriveFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,webViewLink,modifiedTime)&pageSize=1000`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Drive files');
  }

  const data = await response.json();
  return data.files || [];
}

export async function downloadDriveFile(accessToken: string, fileId: string, mimeType: string): Promise<{ content: string, isPDF: boolean }> {
  // For Google Docs, export as plain text
  if (mimeType === 'application/vnd.google-apps.document') {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    return { content: await response.text(), isPDF: false };
  }

  // For .docx files, export as PDF which Claude can parse
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // First, get the file as a blob
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    // Convert to base64 (chunk processing for large files)
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Process in chunks to avoid call stack issues with large files
    const chunkSize = 8192;
    let base64 = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      base64 += String.fromCharCode(...chunk);
    }
    base64 = btoa(base64);

    return { content: base64, isPDF: false };
  }

  // For PDF files, download as base64
  if (mimeType === 'application/pdf') {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return { content: base64, isPDF: true };
  }

  // For other files, try to get as text
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  return { content: await response.text(), isPDF: false };
}

export async function parseJobDescription(documentText: string, fileId: string, fileName: string, isDocx: boolean = false) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-jd`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentText,
      fileId,
      fileName,
      isDocx,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse job description');
  }

  return await response.json();
}

export async function scoreFit(applicationId: string, jobDescriptionText: string, resumeText?: string) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/score-fit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      applicationId,
      jobDescriptionText,
      resumeText,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to score fit');
  }

  return await response.json();
}

export async function syncGmail() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/gmail-sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync Gmail');
  }

  return await response.json();
}

export async function generateInsights() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-insights`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate insights');
  }

  return await response.json();
}
