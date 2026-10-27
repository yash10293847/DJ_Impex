"use client";

/** Self-contained so it also works when the root layout cannot render. */
export function ErrorScreen({ retry, reference }: { retry: () => void; reference?: string }) {
  return (
    <section
      aria-labelledby="page-error-heading"
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        background: "#f7f7f2",
        color: "#1e232e",
        padding: "2rem",
        fontFamily: '"Open Sans", Arial, sans-serif',
      }}
    >
      <div style={{ width: "100%", maxWidth: "38rem" }}>
        <p style={{ fontSize: "0.875rem", letterSpacing: "0.1em" }}>SOMETHING WENT WRONG</p>
        <h1
          id="page-error-heading"
          style={{
            fontSize: "clamp(2.125rem, 5vw, 3.625rem)",
            lineHeight: 1.15,
            fontWeight: 400,
            margin: "1rem 0",
          }}
        >
          Let’s pick up the thread.
        </h1>
        <p style={{ lineHeight: 1.65 }}>
          We couldn’t load this page. Please try again or return to the homepage.
        </p>
        {reference && <p style={{ fontSize: "0.875rem" }}>Reference: {reference}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2rem" }}>
          <button
            type="button"
            onClick={retry}
            style={{
              minHeight: "48px",
              padding: "0.75rem 1.5rem",
              background: "#252d3b",
              color: "white",
              border: "1px solid #151c28",
              borderRadius: "3px",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              // Root-layout failures need a full document load to recover.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/");
            }}
            style={{
              minHeight: "48px",
              padding: "0.75rem 1.5rem",
              border: "1px solid #a8a9a3",
              borderRadius: "3px",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Go home →
          </button>
        </div>
      </div>
    </section>
  );
}
