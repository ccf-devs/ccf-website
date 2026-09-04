import { Container } from "@/components/site/container";

/**
 * Placeholder home page.
 * Real public website content will be implemented in the Public Website phase (Phase 5).
 */
export default function HomePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <Container className="space-y-4">
        <h1 className="type-display text-gradient-gold">
          Crescent Club of Finance
        </h1>
        <p className="type-body max-w-xl mx-auto text-ccf-muted">
          Platform under construction. Public website sections will be implemented in the upcoming phase.
        </p>
      </Container>
    </div>
  );
}
