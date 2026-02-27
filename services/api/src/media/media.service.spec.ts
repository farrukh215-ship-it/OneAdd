import { UnprocessableEntityException } from "@nestjs/common";
import { FileValidationService } from "./file-validation.service";
import { MediaService } from "./media.service";

describe("MediaService", () => {
  const configServiceMock = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        MEDIA_SIGNING_EXPIRES_SECONDS: 600,
        MEDIA_PUBLIC_BASE_URL: "https://cdn.example.com"
      };
      return values[key] ?? fallback;
    }),
    getOrThrow: jest.fn(() => "media-secret")
  };

  it("rejects invalid media MIME type", () => {
    const service = new MediaService(
      configServiceMock as any,
      new FileValidationService()
    );

    expect(() =>
      service.signUploadUrl({
        path: "uploads/x.bin",
        mediaType: "IMAGE",
        mimeType: "application/octet-stream",
        sizeBytes: 100
      })
    ).toThrow(UnprocessableEntityException);
  });

  it("rejects oversized file", () => {
    const service = new MediaService(
      configServiceMock as any,
      new FileValidationService()
    );

    expect(() =>
      service.signUploadUrl({
        path: "uploads/x.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 11 * 1024 * 1024
      })
    ).toThrow(UnprocessableEntityException);
  });

  it("marks expired signed URL as invalid", () => {
    const service = new MediaService(
      configServiceMock as any,
      new FileValidationService()
    );

    const result = service.verifySignedUrl({
      path: "uploads/x.jpg",
      expires: Math.floor(Date.now() / 1000) - 1,
      signature: "deadbeef"
    });

    expect(result).toEqual({ valid: false, reason: "expired" });
  });
});
