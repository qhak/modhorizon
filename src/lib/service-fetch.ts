/** Workers supports manual redirects. Never forward service credentials to a redirect target. */
export async function serviceFetch(input: string | URL, init: RequestInit): Promise<Response> {
  const response = await fetch(input, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new Error("Service returned an unexpected redirect. Check the configured endpoint.");
  }
  return response;
}
