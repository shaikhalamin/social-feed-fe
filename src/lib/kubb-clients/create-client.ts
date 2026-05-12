import { HTTPError  } from "ky"
import type {KyInstance} from "ky";
import {
  ApiError
  
  
  
  
} from "@/lib/api-error"
import type {Client, RequestConfig, ResponseConfig, ResponseErrorConfig} from "@/lib/api-error";

export type { RequestConfig, ResponseConfig, ResponseErrorConfig, Client }

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.message === "string") return record.message
    if (typeof record.error === "string") return record.error
  }
  if (typeof body === "string" && body.length > 0) return body
  return fallback
}

function stringifyPrimitive(value: unknown): string | undefined {
  if (value == null) return undefined
  switch (typeof value) {
    case "string":
      return value
    case "number":
    case "boolean":
    case "bigint":
      return value.toString()
    default:
      return undefined
  }
}

function serializeSearchParams(params: unknown): string | undefined {
  if (params == null || typeof params !== "object") return undefined
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(
    params as Record<string, unknown>
  )) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        const s = stringifyPrimitive(v)
        if (s !== undefined) sp.append(key, s)
      }
    } else {
      const s = stringifyPrimitive(value)
      if (s !== undefined) sp.append(key, s)
    }
  }
  const result = sp.toString()
  return result.length ? result : undefined
}

export function createKubbClient(kyInstance: KyInstance): Client {
  return async (config) => {
    const isFormData = config.data instanceof FormData
    const searchParams = serializeSearchParams(config.params)
    const url = config.url ?? ""

    let response: Response
    try {
      response = await kyInstance(url, {
        method: config.method ?? "GET",
        ...(config.data
          ? isFormData
            ? { body: config.data as FormData }
            : { json: config.data }
          : {}),
        ...(searchParams ? { searchParams } : {}),
        ...(config.baseURL ? { prefix: config.baseURL } : {}),
        signal: config.signal ?? undefined,
        headers: config.headers,
      })
    } catch (error) {
      if (error instanceof HTTPError) {
        const body: unknown = error.data
        throw new ApiError({
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.response.url || url,
          body: body as never,
          message: extractMessage(
            body,
            `${error.response.status} ${error.response.statusText}`
          ),
        })
      }
      throw error
    }

    const hasBody =
      response.status !== 204 &&
      response.status !== 205 &&
      response.headers.get("content-length") !== "0"
    const contentType = response.headers.get("content-type") ?? ""
    const data: unknown = hasBody
      ? contentType.includes("application/json")
        ? ((await response.json()) as unknown)
        : await response.text()
      : undefined

    return {
      data: data as never,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }
  }
}
