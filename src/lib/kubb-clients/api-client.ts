import { api } from "@/lib/api-client"
import { createKubbClient } from "./create-client"

export type {
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
  Client,
} from "./create-client"

const client = createKubbClient(api)

export default client
