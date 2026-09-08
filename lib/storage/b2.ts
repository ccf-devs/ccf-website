import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

if (typeof window !== "undefined") {
  throw new Error("B2 storage client can only be used on the server.");
}

export interface B2Config {
  endpoint: string;
  region: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
}

export interface UploadMediaParams {
  key: string;
  body: Buffer | Uint8Array | Readable | Blob | string;
  mimeType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface GetMediaResult {
  stream: ReadableStream | Readable | null;
  mimeType?: string;
  contentLength?: number;
  etag?: string;
}

/**
 * Validates and retrieves the Backblaze B2 storage configuration from environment variables.
 * Fails safely with descriptive error messages that never leak secret values.
 */
export function getB2Config(): B2Config {
  const endpoint =
    process.env.B2_ENDPOINT || "https://s3.ca-east-006.backblazeb2.com";
  const region = process.env.B2_REGION || "ca-east-006";
  const bucket = process.env.B2_BUCKET || "ccf-production-media";
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!keyId || !applicationKey) {
    const missing: string[] = [];
    if (!keyId) missing.push("B2_KEY_ID");
    if (!applicationKey) missing.push("B2_APPLICATION_KEY");
    throw new Error(
      `Backblaze B2 storage credentials not configured. Missing required environment variable(s): ${missing.join(", ")}.`
    );
  }

  return {
    endpoint,
    region,
    bucket,
    keyId,
    applicationKey,
  };
}

let cachedClient: S3Client | null = null;

/**
 * Returns a configured S3Client instance for Backblaze B2.
 */
export function getB2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getB2Config();

  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

/**
 * Resets cached client instance (primarily for testing configuration updates).
 */
export function resetB2Client(): void {
  cachedClient = null;
}

/**
 * Uploads a media file to Backblaze B2.
 */
export async function uploadMediaObject({
  key,
  body,
  mimeType,
  contentLength,
  metadata,
}: UploadMediaParams): Promise<{ key: string; etag?: string }> {
  const client = getB2Client();
  const { bucket } = getB2Config();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body as PutObjectCommandInput["Body"],
    ContentType: mimeType,
    ContentLength: contentLength,
    Metadata: metadata,
  });

  const response = await client.send(command);

  return {
    key,
    etag: response.ETag,
  };
}

/**
 * Downloads or streams a media object from Backblaze B2.
 * Returns null if the object is not found.
 */
export async function getMediaObject(key: string): Promise<GetMediaResult | null> {
  const client = getB2Client();
  const { bucket } = getB2Config();

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response: GetObjectCommandOutput = await client.send(command);

    return {
      stream: (response.Body as unknown as ReadableStream | Readable) ?? null,
      mimeType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      (("name" in error && (error.name === "NoSuchKey" || error.name === "NotFound")) ||
       ("$metadata" in error &&
        typeof error.$metadata === "object" &&
        error.$metadata !== null &&
        "httpStatusCode" in error.$metadata &&
        error.$metadata.httpStatusCode === 404))
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes a media object from Backblaze B2.
 */
export async function deleteMediaObject(key: string): Promise<void> {
  const client = getB2Client();
  const { bucket } = getB2Config();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Checks whether an object exists in Backblaze B2.
 */
export async function mediaObjectExists(key: string): Promise<boolean> {
  const client = getB2Client();
  const { bucket } = getB2Config();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      (("name" in error && (error.name === "NotFound" || error.name === "NoSuchKey")) ||
       ("$metadata" in error &&
        typeof error.$metadata === "object" &&
        error.$metadata !== null &&
        "httpStatusCode" in error.$metadata &&
        error.$metadata.httpStatusCode === 404))
    ) {
      return false;
    }
    throw error;
  }
}
