export class ApiError<TBody = unknown> extends Error {
  readonly name = "ApiError"
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly body: TBody

  constructor(params: {
    status: number
    statusText: string
    url: string
    body: TBody
    message: string
  }) {
    super(params.message)
    this.status = params.status
    this.statusText = params.statusText
    this.url = params.url
    this.body = params.body
  }
}

export type RequestConfig<TData = unknown> = {
  baseURL?: string
  url?: string
  method?:
    | "GET"
    | "PUT"
    | "PATCH"
    | "POST"
    | "DELETE"
    | "OPTIONS"
    | "HEAD"
  params?: unknown
  data?: TData | FormData
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream"
  signal?: AbortSignal
  headers?: HeadersInit
}

export type ResponseConfig<TData = unknown> = {
  data: TData
  status: number
  statusText: string
  headers?: Headers
}

export type ResponseErrorConfig<TError = unknown> = ApiError<TError>

export type Client = <
  TResponseData,
  TError = unknown,
  TRequestData = unknown,
>(
  config: RequestConfig<TRequestData> & { errorType?: TError }
) => Promise<ResponseConfig<TResponseData> & { errorType?: TError }>
