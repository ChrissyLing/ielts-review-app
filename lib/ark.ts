export type ArkConfig = {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
};

export function getArkConfig(): ArkConfig {
  return {
    apiKey: process.env.ARK_API_KEY,
    model: process.env.ARK_MODEL || "doubao-seed-1.6-250615",
    baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
  };
}
