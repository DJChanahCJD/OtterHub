export * from "./auth";
export * from "./file";
export * from "./settings";
export * from "./wallpaper";

export const API_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || ""
    : "";
