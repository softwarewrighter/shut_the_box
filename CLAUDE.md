# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- **Build the project**: `./build.sh` - Compiles Rust to WASM and outputs to www/ directory
- **Run the game**: `./run.sh` - Starts basic-http-server on port 4000 and opens browser
- **Alternative serving**: `basic-http-server www` or `python -m http.server 4000 --directory www`
- **Tests**: `cargo test` for Rust unit tests, `wasm-pack test --chrome --headless` for WASM tests

## Architecture Overview

This is a 3D "Shut the Box" dice game built with Rust/WASM backend and Three.js frontend:

### Core Components

- **Game Logic (Rust)**: `src/lib.rs` contains the `Game` struct with all game rules, state management, and move validation. Compiled to WASM for web use.
- **3D Frontend (JavaScript)**: `www/main.js` handles Three.js 3D rendering, user interactions, and UI management
- **Web Interface**: `www/index.html` provides the HTML structure and game controls

### Key Architecture Details

- **State Management**: Game state lives entirely in Rust `Game` struct, exposed via wasm-bindgen
- **Dice Logic**: Automatic single-die mode when only tiles 1-6 remain up
- **Move Validation**: Recursive combination checking for complex tile selections
- **3D Rendering**: Isometric view with realistic dice physics and tile animations
- **Communication**: JavaScript calls Rust methods through WASM bindings

### File Structure

- `src/lib.rs` - Core game logic and WASM bindings
- `src/main.rs` - Unused binary entry point (library crate)
- `www/` - Web assets including generated WASM files
- `build.sh` - wasm-pack build script
- `run.sh` - Development server launcher

### Development Notes

- WASM files are auto-generated in www/ by wasm-pack
- Three.js handles all 3D graphics and animations
- Game follows traditional "Shut the Box" rules with perfect score being 0
- Uses getrandom with "js" feature for browser-compatible randomness