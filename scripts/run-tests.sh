#!/bin/sh

docker run -d --rm --name kept-test-instance -e POSTGRES_PASSWORD=password -p 5433:5432 postgres
POSTGRESQL_CONNECTION_STRING=postgres://postgres:password@localhost:5433/postgres pnpm -r test run
docker kill kept-test-instance