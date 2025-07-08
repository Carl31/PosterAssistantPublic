export function notify(type: "info" | "error" | "warning" | "success", text: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-notify", { detail: { type, text } }));
  }
}
