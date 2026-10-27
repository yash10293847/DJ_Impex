const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-typescript.cjs");

function reviewsFixture(fetch) {
  const events = [];
  const loader = createLoader({
    env: { GOOGLE_MAPS_API_KEY: "test-only-key", GOOGLE_PLACE_ID: "test-place" },
    globals: { fetch, AbortSignal },
    mocks: { "@/lib/security/errors": { securityEvent: (event) => events.push(event) } },
  });
  return { api: loader.load("src/lib/google-reviews.ts"), events };
}

test("reviews and rating share one pending request and reuse the completed cache", async () => {
  let requests = 0;
  let finish;
  const response = new Promise((resolve) => {
    finish = resolve;
  });
  const { api } = reviewsFixture(() => {
    requests++;
    return response;
  });
  const reviews = api.getPositiveGoogleReviews();
  const rating = api.getGoogleRating();
  assert.equal(requests, 1);
  finish(
    Response.json({
      rating: 4.8,
      userRatingCount: 12,
      reviews: [{ rating: 5, text: { text: "Good fabric" } }],
    }),
  );
  assert.equal((await reviews)[0].quote, "Good fabric");
  assert.equal((await rating).rating, 4.8);
  await api.getPositiveGoogleReviews();
  assert.equal(requests, 1);
});

test("malformed successful reviews responses use the fallback and log a safe event", async () => {
  const { api, events } = reviewsFixture(async () => Response.json({ reviews: "invalid", rating: 99 }));
  const reviews = await api.getPositiveGoogleReviews();
  assert.ok(reviews.length > 0);
  assert.ok(reviews.every((review) => review.source === "trade-partner"));
  assert.ok(events.includes("reviews_response_invalid"));
});

test("review timeouts do not escape to the page", async () => {
  const { api, events } = reviewsFixture(async () => {
    throw new Error("provider unavailable");
  });
  assert.ok((await api.getPositiveGoogleReviews()).length > 0);
  assert.ok(events.includes("reviews_unavailable"));
});

function playbackFixture(storage = new Map()) {
  const window = new EventTarget();
  const globals = {
    window,
    Event,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  const api = createLoader({ globals }).load("src/lib/playback-preference.ts");
  return { api, storage };
}

test("playback choices survive a fresh page session, and subscribers clean up", () => {
  const { api, storage } = playbackFixture();
  assert.equal(api.serverPlaybackPreference(), "pending");
  assert.equal(api.readPlaybackPreference(), "auto");
  let changes = 0;
  const unsubscribe = api.subscribePlaybackPreference(() => {
    changes++;
  });
  api.savePlaybackPreference(false);
  assert.equal(changes, 1);
  assert.equal(playbackFixture(storage).api.readPlaybackPreference(), "paused");
  api.savePlaybackPreference(true);
  assert.equal(playbackFixture(storage).api.readPlaybackPreference(), "playing");
  unsubscribe();
  api.savePlaybackPreference(false);
  assert.equal(changes, 2);
});

test("blocked browser storage does not break playback controls", () => {
  const api = createLoader({
    globals: {
      window: new EventTarget(),
      Event,
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    },
  }).load("src/lib/playback-preference.ts");
  assert.equal(api.readPlaybackPreference(), "auto");
  assert.doesNotThrow(() => api.savePlaybackPreference(false));
});

test("public diagnostics log only approved codes and never provider messages", () => {
  const logs = [];
  const api = createLoader({ globals: { console: { error: (value) => logs.push(value) } } }).load(
    "src/lib/security/errors.ts",
  );
  const id = api.securityEvent(
    "public_read_failed",
    Object.assign(new Error("private provider details"), { code: "EPERM" }),
  );
  const record = JSON.parse(logs[0]);
  assert.equal(record.code, "EPERM");
  assert.equal(record.id, id);
  assert.equal(logs[0].includes("private provider details"), false);
  api.securityEvent("public_read_failed", { code: "private value" });
  assert.equal(JSON.parse(logs[1]).code, undefined);
});
