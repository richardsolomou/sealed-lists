set dotenv-load

default:
    @just --list

install:
    corepack enable
    pnpm install

dev:
    #!/usr/bin/env bash
    set -euo pipefail
    pnpm realtime &
    trap 'kill $!' EXIT INT TERM
    pnpm dev

realtime:
    pnpm realtime

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
