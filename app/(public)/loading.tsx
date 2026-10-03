import React from "react";
import { Loader2 } from "lucide-react";

export default function PublicLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-ccf-gold" />
      <p className="text-ccf-muted text-sm font-sans tracking-widest uppercase">
        Loading...
      </p>
    </div>
  );
}
