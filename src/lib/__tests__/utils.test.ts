import { describe, it, expect } from "vitest";
import { cn, formatDuration } from "@/lib/utils";

// ---------------------------------------------------------------------------
// cn() — class-name merging
// ---------------------------------------------------------------------------

describe("cn()", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind utilities (last wins)", () => {
    // tailwind-merge resolves p-2 vs p-4; the later one should win
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, undefined, null, "", "bar")).toBe("foo bar");
  });

  it("handles conditional objects (clsx feature)", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
    expect(cn({ active: false })).toBe("");
  });

  it("handles arrays of class values", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("returns empty string when no truthy classes supplied", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("merges bg-color conflicts correctly", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("keeps non-conflicting utilities together", () => {
    const result = cn("flex", "items-center", "gap-2");
    expect(result).toBe("flex items-center gap-2");
  });
});

// ---------------------------------------------------------------------------
// formatDuration() — seconds → human-readable string
// ---------------------------------------------------------------------------

describe("formatDuration()", () => {
  describe("zero and sub-minute values", () => {
    it("formats 0 seconds as 0:00", () => {
      expect(formatDuration(0)).toBe("0:00");
    });

    it("formats 1 second as 0:01", () => {
      expect(formatDuration(1)).toBe("0:01");
    });

    it("formats 59 seconds as 0:59", () => {
      expect(formatDuration(59)).toBe("0:59");
    });
  });

  describe("minute-range values (< 1 hour)", () => {
    it("formats exactly 60 seconds as 1:00", () => {
      expect(formatDuration(60)).toBe("1:00");
    });

    it("formats 61 seconds as 1:01", () => {
      expect(formatDuration(61)).toBe("1:01");
    });

    it("formats 90 seconds as 1:30", () => {
      expect(formatDuration(90)).toBe("1:30");
    });

    it("formats 247 seconds (4m 7s) as 4:07", () => {
      expect(formatDuration(247)).toBe("4:07");
    });

    it("formats 3599 seconds (59m 59s) as 59:59", () => {
      expect(formatDuration(3599)).toBe("59:59");
    });
  });

  describe("hour-range values (>= 1 hour)", () => {
    it("formats exactly 3600 seconds as 1:00:00", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
    });

    it("formats 3661 seconds (1h 1m 1s) as 1:01:01", () => {
      expect(formatDuration(3661)).toBe("1:01:01");
    });

    it("formats 3725 seconds (1h 2m 5s) as 1:02:05", () => {
      expect(formatDuration(3725)).toBe("1:02:05");
    });

    it("formats 7200 seconds (2h) as 2:00:00", () => {
      expect(formatDuration(7200)).toBe("2:00:00");
    });

    it("formats 7384 seconds (2h 3m 4s) as 2:03:04", () => {
      expect(formatDuration(7384)).toBe("2:03:04");
    });
  });

  describe("edge cases", () => {
    it("clamps negative values to 0:00", () => {
      expect(formatDuration(-1)).toBe("0:00");
      expect(formatDuration(-999)).toBe("0:00");
    });

    it("truncates decimal seconds (floors)", () => {
      expect(formatDuration(60.9)).toBe("1:00");
      expect(formatDuration(59.999)).toBe("0:59");
    });

    it("handles very large values without throwing", () => {
      // 10 hours
      expect(formatDuration(36000)).toBe("10:00:00");
    });
  });
});
