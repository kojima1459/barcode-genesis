#!/bin/sh
set -e

npm run lint --if-present
npm run typecheck --if-present
npm run build
