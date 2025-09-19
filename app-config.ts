import type { AppConfig } from "@/lib/types";

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: "Carrer Connect",
  pageTitle: "",
  pageDescription: "A voice agent built for carrer",

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: "/logo.svg",
  accent: "#002cf2",
  logoDark: "/lk-logo-dark.svg",
  accentDark: "#1fd5f9",
  startButtonText: "Start call",

  agentName: undefined,
};
