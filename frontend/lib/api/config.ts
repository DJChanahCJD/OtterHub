export const BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || ""
    : "";
