import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging Tailwind CSS class names.
 * Standard shadcn/ui helper — combines clsx (conditional classes)
 * with tailwind-merge (deduplication of conflicting Tailwind classes).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
