import { describe, expect, it } from "vitest";
import { POINTS_PER_CORRECT, currentWeekStart, displayName, weekRangeLabel } from "./week";

describe("tuần xếp hạng (giờ Việt Nam, bắt đầu thứ Hai)", () => {
  it("20 điểm mỗi câu đúng", () => {
    expect(POINTS_PER_CORRECT).toBe(20);
  });

  it("trả về thứ Hai của tuần", () => {
    expect(currentWeekStart(new Date("2026-10-12T05:00:00Z"))).toBe("2026-10-12"); // thứ Hai
    expect(currentWeekStart(new Date("2026-10-15T05:00:00Z"))).toBe("2026-10-12"); // thứ Năm
    expect(currentWeekStart(new Date("2026-10-18T05:00:00Z"))).toBe("2026-10-12"); // Chủ nhật
  });

  it("đổi tuần lúc 0 giờ thứ Hai theo giờ Việt Nam (UTC+7), không theo UTC", () => {
    // 23:59 Chủ nhật giờ VN
    expect(currentWeekStart(new Date("2026-10-18T16:59:00Z"))).toBe("2026-10-12");
    // 00:00 thứ Hai giờ VN = 17:00 Chủ nhật UTC
    expect(currentWeekStart(new Date("2026-10-18T17:00:00Z"))).toBe("2026-10-19");
  });

  it("nhãn tuần từ thứ Hai đến Chủ nhật", () => {
    expect(weekRangeLabel("2026-10-12")).toMatch(/^12.10 – 18.10$/);
  });

  it("tên trống hiển thị là Học sinh", () => {
    expect(displayName(null)).toBe("Học sinh");
    expect(displayName("   ")).toBe("Học sinh");
    expect(displayName(" Lan ")).toBe("Lan");
  });
});
