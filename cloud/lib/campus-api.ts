export async function campusApi<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/campus", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
  if (!response.headers.get("content-type")?.includes("json")) throw new Error("登录可能已过期，请刷新页面后重新登录。");
  const result = await response.json() as { ok: boolean; data: T; error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error || "这一步没有完成，请稍后再试。");
  return result.data;
}

