import { describe,it,expect } from "vitest";
import { hashPassword,verifyPassword,normalizeEmail,createToken,tokenDigest,safeSecretCompare } from "./security";
describe("invite-only credentials",()=>{
 it("hashes with a random salt and verifies securely",async()=>{
  const a=await hashPassword("test phrase secure enough");
  const b=await hashPassword("test phrase secure enough");
  expect(a).not.toEqual(b);
  expect(await verifyPassword("test phrase secure enough",a)).toBe(true);
  expect(await verifyPassword("different phrase",a)).toBe(false);
  expect(await verifyPassword("anything","malformed")).toBe(false);
 });
 it("normalizes emails and uses opaque random tokens",()=>{
  expect(normalizeEmail(" ADMIN@EXAMPLE.COM ")).toBe("admin@example.com");
  expect(normalizeEmail("invalid")).toBeNull();
  const a=createToken(),b=createToken();
  expect(a).not.toEqual(b);
  expect(tokenDigest(a)).not.toEqual(a);
 });
 it("requires long, constant-time compared bootstrap secret",()=>{
  expect(safeSecretCompare("a".repeat(32),"a".repeat(32))).toBe(true);
  expect(safeSecretCompare("b".repeat(32),"a".repeat(32))).toBe(false);
  expect(safeSecretCompare("short","short")).toBe(false);
 });
});
