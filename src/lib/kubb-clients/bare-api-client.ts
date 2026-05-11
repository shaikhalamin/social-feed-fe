import ky from "ky"
import { env } from "@/lib/env"
import { createKubbClient } from "./create-client"

export type {
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
  Client,
} from "./create-client"

const bareKy = ky.create({
  prefix: env.apiUrl,
  credentials: "include",
})

const client = createKubbClient(bareKy)

export default client
