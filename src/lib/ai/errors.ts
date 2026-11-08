/** What the person sees when the model call fails; details stay in the server log. */
export function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/quota|rate limit|429|resource.?exhausted/i.test(text)) {
    return "The AI model's free daily limit is used up. Try again later, or add another provider key.";
  }
  if (/api key|unauthori[sz]ed|401|403|permission/i.test(text)) {
    return "The AI model rejected the API key. Check the key in .env.local.";
  }
  return "Riya couldn't answer just now. Please try again.";
}
