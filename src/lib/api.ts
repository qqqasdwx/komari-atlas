export interface SettingsResponse {
  theme_settings?: unknown;
  [key: string]: unknown;
}

export async function getSettings(): Promise<SettingsResponse> {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: unable to load settings`);
  }

  const body = await response.json() as { data?: unknown };
  if (typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
    throw new Error("Settings response is invalid");
  }
  return body.data as SettingsResponse;
}

export async function updateSettings(settings: Partial<SettingsResponse>): Promise<void> {
  const response = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (response.ok) return;

  let message = `HTTP ${response.status}: unable to save settings`;
  try {
    const body = await response.json() as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) {
      message = body.message;
    }
  } catch {
    // The status message remains actionable when the response is not JSON.
  }
  throw new Error(message);
}
