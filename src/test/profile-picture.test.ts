import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { validateProfilePicture } from "@/lib/profile-picture";

describe("Profile picture validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(validateProfilePicture(new File(["picture"], "photo", { type }))).toBeNull();
  });
  it("rejects unsupported files", () => {
    expect(validateProfilePicture(new File(["svg"], "photo.svg", { type: "image/svg+xml" }))).toMatch(/JPG/);
  });
  it("rejects empty pictures", () => {
    expect(validateProfilePicture(new File([], "photo.png", { type: "image/png" }))).toMatch(/empty/);
  });
  it("rejects pictures larger than 5 MB", () => {
    expect(validateProfilePicture(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "photo.png", { type: "image/png" }))).toMatch(/5 MB/);
  });
});