// Client (RP) 側の Provider 切替設定

export type ProviderKey = "google" | "local";

export type ProviderConfig = {
  key: ProviderKey;
  label: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

export function resolveProvider(key: ProviderKey): ProviderConfig {
  if (key === "local") {
    return {
      key: "local",
      label: "Local Provider",
      issuer: "http://localhost:3000/api/provider",
      clientId: "local-demo-client",
      clientSecret: "local-demo-secret",
      scopes: ["openid", "profile", "email"],
    };
  }
  return {
    key: "google",
    label: "Google",
    issuer: "https://accounts.google.com",
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    scopes: ["openid", "profile", "email"],
  };
}
