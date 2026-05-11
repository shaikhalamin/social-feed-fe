#!/usr/bin/env bash
# Fetches the OpenAPI JSON spec from the running backend dev server.
set -euo pipefail

SPECS_DIR="./specs"
mkdir -p "$SPECS_DIR"

echo "Fetching API OpenAPI spec from http://localhost:8787/docs ..."
curl -sf http://localhost:8787/docs -o "$SPECS_DIR/api.json"

echo "Spec fetched successfully."
