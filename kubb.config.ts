import { defineConfig } from "@kubb/core"
import { pluginOas } from "@kubb/plugin-oas"
import { pluginTs } from "@kubb/plugin-ts"
import { pluginZod } from "@kubb/plugin-zod"
import { pluginClient } from "@kubb/plugin-client"
import { pluginReactQuery } from "@kubb/plugin-react-query"

export default defineConfig({
  name: "api",
  root: ".",
  input: { path: "./specs/api.json" },
  output: { path: "./src/gen/api", clean: true },
  plugins: [
    pluginOas({ validate: false }),
    pluginTs({
      output: { path: "types" },
      enumType: "asConst",
      dateType: "string",
    }),
    pluginZod({
      output: { path: "zod" },
      version: "4",
    }),
    pluginClient({
      output: { path: "clients" },
      importPath: "@/lib/kubb-clients/api-client",
      dataReturnType: "data",
      paramsType: "object",
      pathParamsType: "object",
    }),
    pluginReactQuery({
      output: { path: "hooks" },
      client: {
        importPath: "@/lib/kubb-clients/api-client",
        dataReturnType: "data",
      },
      suspense: {},
      paramsType: "object",
      pathParamsType: "object",
    }),
  ],
})
