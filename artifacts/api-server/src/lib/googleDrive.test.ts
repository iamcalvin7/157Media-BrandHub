import { afterEach, describe, expect, it, vi } from "vitest";

const { proxyMock } = vi.hoisted(() => ({
  proxyMock: vi.fn(),
}));

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = proxyMock;
  },
}));

import {
  assertPostDriveConfiguration,
  getPostDriveConfigurationStatus,
  verifyPostDriveParentsAccessible,
} from "./googleDrive.js";

const KEYS = [
  "GHS_DRIVE_PARENT_FOLDER_ID",
  "VF_DRIVE_EN_PARENT_FOLDER_ID",
  "VF_DRIVE_IT_PARENT_FOLDER_ID",
] as const;

const originalValues = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  proxyMock.mockReset();
  for (const key of KEYS) {
    const value = originalValues[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Google Drive post-folder configuration", () => {
  it("reports every missing required parent folder without exposing values", () => {
    process.env.GHS_DRIVE_PARENT_FOLDER_ID = "";
    delete process.env.VF_DRIVE_EN_PARENT_FOLDER_ID;
    process.env.VF_DRIVE_IT_PARENT_FOLDER_ID = "configured";

    expect(getPostDriveConfigurationStatus()).toEqual({
      configured: false,
      missing: [
        "GHS_DRIVE_PARENT_FOLDER_ID",
        "VF_DRIVE_EN_PARENT_FOLDER_ID",
      ],
    });
  });

  it("prevents startup when a required parent folder is missing", () => {
    for (const key of KEYS) process.env[key] = "configured";
    delete process.env.VF_DRIVE_IT_PARENT_FOLDER_ID;

    expect(() => assertPostDriveConfiguration()).toThrow(
      "VF_DRIVE_IT_PARENT_FOLDER_ID",
    );
  });

  it("allows startup only when all required parent folders are configured", () => {
    for (const key of KEYS) process.env[key] = "configured";

    expect(() => assertPostDriveConfiguration()).not.toThrow();
    expect(getPostDriveConfigurationStatus()).toEqual({
      configured: true,
      missing: [],
    });
  });

  it("verifies access to every configured parent folder", async () => {
    for (const key of KEYS) process.env[key] = "configured";
    proxyMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        mimeType: "application/vnd.google-apps.folder",
        capabilities: { canAddChildren: true },
      }),
    });

    await expect(verifyPostDriveParentsAccessible()).resolves.toBeUndefined();
    expect(proxyMock).toHaveBeenCalledTimes(3);
  });

  it("prevents startup when a configured parent folder is inaccessible", async () => {
    for (const key of KEYS) process.env[key] = "configured";
    proxyMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          mimeType: "application/vnd.google-apps.folder",
          capabilities: { canAddChildren: true },
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(verifyPostDriveParentsAccessible()).rejects.toThrow(
      "VF_DRIVE_EN_PARENT_FOLDER_ID",
    );
  });

  it("rejects readable parents that cannot accept child folders", async () => {
    for (const key of KEYS) process.env[key] = "configured";
    proxyMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        mimeType: "application/vnd.google-apps.folder",
        capabilities: { canAddChildren: false },
      }),
    });

    await expect(verifyPostDriveParentsAccessible()).rejects.toThrow(
      "is not a writable folder",
    );
  });

  it("times out a stalled parent-folder check", async () => {
    for (const key of KEYS) process.env[key] = "configured";
    proxyMock.mockReturnValue(new Promise(() => {}));

    await expect(verifyPostDriveParentsAccessible(0, 5)).rejects.toThrow(
      "timed out",
    );
  });
});