"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePolicyAgreement } from "@/hooks/use-policy-agreement";

// ---------------------------------------------------------------------------
// Policy terms content
// ---------------------------------------------------------------------------

const POLICY_TERMS = [
  "Not download, record, or capture any video content",
  "Not use screen recording software while viewing",
  "Not share your account or access credentials",
  "Not attempt to circumvent any security measures",
  "Report any security concerns to administrators",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PolicyAgreementModalProps {
  /** Called after the user successfully accepts the policy. */
  onAccepted?: () => void;
}

/**
 * A non-dismissable modal that gates video playback behind a policy agreement.
 *
 * The user must check the agreement checkbox and click "Accept" to proceed.
 * They can decline, which redirects them back to the dashboard. There is no
 * way to close the modal without choosing one of these two actions.
 */
export function PolicyAgreementModal({ onAccepted }: PolicyAgreementModalProps) {
  const router = useRouter();
  const { isSubmitting, error, agree } = usePolicyAgreement();
  const [checked, setChecked] = useState(false);

  async function handleAccept() {
    await agree();
    onAccepted?.();
  }

  function handleDecline() {
    router.push("/dashboard");
  }

  return (
    <Dialog open modal>
      {/*
        We render DialogContent directly (without a trigger) because the modal
        is always open. The three event handlers below make it non-dismissable:
        - onPointerDownOutside: prevents closing on backdrop click
        - onEscapeKeyDown: prevents closing on Escape
        - onInteractOutside: prevents any outside interaction from closing
        The close button is hidden via the [&>button:last-child] selector that
        targets the default X button rendered by DialogContent.
      */}
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md [&>button:last-child]:hidden"
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Terms of Use Agreement</DialogTitle>
          <DialogDescription>
            Please review and accept the terms before watching video content.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable terms area */}
        <div
          className="max-h-56 overflow-y-auto rounded-md border bg-muted/50 p-4"
          role="region"
          aria-label="Terms of use"
          tabIndex={0}
        >
          <p className="mb-3 text-sm font-medium text-foreground">
            By accessing video content on this platform, you agree to:
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {POLICY_TERMS.map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm font-medium text-destructive">
            Violation of these terms may result in immediate account suspension.
          </p>
        </div>

        {/* Agreement checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="policy-agreement"
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
            aria-describedby="policy-agreement-label"
          />
          <label
            id="policy-agreement-label"
            htmlFor="policy-agreement"
            className="cursor-pointer text-sm leading-snug text-foreground"
          >
            I have read and agree to the Terms of Use
          </label>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Action buttons */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleDecline}
            disabled={isSubmitting}
          >
            Decline
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={!checked || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Accepting..." : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
