declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NIRMAAN_LOCAL_PREVIEW?: string;
  }
}
