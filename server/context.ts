import type { AppConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import type { AppDatabase } from "./db.js";
import { openDatabase } from "./db.js";
import { AuthService } from "./services/auth.js";
import { MarketplaceService } from "./services/marketplace.js";

export interface AppServices {
  auth: AuthService;
  marketplace: MarketplaceService;
}

export interface AppContext {
  config: AppConfig;
  db: AppDatabase;
  services: AppServices;
  close(): void;
}

export interface CreateContextOptions {
  env?: NodeJS.ProcessEnv;
  config?: AppConfig;
  dbPath?: string;
  schemaPath?: string;
  isProduction?: boolean;
  allowedOrigins?: string[];
  cookieSecure?: boolean;
}

export function createContext(options: CreateContextOptions = {}): AppContext {
  const base = options.config ?? resolveConfig(options.env);
  const config: AppConfig = {
    ...base,
    ...(options.dbPath ? { dbPath: options.dbPath } : {}),
    ...(options.isProduction !== undefined
      ? { isProduction: options.isProduction }
      : {}),
    ...(options.allowedOrigins ? { allowedOrigins: [...options.allowedOrigins] } : {}),
    ...(options.cookieSecure !== undefined ? { cookieSecure: options.cookieSecure } : {}),
  };

  const db = openDatabase(config.dbPath, options.schemaPath);
  const auth = new AuthService(db);
  const marketplace = new MarketplaceService(db);

  let closed = false;

  return {
    config,
    db,
    services: { auth, marketplace },
    close() {
      if (closed) return;
      closed = true;
      db.close();
    },
  };
}
