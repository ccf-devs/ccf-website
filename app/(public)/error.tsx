"use client";

import React, { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PublicError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4 text-center">
      <AlertCircle className="h-12 w-12 text-ccf-gold opacity-80" />
      <div className="space-y-2">
        <h2 className="text-xl font-display font-semibold tracking-wide text-ccf-offwhite">
          Temporarily Unavailable
        </h2>
        <p className="text-sm text-ccf-muted max-w-md mx-auto">
          We encountered a network or server issue while loading this page. 
          Please try again in a moment.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => reset()}
        className="border-ccf-gold/50 text-ccf-gold hover:bg-ccf-gold/10"
      >
        Retry
      </Button>
    </div>
  );
}
