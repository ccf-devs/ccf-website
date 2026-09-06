import React from "react";
import { RouteTransition } from "@/components/motion/route-transition";

export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransition>{children}</RouteTransition>;
}
