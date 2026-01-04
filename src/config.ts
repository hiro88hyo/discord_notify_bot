import { envSchema } from "./schemas";

export * from "./schemas";

// Load Env
export const config = envSchema.parse(process.env);
