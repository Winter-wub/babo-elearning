"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SignedUrlResponse {
  url: string;
  /** Unix timestamp in milliseconds when the signed URL expires. */
  expiresAt: number;
}

interface UseSignedUrlResult {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  /** Manually trigger a URL refresh (e.g. after a transient error). */
  refresh: () => void;
}

/**
 * Fetches a signed playback URL for the given videoId from the API route
 * `/api/videos/[videoId]/signed-url`.
 *
 * The hook automatically schedules a background refresh 60 seconds before the
 * URL expires so the video player never stalls mid-playback.  All timers are
 * cleaned up on unmount, preventing state updates on unmounted components.
 */
export function useSignedUrl(videoId: string): UseSignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable reference to the refresh timer so we can cancel it even
  // if fetchUrl is called multiple times before a timer fires.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether the component is still mounted to avoid setting state after
  // unmount (e.g. if the user navigates away while a fetch is in flight).
  const mountedRef = useRef(true);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchUrl = useCallback(async () => {
    // Cancel any previously scheduled refresh before starting a new fetch.
    cancelTimer();

    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${videoId}/signed-url`, {
        // Include credentials so the session cookie is sent.
        credentials: "same-origin",
        // Disable browser cache — the server already sends Cache-Control: no-store
        // but being explicit here avoids stale responses from aggressive caches.
        cache: "no-store",
      });

      if (!mountedRef.current) return;

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as SignedUrlResponse;

      if (!mountedRef.current) return;

      setUrl(data.url);

      // Schedule the next refresh 60 seconds before the URL expires.
      // Guard against negative/zero delays in case the clock is skewed.
      const msUntilExpiry = data.expiresAt - Date.now();
      const refreshDelay = Math.max(msUntilExpiry - 60_000, 0);

      timerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          void fetchUrl();
        }
      }, refreshDelay);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, cancelTimer]);

  useEffect(() => {
    mountedRef.current = true;

    void fetchUrl();

    return () => {
      // Mark unmounted first so in-flight fetches do not update state.
      mountedRef.current = false;
      cancelTimer();
    };
  }, [fetchUrl, cancelTimer]);

  return { url, isLoading, error, refresh: fetchUrl };
}
