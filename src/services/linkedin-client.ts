import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  LINKEDIN_API_REST_BASE,
  LINKEDIN_API_V2_BASE,
  LINKEDIN_API_VERSION,
  REQUEST_TIMEOUT_MS,
} from "../constants.js";

function getAccessToken(): string {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "LINKEDIN_ACCESS_TOKEN environment variable is not set. " +
        "Obtain an access token via LinkedIn OAuth 2.0 and set it as LINKEDIN_ACCESS_TOKEN."
    );
  }
  return token;
}

function buildHeaders(versioned: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAccessToken()}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
  if (versioned) {
    headers["Linkedin-Version"] = LINKEDIN_API_VERSION;
  }
  return headers;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const detail =
      error.response?.data?.message ??
      error.response?.data?.serviceErrorCode ??
      "";
    switch (status) {
      case 400:
        return `Error: Bad request${detail ? ` — ${detail}` : ""}. Check your parameters and try again.`;
      case 401:
        return (
          "Error: Unauthorized. Your LINKEDIN_ACCESS_TOKEN is missing, expired, or invalid. " +
          "Generate a new token via LinkedIn OAuth 2.0."
        );
      case 403:
        return (
          "Error: Permission denied. The required OAuth scope is not granted for this action. " +
          `${detail ? detail + ". " : ""}Check your app's approved scopes in the LinkedIn Developer Portal.`
        );
      case 404:
        return "Error: Resource not found. Check that the ID or URN is correct.";
      case 422:
        return `Error: Unprocessable entity${detail ? ` — ${detail}` : ""}. The request body is invalid.`;
      case 429:
        return (
          "Error: Rate limit exceeded. LinkedIn enforces per-member and per-application daily limits. " +
          "Wait until midnight UTC before retrying."
        );
      case 500:
      case 503:
        return "Error: LinkedIn API is temporarily unavailable. Please try again later.";
      default:
        if (status) {
          return `Error: LinkedIn API responded with status ${status}${detail ? ` — ${detail}` : ""}.`;
        }
    }
    if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. The LinkedIn API did not respond in time. Please try again.";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

export async function v2Get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await axios.get<T>(`${LINKEDIN_API_V2_BASE}${path}`, {
    headers: buildHeaders(false),
    params,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function restGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await axios.get<T>(`${LINKEDIN_API_REST_BASE}${path}`, {
    headers: buildHeaders(true),
    params,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function restPost<T>(path: string, body: unknown): Promise<T> {
  const response = await axios.post<T>(`${LINKEDIN_API_REST_BASE}${path}`, body, {
    headers: buildHeaders(true),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function restDelete(path: string): Promise<void> {
  await axios.delete(`${LINKEDIN_API_REST_BASE}${path}`, {
    headers: buildHeaders(true),
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export async function restPatch(path: string, body: unknown): Promise<void> {
  await axios.post(`${LINKEDIN_API_REST_BASE}${path}`, body, {
    headers: {
      ...buildHeaders(true),
      "X-RestLi-Method": "PARTIAL_UPDATE",
    },
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export async function v2Post<T>(path: string, body: unknown): Promise<T> {
  const response = await axios.post<T>(`${LINKEDIN_API_V2_BASE}${path}`, body, {
    headers: buildHeaders(false),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

export async function uploadBinaryToUrl(
  uploadUrl: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  await axios.put(uploadUrl, data, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": contentType,
    },
    timeout: 60000,
  });
}
