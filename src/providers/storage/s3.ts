import { promises as fs } from "fs";
import path from "path";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import type { StorageProvider } from "./index";

/**
 * S3-compatible storage (AWS S3, Cloudflare R2, MinIO, ...). Configured via S3_* env vars.
 */
export class S3Storage implements StorageProvider {
  private client = new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint || undefined,
    forcePathStyle: env.s3.forcePathStyle,
    credentials: env.s3.accessKeyId
      ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
      : undefined,
  });
  private bucket = env.s3.bucket;

  async put(key: string, data: Buffer | string, contentType?: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof data === "string" ? Buffer.from(data) : data,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async putFile(key: string, localPath: string, contentType?: string) {
    const body = await fs.readFile(localPath);
    return this.put(key, body, contentType);
  }

  async get(key: string) {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getFile(key: string, localPath: string) {
    const buf = await this.get(key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, buf);
    return localPath;
  }

  async url(key: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 60 * 60 },
    );
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
