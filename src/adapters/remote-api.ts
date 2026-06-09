import type { RemoteApi } from '@instaformat/sync-core';
import { requestUrl } from 'obsidian';

export class InstaformatRemoteApi implements RemoteApi {
  constructor(
    private readonly serverUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
    const response = await requestUrl({
      url: `${this.serverUrl.replace(/\/$/, '')}${path}`,
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Instaformat request failed: ${response.status} ${response.text}`);
    }
    return response.json as T;
  }

  getChanges(input: { folderId: string; since: string | null; limit?: number }) {
    const params = new URLSearchParams({ folderId: input.folderId });
    if (input.since) params.set('since', input.since);
    if (input.limit) params.set('limit', String(input.limit));
    return this.request<ReturnType<RemoteApi['getChanges']> extends Promise<infer T> ? T : never>(
      `/api/sync/changes?${params.toString()}`,
    );
  }

  getDocument(id: string) {
    return this.request<ReturnType<RemoteApi['getDocument']> extends Promise<infer T> ? T : never>(
      `/api/documents/${id}`,
    );
  }

  patchDocument(id: string, content: string, revision: number) {
    return this.request<ReturnType<RemoteApi['patchDocument']> extends Promise<infer T> ? T : never>(
      `/api/documents/${id}`,
      {
        method: 'PATCH',
        headers: { 'If-Match': `"${revision}"` },
        body: { content },
      },
    );
  }

  applyText(id: string, content: string, baseHash: string) {
    return this.request<ReturnType<RemoteApi['applyText']> extends Promise<infer T> ? T : never>(
      `/api/documents/${id}/apply-text`,
      {
        method: 'POST',
        body: { content, baseHash },
      },
    );
  }
}
