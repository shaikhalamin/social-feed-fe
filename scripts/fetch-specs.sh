#!/usr/bin/env bash
# Fetches the OpenAPI JSON spec from the running backend dev server.
set -euo pipefail

SPECS_DIR="./specs"
mkdir -p "$SPECS_DIR"

echo "Fetching API OpenAPI spec from http://localhost:8787/openapi.json ..."
curl -sf http://localhost:8787/openapi.json -o "$SPECS_DIR/api.json"

echo "Spec fetched successfully."
