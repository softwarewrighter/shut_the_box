#!/bin/bash

# Build the WASM module
wasm-pack build --target web --out-dir www

# Copy the generated files to the correct location
# The files are already in the www directory thanks to --out-dir

echo "Build complete! Run 'basic-http-server www' to serve the game."