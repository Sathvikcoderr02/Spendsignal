import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPublicAppUrl } from "./publicAppUrl";

describe("getPublicAppUrl", () => {
  let vercel: string | undefined;
  let nextPublic: string | undefined;

  beforeEach(() => {
    vercel = process.env.VERCEL_URL;
    nextPublic = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (vercel === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = vercel;
    if (nextPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = nextPublic;
  });

  it("on Vercel ignores localhost NEXT_PUBLIC_APP_URL and uses VERCEL_URL", () => {
    process.env.VERCEL_URL = "spendsignal-dm8a.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getPublicAppUrl()).toBe("https://spendsignal-dm8a.vercel.app");
  });

  it("on Vercel prefers non-local NEXT_PUBLIC_APP_URL", () => {
    process.env.VERCEL_URL = "preview-abc.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.example.com/";
    expect(getPublicAppUrl()).toBe("https://custom.example.com");
  });

  it("local dev uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getPublicAppUrl()).toBe("http://localhost:3000");
  });

  it("local dev defaults to localhost:3000", () => {
    expect(getPublicAppUrl()).toBe("http://localhost:3000");
  });
});
