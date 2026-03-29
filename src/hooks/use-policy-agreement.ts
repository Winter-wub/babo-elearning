"use client";

import { useState, useCallback } from "react";
import { acceptPolicy } from "@/actions/auth.actions";

interface UsePolicyAgreementResult {
  hasAgreed: boolean;
  isSubmitting: boolean;
  error: string | null;
  agree: () => Promise<void>;
}

/**
 * Manages the policy agreement flow for the video player gate.
 * Calls the `acceptPolicy` server action and records the user's agreement.
 */
export function usePolicyAgreement(initialAgreed = false): UsePolicyAgreementResult {
  const [hasAgreed, setHasAgreed] = useState(initialAgreed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agree = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    // IP address is now determined server-side in the acceptPolicy action
    const result = await acceptPolicy();
    if (result.success) {
      setHasAgreed(true);
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  }, []);

  return { hasAgreed, isSubmitting, error, agree };
}
