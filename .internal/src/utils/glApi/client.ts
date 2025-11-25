import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Level = components["schemas"]["Level"];

export const client = createClient<paths>({
  baseUrl: "http://localhost:3000/",
});

export async function loadLevel(repoId: string): Promise<Level> {
  const { data, response } = await client.GET("/v1/levels/{levelId}", {
    params: {
      path: { levelId: repoId },
    },
  });

  if (data) {
    return data;
  } else {
    throw new Error(
      `Failed to load level ${repoId}: ${response.status} ${response.statusText}`
    );
  }
}
