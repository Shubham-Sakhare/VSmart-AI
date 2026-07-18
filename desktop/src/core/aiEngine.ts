import { route } from "../ai/router";

export async function askVSmart(
  input: string
): Promise<string> {

  const result = await route(input);

  return result.message ?? "Done.";

}