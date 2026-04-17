// Client (RP) 側の Provider 切替設定

export type ProviderKey = "google" | "local" | "lion-frame";

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
  if (key === "lion-frame") {
    return {
      key: "lion-frame",
      label: "LionFrame",
      // Discovery 取得元ベース URL。discovery.issuer（http://localhost:3000）
      // は ID Token 検証時に jose が返却ドキュメントから読み取るため別物でよい。
      issuer: process.env.LIONFRAME_ISSUER ?? "http://localhost:3000/api/oidc",
      clientId: process.env.LIONFRAME_CLIENT_ID ?? "",
      clientSecret: process.env.LIONFRAME_CLIENT_SECRET ?? "",
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
