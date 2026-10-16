// Demo workspace content for the hackathon presentation. Every record lives in
// a fictional patchsignal/demo-* repository. Evidence text is hand-written in
// the shape /analyze produces; run output comes from captured.json (real
// Vitest runs of each test), and verdicts are computed by classify() at seed time.

export type DemoEvidence = {
  text: string;
  provenance: "observed" | "reported" | "hypothesis" | "unknown";
  source: string;
};

export type DemoScenario = {
  id: string;
  repo: string;
  /** createdAt = seed time minus this many minutes, so the workspace always looks recent. */
  ageMinutes: number;
  description: string;
  expected?: string;
  actual?: string;
  steps?: string;
  environment?: string;
  errorText?: string;
  /** File in lib/demo/screenshots, attached as screenshot 1 (image:1). */
  screenshot?: string;
  evidence?: DemoEvidence[];
  questions?: { text: string; blocking?: boolean }[];
  /** Stage 3: pin the target commit, plus a control (fixed) commit when true. */
  pinned?: { control: boolean };
  hypothesis?: {
    statement: string;
    triggerConditions: string;
    expectedFailure: string;
    evidenceNeeded: string;
    /** Inline test when no captured run exists; otherwise captured.json supplies it. */
    test?: { path: string; content: string };
  };
  /** Captured runs to persist; target is required for a verdict. */
  runs?: ("target" | "control")[];
};

export const DEMO_OWNER = "patchsignal";

export const demoScenarios: DemoScenario[] = [
  {
    id: "inv_demo0001",
    repo: "demo-signup",
    ageMinutes: 25,
    description:
      "Sign-up form rejects my email address because it contains a plus sign.\n\nI use plus-addressing to sort my mail (ade+test@gmail.com). Every time I submit the sign-up form it shows \"Invalid email address\" under the email field and no account is created. The same form works with ade@gmail.com. Screenshot attached.",
    expected: "The account is created and I land on the onboarding page.",
    actual: "The email field turns red with \"Invalid email address\" and the form is not submitted.",
    steps: "1. Open /signup\n2. Enter a name, ade+test@gmail.com and a valid password\n3. Click Create account",
    environment: "Chrome 129 on Windows 11",
    screenshot: "signup-plus-sign.png",
    evidence: [
      { text: "Email field contains ade+test@gmail.com and is outlined in red", provenance: "observed", source: "image:1" },
      { text: "Inline error under the email field reads \"Invalid email address\"", provenance: "observed", source: "image:1" },
      { text: "Fails on every attempt; the same form accepts ade@gmail.com", provenance: "reported", source: "description" },
      { text: "Account should be created and the user taken to onboarding", provenance: "reported", source: "field:expected" },
      { text: "Chrome 129 on Windows 11", provenance: "reported", source: "field:environment" },
      { text: "The client-side email pattern leaves \"+\" out of the allowed local-part characters", provenance: "hypothesis", source: "model" },
    ],
    questions: [
      { text: "Does the API accept ade+test@gmail.com when the form is bypassed (POST /api/signup)?" },
      { text: "Are other valid symbols, such as an apostrophe (o'neil@example.com), rejected too?" },
    ],
    pinned: { control: true },
    hypothesis: {
      statement: "The sign-up email validator excludes \"+\" from the local part, so plus-addressed emails fail validation",
      triggerConditions: "Validate ade+test@gmail.com with isValidEmail() from src/validation/email.ts",
      expectedFailure: "isValidEmail(\"ade+test@gmail.com\") returns false where true is expected",
      evidenceNeeded: "Target run fails on that assertion; control run on the fixed validator passes",
    },
    runs: ["target", "control"],
  },
  {
    id: "inv_demo0005",
    repo: "demo-search",
    ageMinutes: 2 * 60 + 10,
    description:
      "Search results come back after I clear the search box.\n\nIf I type \"react\" and then clear the box straight away, the old results reappear about a second later instead of the list staying empty. It happens mostly on a slow connection.",
    expected: "Clearing the search box leaves the results list empty.",
    actual: "Results for the previous query reappear about a second after the box is cleared.",
    steps: "1. Type react in the search box\n2. Clear it immediately (select all, Backspace)\n3. Wait for the pending request to finish",
    environment: "Chrome 129 on Android 14, network throttled to Slow 3G",
    evidence: [
      { text: "Results for the previous query reappear after the box is cleared", provenance: "reported", source: "description" },
      { text: "Happens mostly on a slow connection", provenance: "reported", source: "description" },
      { text: "Chrome 129 on Android 14 with Slow 3G throttling", provenance: "reported", source: "field:environment" },
      { text: "A late response for the earlier query overwrites the cleared result list (no cancellation or stale-response guard)", provenance: "hypothesis", source: "model" },
    ],
    questions: [{ text: "Does it also happen on a fast connection if the box is cleared quickly enough?" }],
    pinned: { control: false },
    hypothesis: {
      statement: "A response for the previous query resolves after the box is cleared and overwrites the empty result list",
      triggerConditions: "Render SearchBox, resolve a pending request after the query is cleared",
      expectedFailure: "Result list contains 3 items where 0 are expected",
      evidenceNeeded: "Target run fails on the list-length assertion",
    },
    runs: ["target"],
  },
  {
    id: "inv_demo0004",
    repo: "demo-bookings",
    ageMinutes: 4 * 60 + 5,
    description:
      "Bookings on the last day of the date filter are missing.\n\nWhen I filter the bookings list from 10 Oct to 15 Oct, the bookings on 15 Oct don't show up. I have to extend the range to 16 Oct to see them.",
    expected: "Bookings on 15 Oct appear when the range ends on 15 Oct.",
    actual: "Bookings on 15 Oct are hidden until the range is extended to 16 Oct.",
    steps: "1. Open Bookings\n2. Set the date filter to 10 Oct – 15 Oct\n3. Look for the bookings on 15 Oct",
    evidence: [
      { text: "Bookings on the end date (15 Oct) are not listed", provenance: "reported", source: "description" },
      { text: "Extending the end date to 16 Oct makes them appear", provenance: "reported", source: "description" },
      { text: "The end date is treated as exclusive by the range filter", provenance: "hypothesis", source: "model" },
      { text: "Day boundaries are computed in UTC, so a non-UTC browser timezone could move evening bookings across the end date", provenance: "hypothesis", source: "model" },
    ],
    questions: [
      { text: "Which timezone is your browser (or account) set to?", blocking: true },
      { text: "At what time of day are the missing bookings on 15 Oct?" },
    ],
    pinned: { control: false },
    hypothesis: {
      statement: "filterByDateRange treats the end date as exclusive and drops bookings on the last selected day",
      triggerConditions: "Filter bookings from 2026-10-10 to 2026-10-15 with a booking at 2026-10-15T14:30:00Z",
      expectedFailure: "bk_102 (15 Oct) is missing from the filtered ids",
      evidenceNeeded: "Target run fails on the toContain(\"bk_102\") assertion",
    },
    runs: ["target"],
  },
  {
    id: "inv_demo0009",
    repo: "demo-profile",
    ageMinutes: 6 * 60 + 20,
    description:
      "Uploading a profile photo from my iPhone does nothing.\n\nI pick a photo from my iPhone library, the upload spinner shows for a second and then disappears. My old avatar stays and there is no error message. Photos from my laptop upload fine.",
    expected: "The new photo becomes my avatar.",
    actual: "The spinner appears briefly, the avatar does not change and no error is shown.",
    steps: "1. Profile → Change photo\n2. Choose a photo taken with the iPhone camera\n3. Click Save",
    environment: "Safari on iOS 18, iPhone 15",
  },
  {
    id: "inv_demo0002",
    repo: "demo-checkout",
    ageMinutes: 26 * 60,
    description:
      "Cart total is one cent short when I buy two of the same T-shirt.\n\nTwo Classic Tees at $19.99 each show a line total of $39.97, and with a pack of socks the order total is $44.97. My card was charged $44.97. It should be $44.98.",
    expected: "2 × $19.99 = $39.98, and the order total is $44.98.",
    actual: "The line total is $39.97 and the order total is $44.97.",
    steps: "1. Add Classic Tee (Black / M) and set the quantity to 2\n2. Add Ankle Socks (3 pack)\n3. Open the cart",
    environment: "Safari 18 on macOS 15",
    screenshot: "cart-subtotal.png",
    evidence: [
      { text: "Classic Tee — Black / M is listed at $19.99 × 2 with a line total of $39.97", provenance: "observed", source: "image:1" },
      { text: "Order summary shows a subtotal and total of $44.97", provenance: "observed", source: "image:1" },
      { text: "The reporter's card was charged $44.97", provenance: "reported", source: "description" },
      { text: "Expected a line total of $39.98 and an order total of $44.98", provenance: "reported", source: "field:expected" },
      { text: "Line totals are truncated with Math.floor after a floating-point multiply (19.99 × 2 × 100 = 3997.99…)", provenance: "hypothesis", source: "model" },
    ],
    questions: [{ text: "Is the amount sent to the payment provider computed by the same cart function?" }],
    pinned: { control: true },
    hypothesis: {
      statement: "lineTotal truncates the floating-point product to whole cents, losing a cent on prices like $19.99 × 2",
      triggerConditions: "lineTotal({ unitPrice: 19.99, quantity: 2 }) and a cart subtotal including it",
      expectedFailure: "lineTotal returns 39.97 where 39.98 is expected",
      evidenceNeeded: "Target run fails on both totals; control run on integer-cent maths passes",
    },
    runs: ["target", "control"],
  },
  {
    id: "inv_demo0008",
    repo: "demo-dashboard",
    ageMinutes: 27 * 60 + 15,
    description:
      "Dark mode switches back to light every time I reload the dashboard.\n\nI turn on dark mode from the user menu and it works, but after a refresh (or in a new tab) the dashboard is light again.",
    expected: "Dark mode stays on across reloads and new tabs.",
    actual: "The theme resets to light on every reload.",
    steps: "1. User menu → Appearance → Dark\n2. Reload the page",
    evidence: [
      { text: "Dark mode applies immediately when selected", provenance: "reported", source: "description" },
      { text: "The theme returns to light after a reload or in a new tab", provenance: "reported", source: "description" },
      { text: "The theme preference is kept only in component state and never persisted (localStorage or user profile)", provenance: "hypothesis", source: "model" },
    ],
    questions: [
      { text: "Which browser and version are you using, and is it a private/incognito window?", blocking: true },
      { text: "Are you signed in to the same account in the new tab?" },
    ],
  },
  {
    id: "inv_demo0003",
    repo: "demo-catalog",
    ageMinutes: 2 * 24 * 60 + 40,
    description:
      "Catalog shows an empty page 3 when a collection has exactly 40 products.\n\nThe Summer collection has 40 products at 20 per page. Pagination offers pages 1–3, and page 3 says \"No products to show\". A collection with 41 products looks fine.",
    expected: "Two pages and no empty page.",
    actual: "Three pages; the last one is empty.",
    steps: "1. Open /collections/summer\n2. Click page 3",
    environment: "Firefox 131 on Ubuntu 24.04",
    screenshot: "catalog-empty-page.png",
    evidence: [
      { text: "Pagination reads \"Page 3 of 3\" for 40 products at 20 per page", provenance: "observed", source: "image:1" },
      { text: "Page 3 shows the empty state \"No products to show\"", provenance: "observed", source: "image:1" },
      { text: "A collection with 41 products paginates correctly", provenance: "reported", source: "description" },
      { text: "The page count uses Math.floor(total / pageSize) + 1, which over-counts when total divides evenly", provenance: "hypothesis", source: "model" },
    ],
    questions: [{ text: "Is the page count computed on the server, the client, or both?" }],
    pinned: { control: false },
    hypothesis: {
      statement: "totalPages adds a page whenever the product count is an exact multiple of the page size",
      triggerConditions: "totalPages(40, 20) and the slice for the last reported page",
      expectedFailure: "totalPages(40, 20) returns 3 where 2 is expected",
      evidenceNeeded: "Target run fails on the page-count assertion",
    },
    runs: ["target"],
  },
  {
    id: "inv_demo0007",
    repo: "demo-auth",
    ageMinutes: 3 * 24 * 60 + 90,
    description:
      "Password reset links say \"expired\" as soon as I open them.\n\nI'm in Lagos (WAT, UTC+1). I request a reset, open the email within a minute and the page says \"This link has expired\". A colleague whose laptop is set to UTC can reset without problems.",
    expected: "Reset links work for 15 minutes.",
    actual: "\"This link has expired\" appears immediately.",
    steps: "1. Forgot password → enter my email\n2. Open the link from the email within a minute",
    environment: "Chrome 129 on Windows 11, timezone Africa/Lagos (UTC+1)",
    errorText: "GET /reset-password?token=… → 410 Gone {\"error\":\"token_expired\"}",
    evidence: [
      { text: "Reset links are rejected within a minute of being issued", provenance: "reported", source: "description" },
      { text: "Reporter's timezone is Africa/Lagos (UTC+1)", provenance: "reported", source: "field:environment" },
      { text: "The reset endpoint responds 410 Gone with token_expired", provenance: "reported", source: "field:error" },
      { text: "A colleague on a UTC machine can reset successfully", provenance: "reported", source: "description" },
      { text: "The expiry check reads the issue time without its UTC offset, so in UTC+1 a new token already looks an hour old", provenance: "hypothesis", source: "model" },
    ],
    questions: [{ text: "Is the expiry check done in the browser, on the server, or both?" }],
    pinned: { control: true },
    hypothesis: {
      statement: "isResetTokenExpired drops the UTC offset of the issue time, so tokens issued in UTC+1 expire an hour early",
      triggerConditions: "Token issued at 09:00 +01:00, checked at 09:01 +01:00 with a 15-minute window",
      expectedFailure: "isResetTokenExpired returns true where false is expected",
      evidenceNeeded: "Target run fails on the 1-minute-old token; control run on the fixed check passes",
      test: {
        path: "tests/patchsignal/repro-inv_demo0007.test.ts",
        content: `import { describe, expect, it } from "vitest";
import { isResetTokenExpired } from "../../src/auth/resetToken";

// Hypothesis: the expiry check drops the issue time's UTC offset, so a token
// issued in UTC+1 already looks an hour old.
describe("patchsignal repro: password reset expiry in UTC+1", () => {
  it("accepts a token issued 1 minute ago (15-minute window)", () => {
    const issuedAt = "2026-10-13T09:00:00+01:00";
    const now = new Date("2026-10-13T09:01:00+01:00");
    expect(isResetTokenExpired(issuedAt, now, 15)).toBe(false);
  });

  it("rejects a token issued 16 minutes ago", () => {
    const issuedAt = "2026-10-13T09:00:00+01:00";
    const now = new Date("2026-10-13T09:16:00+01:00");
    expect(isResetTokenExpired(issuedAt, now, 15)).toBe(true);
  });
});
`,
      },
    },
  },
  {
    id: "inv_demo0006",
    repo: "demo-export",
    ageMinutes: 4 * 24 * 60 + 150,
    description:
      "CSV export never finishes for our workspace (10,500 members).\n\nClicking Export CSV on the Members page shows a spinner forever and no file downloads. Smaller workspaces export fine. No error appears in the UI.",
    expected: "members.csv downloads within a few seconds.",
    actual: "The spinner never stops and no file is downloaded.",
    steps: "1. Settings → Members\n2. Click Export CSV",
    environment: "Edge 129 on Windows 11; workspace with 10,500 members",
    evidence: [
      { text: "Export hangs for the 10,500-member workspace", provenance: "reported", source: "description" },
      { text: "Smaller workspaces export successfully", provenance: "reported", source: "description" },
      { text: "The batching loop stops advancing on the last partial batch (10,500 is not a multiple of 1,000) and never exits", provenance: "hypothesis", source: "model" },
    ],
    questions: [
      { text: "Does a workspace with exactly 10,000 members export successfully?" },
      { text: "Do the server logs show a timeout or error for the export request?" },
    ],
    pinned: { control: false },
    hypothesis: {
      statement: "exportCsv never exits when the row count is not a multiple of the batch size",
      triggerConditions: "exportCsv over 10,500 rows with the default batch size of 1,000",
      expectedFailure: "exportCsv does not return; the run is killed at the runner time limit",
      evidenceNeeded: "A failing assertion would need a bounded loop; a timeout alone cannot confirm the cause",
    },
    runs: ["target"],
  },
];
