import ky, { HTTPError } from "ky";

const baseUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";

export const api = ky.create({
  prefixUrl: baseUrl,
  credentials: "include",
  hooks: {
    beforeError: [
      async (error) => {
        const err = error as HTTPError;
        try {
          // try to read `{ message?: string }` from the server
          const body = (await err.response.clone().json()) as { message?: string };
          if (body?.message) {
            err.message = body.message; // surface server message
          }
        } catch {
          // ignore JSON parse errors
        }
        return err;
      },
    ],
  },
});
