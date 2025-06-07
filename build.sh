#!/bin/bash
set -e

echo "Cleaning dist directory..."
rm -rf dist

echo "Compiling TypeScript..."
npx tsc

echo "Copying static files..."
mkdir -p dist/public
cp -r public/* dist/public/ 2>/dev/null || :

echo "Creating templates directory..."
mkdir -p templates

echo "Build completed successfully!"
