declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GOOGLE_CLIENT_ID?: string;
    APP_ORIGIN?: string;
    AUTH_ENV?: string;
    ADMIN_EMAIL?: string;
  }
}
