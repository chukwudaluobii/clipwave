import { env } from "@/config/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageProvider {
  /** Persist bytes (or a local file path) under `key`. Returns the key. */
  put(key: string, data: Buffer | string, contentType?: string): Promise<string>;
  /** Read bytes back. */
  get(key: string): Promise<Buffer>;
  /** Copy a local file into storage under `key`. */
  putFile(key: string, localPath: string, contentType?: string): Promise<string>;
  /** Download an object to a local path (for ffmpeg input). */
  getFile(key: string, localPath: string): Promise<string>;
  /** A URL the browser can use to fetch the object. */
  url(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
}

let _storage: StorageProvider | null = null;

export function storage(): StorageProvider {
  if (_storage) return _storage;
  _storage = env.providers.storage === "s3" ? new S3Storage() : new LocalStorage();
  return _storage;
}
