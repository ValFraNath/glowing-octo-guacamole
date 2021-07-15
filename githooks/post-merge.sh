#!/bin/bash

function changed() {
    git diff --name-only 'HEAD@{1}' HEAD | grep "^$1" >/dev/null 2>&1
}

cd "$(git rev-parse --show-toplevel)/server" || exit 1
if changed 'server/package-lock.json'; then
    echo "📦 server/package-lock.json changed. Running npm install"
    docker-compose exec -T server npm install || exit 1
fi

cd "$(git rev-parse --show-toplevel)/client" || exit 1
if changed 'client/package-lock.json'; then
    echo "📦 client/package-lock.json changed. Running npm install"
    docker-compose exec -T client npm install || exit 1
fi

exit 0
