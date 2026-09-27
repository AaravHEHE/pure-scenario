import { describe, expect, it } from "vitest";

import { rankEntries, withGuestPreview, type LeaderboardEntry } from "@/lib/leaderboard";

const REAL: LeaderboardEntry[] = [
  { displayName: "Ada", totalPoints: 500 },
  { displayName: "Bo", totalPoints: 120 },
  { displayName: "Cy", totalPoints: 40 },
];

const summary = (rows: ReturnType<typeof withGuestPreview>) =>
  rows.map((row) =>
    row.kind === "real"
      ? `${row.rank} ${row.displayName} ${row.totalPoints}`
      : `${row.rank} GUEST ${row.totalPoints}`,
  );

describe("rankEntries (real entries only)", () => {
  it("orders by points, highest first, with competition ranking for ties", () => {
    const rows = rankEntries([
      { displayName: "Low", totalPoints: 5 },
      { displayName: "Top", totalPoints: 90 },
      { displayName: "TieA", totalPoints: 30 },
      { displayName: "TieB", totalPoints: 30 },
    ]);
    expect(summary(rows)).toEqual(["1 Top 90", "2 TieA 30", "2 TieB 30", "4 Low 5"]);
  });
});

describe("withGuestPreview (where a guest's score would place)", () => {
  it("ranks the guest first when they beat every real entry", () => {
    expect(summary(withGuestPreview(REAL, 900))).toEqual([
      "1 GUEST 900",
      "1 Ada 500",
      "2 Bo 120",
      "3 Cy 40",
    ]);
  });

  it("ranks the guest last when every real entry beats them", () => {
    expect(summary(withGuestPreview(REAL, 3))).toEqual([
      "1 Ada 500",
      "2 Bo 120",
      "3 Cy 40",
      "4 GUEST 3",
    ]);
  });

  it("puts the guest in the middle at the position their score earns", () => {
    expect(summary(withGuestPreview(REAL, 200))).toEqual([
      "1 Ada 500",
      "2 GUEST 200",
      "2 Bo 120",
      "3 Cy 40",
    ]);
  });

  // Tie rule: the real entry wins. A preview never displaces someone who is
  // actually on the board, so the guest goes after every real entry with the
  // same points, and its rank is one past them.
  it("breaks a tie in the real entry's favour: the guest goes below it", () => {
    expect(summary(withGuestPreview(REAL, 120))).toEqual([
      "1 Ada 500",
      "2 Bo 120",
      "3 GUEST 120",
      "3 Cy 40",
    ]);
  });

  it("goes below every real entry in a multi-way tie", () => {
    const tied = [...REAL, { displayName: "Di", totalPoints: 120 }];
    expect(summary(withGuestPreview(tied, 120))).toEqual([
      "1 Ada 500",
      "2 Bo 120",
      "2 Di 120",
      "4 GUEST 120",
      "4 Cy 40",
    ]);
  });

  it("never renumbers the real entries, since the guest isn't competing", () => {
    const realRanks = (rows: ReturnType<typeof withGuestPreview>) =>
      rows.filter((row) => row.kind === "real").map((row) => row.rank);
    for (const points of [900, 200, 120, 3]) {
      expect(realRanks(withGuestPreview(REAL, points))).toEqual([1, 2, 3]);
    }
  });

  it("ranks first against an empty real leaderboard", () => {
    expect(summary(withGuestPreview([], 7))).toEqual(["1 GUEST 7"]);
  });

  it("omits the guest row at 0 points (hasn't played or hasn't won)", () => {
    expect(summary(withGuestPreview(REAL, 0))).toEqual(["1 Ada 500", "2 Bo 120", "3 Cy 40"]);
    expect(withGuestPreview([], 0)).toEqual([]);
  });

  it("does not mutate the fetched entries", () => {
    const input = [...REAL].reverse();
    const copy = structuredClone(input);
    withGuestPreview(input, 200);
    expect(input).toEqual(copy);
  });
});
