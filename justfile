set dotenv-load

default:
    @just --list

install:
    corepack enable
    pnpm install

dev:
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p data-dev
    cleanup() {
        docker rm --force sealed-lists-realtime >/dev/null 2>&1 || true
    }
    trap cleanup EXIT INT TERM
    cleanup
    just realtime --detach
    CENTRIFUGO_API_KEY=dev-api CENTRIFUGO_PROXY_SECRET=dev-api APP_URL=http://localhost:3000 DATA_DIR=./data-dev pnpm dev --host 0.0.0.0

realtime *args:
    pnpm exec ras-stack-realtime --config centrifugo.json --name sealed-lists-realtime --port 8000 --origin http://localhost:3000 --secret dev-api --connect-proxy-endpoint http://host.docker.internal:3000/api/centrifugo/connect {{ args }}

format:
    pnpm format

lint:
    pnpm lint

build:
    pnpm build

typecheck:
    pnpm typecheck

test *args:
    pnpm exec vitest run {{ args }}

db-generate:
    pnpm db:generate

ui *args:
    pnpm exec shadcn {{ args }}

check:
    pnpm check

image:
    docker build -t sealed-lists .
