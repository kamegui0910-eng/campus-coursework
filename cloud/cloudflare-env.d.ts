declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CAMPUS_ENCRYPTION_KEY?: string;
  }
}
