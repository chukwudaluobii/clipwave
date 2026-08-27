import { promises as fs } from "fs";
import path from "path";
import { env } from "@/config/env";
import type { StorageProvider } from "./index";

/**
 * Local-disk storage for development. Files live under LOCAL_STORAGE_DIR and are served by
 * the /api/files/[...key] route (so the browser gets a real URL just like S3).
 */
export class LocalStorage implements StorageProvider {
  private root = path.resolve(env.localStorageDir);

  private full(key: string) {
    return path.join(this.root, key);
  }

  private async ensureDir(file: string) {
    await fs.mkdir(path.dirname(file), { recursive: true });
  }

  async put(key: string, data: Buffer | string, _contentType?: string) {
    const file = this.full(key);
    await this.ensureDir(file);
    await fs.writeFile(file, data);
    return key;
  }

  async putFile(key: string, localPath: string, _contentType?: string) {
    const file = this.full(key);
    await this.ensureDir(file);
    await fs.copyFile(localPath, file);
    return key;
  }

  async get(key: string) {
    return fs.readFile(this.full(key));
  }

  async getFile(key: string, localPath: string) {
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.copyFile(this.full(key), localPath);
    return localPath;
  }

  async url(key: string) {
    // Root-relative on purpose: the browser resolves it against whatever origin it loaded the
    // page from (localhost, a Cloudflare Tunnel URL, your domain), so media plays everywhere
    // without reconfiguring APP_URL.
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async exists(key: string) {
    try {
      await fs.access(this.full(key));
      return true;
    } catch {
      return false;
    }
  }
}
