# Shut the Box - WASM Game

A 3D version of the classic dice game "Shut the Box" built with Rust/WASM and Three.js.

## How to Play

1. Roll the dice to get a sum
2. Click on tiles that add up to the dice sum
3. Submit your move to flip down the selected tiles
4. Continue until you can't make any more valid moves
5. Try to shut all the boxes (score of 0) to win!

## Rules

- When only tiles 1-6 remain up, you roll a single die
- You can select any combination of tiles that sum to your dice roll
- The game ends when you can't make a valid move
- Your score is the sum of all tiles still facing up

## Building and Running

1. Install dependencies:
   - Rust and Cargo
   - wasm-pack (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)
   - basic-http-server (already installed)

2. Build the project:
   ```bash
   ./build.sh
   ```

3. Serve the game:
   ```bash
   basic-http-server www
   ```

4. Open your browser to `http://localhost:4000`

## Technologies Used

- Rust with wasm-bindgen for game logic
- Three.js for 3D graphics
- WebAssembly for performance
- HTML5/CSS3/JavaScript for the UI