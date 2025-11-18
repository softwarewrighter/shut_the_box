# System Architecture

This page provides a comprehensive overview of the Shut the Box system architecture, including component relationships, data flows, and key design decisions.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Browser Environment"
        subgraph "Frontend Layer"
            HTML[index.html UI Structure]
            JS[main.js Three.js Frontend]
            THREE[Three.js Library 3D Rendering]
        end

        subgraph "WASM Layer"
            WASM[shut_the_box.wasm Compiled Game Logic]
            BINDINGS[WASM Bindings JS Glue Code]
        end
    end

    subgraph "Build Environment"
        RUST[src/lib.rs Rust Game Logic]
        WPACK[wasm-pack Build Tool]
    end

    HTML --> JS
    JS --> THREE
    JS <--> BINDINGS
    BINDINGS <--> WASM
    RUST --> WPACK
    WPACK --> WASM
    WPACK --> BINDINGS

    style RUST fill:#dea584
    style WASM fill:#654ff0
    style THREE fill:#049ef4
    style HTML fill:#e34c26
```

## Component Architecture

### Layer Breakdown

```mermaid
graph LR
    subgraph "Presentation Layer"
        UI[User Interface]
        RENDER[3D Renderer]
        INPUT[Input Handler]
    end

    subgraph "Application Layer"
        GAME[Game Manager]
        STATE[State Sync]
        ANIM[Animation Controller]
    end

    subgraph "Logic Layer"
        CORE[Game Core]
        VALID[Move Validator]
        DICE[Dice Logic]
    end

    subgraph "Data Layer"
        TILES[Tiles State]
        SCORE[Score State]
        FLAGS[Game Flags]
    end

    UI --> GAME
    RENDER --> GAME
    INPUT --> GAME
    GAME --> STATE
    GAME --> ANIM
    STATE --> CORE
    CORE --> VALID
    CORE --> DICE
    CORE --> TILES
    CORE --> SCORE
    CORE --> FLAGS

    style UI fill:#61dafb
    style RENDER fill:#049ef4
    style CORE fill:#dea584
    style TILES fill:#90ee90
```

## Component Responsibilities

### Frontend Components (JavaScript/Three.js)

| Component | File | Responsibility |
|-----------|------|----------------|
| **Scene Manager** | main.js:10-65 | Initialize Three.js scene, camera, renderer, lighting |
| **Board Creator** | main.js:67-103 | Create 3D game board and edges |
| **Tile Manager** | main.js:105-148 | Generate and manage 9 numbered tiles with textures |
| **Dice System** | main.js:150-318 | Create dice, paint faces, detect top values |
| **Input Handler** | main.js:320-342 | Process mouse clicks and tile selection |
| **Animation Engine** | main.js:486-545 | Dice rolling and tile flipping animations |
| **UI Controller** | main.js:623-647 | Update score, messages, button states |

### Backend Components (Rust/WASM)

| Component | File | Responsibility |
|-----------|------|----------------|
| **Game Struct** | lib.rs:4-11 | Core game state container |
| **Game Logic** | lib.rs:20-149 | Public API for game operations |
| **Move Validator** | lib.rs:76-91 | Validate tile selection combinations |
| **Combination Checker** | lib.rs:188-203 | Recursive algorithm for valid moves |
| **Dice Controller** | lib.rs:32-65 | Roll dice, manage single/double die mode |
| **State Manager** | lib.rs:143-149 | Reset and state transitions |

## Data Flow Architecture

### Game State Flow

```mermaid
flowchart TD
    START([New Game]) --> INIT[Initialize Game State All tiles up, score=45]
    INIT --> READY[Ready for Roll]
    READY --> ROLL[User Clicks Roll]
    ROLL --> DICE[Generate Dice Values]
    DICE --> CHECK{Valid Moves Exist?}
    CHECK -->|No| GAMEOVER[Game Over]
    CHECK -->|Yes| SELECT[User Selects Tiles]
    SELECT --> VALIDATE{Sum Matches Dice?}
    VALIDATE -->|No| SELECT
    VALIDATE -->|Yes| FLIP[Flip Tiles Down]
    FLIP --> UPDATE[Update Score]
    UPDATE --> WIN{All Tiles Down?}
    WIN -->|Yes| VICTORY[Victory! Score=0]
    WIN -->|No| READY

    style START fill:#90ee90
    style VICTORY fill:#ffd700
    style GAMEOVER fill:#ff6b6b
    style DICE fill:#87ceeb
```

### WASM Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant JS as JavaScript Frontend
    participant WASM as WASM Bindings
    participant Rust as Rust Game Logic

    User->>JS: Click "Roll Dice"
    JS->>JS: Generate random values
    JS->>JS: Animate dice tumbling
    JS->>WASM: set_dice_values(die1, die2)
    WASM->>Rust: Update game state
    Rust->>Rust: Check valid moves
    Rust-->>WASM: Return game_over flag
    WASM-->>JS: Boolean result
    JS->>WASM: is_game_over()
    WASM->>Rust: Query state
    Rust-->>WASM: Boolean
    WASM-->>JS: Boolean
    JS->>JS: Update UI
    JS-->>User: Display dice result
```

## Architecture Patterns

### State Management Pattern

The application uses a **single source of truth** pattern where all game state resides in Rust:

```mermaid
graph TD
    subgraph "JavaScript (View Layer)"
        VIEW[View State 3D objects, UI elements]
    end

    subgraph "Rust (Model Layer)"
        MODEL[Game State tiles, dice, score, game_over]
    end

    VIEW -->|Query State| MODEL
    MODEL -->|State Changes| VIEW

    style MODEL fill:#dea584,stroke:#333,stroke-width:3px
    style VIEW fill:#61dafb,stroke:#333,stroke-width:1px
```

**Benefits:**
- Consistent game rules enforcement
- Testable business logic
- Type-safe state transitions
- No sync issues between layers

### Component Communication

```mermaid
graph LR
    subgraph "User Actions"
        CLICK[Mouse Click]
        BUTTON[Button Press]
    end

    subgraph "Event Handlers"
        TILE[Tile Selection]
        ROLL[Dice Roll]
        SUBMIT[Submit Move]
    end

    subgraph "WASM Interface"
        IS_VALID[is_valid_move]
        MAKE_MOVE[make_move]
        ROLL_DICE[roll_dice]
        GET_STATE[get_*]
    end

    CLICK --> TILE
    BUTTON --> ROLL
    BUTTON --> SUBMIT

    TILE --> IS_VALID
    SUBMIT --> MAKE_MOVE
    ROLL --> ROLL_DICE

    IS_VALID --> GET_STATE
    MAKE_MOVE --> GET_STATE
    ROLL_DICE --> GET_STATE

    style CLICK fill:#fff,stroke:#333
    style BUTTON fill:#fff,stroke:#333
    style IS_VALID fill:#654ff0
    style MAKE_MOVE fill:#654ff0
    style ROLL_DICE fill:#654ff0
```

## Key Design Decisions

### 1. Rust for Game Logic

**Rationale:**
- Type safety prevents invalid game states
- Memory safety without garbage collection
- Excellent performance for combination checking
- Compiles to compact WASM

### 2. Three.js for 3D Rendering

**Rationale:**
- Mature WebGL abstraction
- Rich ecosystem of helpers
- Orthographic camera for isometric view
- Built-in shadow mapping

### 3. Isometric Camera View

```
Camera Configuration:
- Type: OrthographicCamera
- Position: (10, 10, 10)
- Look At: (0, 0, 0)
- Frustum: 20 units
```

**Benefits:**
- No perspective distortion
- Clear view of all tiles
- Predictable raycasting for clicks

### 4. State-Driven UI Updates

All UI updates derive from WASM state queries:

```javascript
function updateUI() {
    const score = game.get_score();      // Query WASM
    const isOver = game.is_game_over();  // Query WASM

    // UI reflects authoritative state
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('roll-btn').disabled = isOver;
}
```

### 5. Recursive Combination Checking

The move validator uses a recursive algorithm to check all possible tile combinations:

```
Algorithm: check_combinations(tiles, size, target)
- Base case: size==0, return target==0
- Recursive cases:
  1. Include first tile
  2. Exclude first tile
- Time complexity: O(2^n) worst case
- Acceptable for n≤9 tiles
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Roll Dice | O(1) | Random number generation |
| Validate Move | O(2^n) | Recursive combination check, n≤9 |
| Flip Tile | O(1) | Array update |
| Calculate Score | O(n) | Sum remaining tiles |
| Render Frame | O(m) | m = number of 3D objects (~30) |

## Build Pipeline

```mermaid
flowchart LR
    SRC[src/lib.rs] --> CARGO[cargo build]
    CARGO --> WASM_PKG[wasm-pack build]
    WASM_PKG --> WASM[.wasm binary]
    WASM_PKG --> JS_GLUE[.js bindings]
    WASM --> WWW[www/ directory]
    JS_GLUE --> WWW
    MAIN[www/main.js] --> WWW
    HTML[www/index.html] --> WWW
    WWW --> SERVER[HTTP Server]
    SERVER --> BROWSER[Web Browser]

    style SRC fill:#dea584
    style WASM fill:#654ff0
    style BROWSER fill:#61dafb
```

## Security Considerations

1. **Input Validation**: All user inputs validated in Rust
2. **No Direct DOM Manipulation from WASM**: Clean separation of concerns
3. **Type Safety**: Rust prevents memory corruption
4. **Bounds Checking**: Array access always validated
5. **No Unsafe Code**: Entire codebase is safe Rust

## Scalability

Current architecture supports:
- **Tiles**: Fixed at 9 (game rule)
- **Concurrent Games**: Unlimited (each browser instance independent)
- **State Size**: ~100 bytes per game
- **WASM Bundle**: ~20KB (gzipped)

---

**Related Pages:**
- [Game Logic Details](Game-Logic)
- [Frontend Implementation](Frontend-3D)
- [Sequence Diagrams](Sequence-Diagrams)
