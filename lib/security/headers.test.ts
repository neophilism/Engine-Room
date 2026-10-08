import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
describe("global security controls", () => {
  it("protects every route against framing, MIME sniffing and device permissions", async () => {
    const entries=await nextConfig.headers!();
    const headers=new Map(entries[0].headers.map(item=>[item.key,item.value]));
    expect(entries[0].source).toBe("/:path*");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
});
