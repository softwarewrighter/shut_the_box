# Sequence Diagrams

This page documents the interaction flows and sequences for key operations in the Shut the Box game.

## Game Initialization

```mermaid
sequenceDiagram
    participant Browser
    participant HTML as index.html
    participant JS as main.js
    participant WASM as shut_the_box.wasm
    participant ThreeJS as Three.js

    Browser->>HTML: Load page
    HTML->>JS: Load module
    JS->>WASM: init()
    WASM-->>JS: WASM initialized

    Note over JS,WASM: Check if test environment

    alt Test Environment
        JS->>JS: Skip splash screen
        JS->>WASM: new Game()
        WASM-->>JS: Game instance
        JS->>ThreeJS: initThreeJS()
        ThreeJS-->>JS: Scene ready
        JS->>Browser: Show game
    else Normal Environment
        JS->>Browser: Show splash screen
        Browser->>JS: User clicks Play
        JS->>WASM: new Game()
        WASM-->>JS: Game instance
        JS->>ThreeJS: initThreeJS()
        ThreeJS-->>JS: Scene ready
        JS->>Browser: Show game
    end

    Note over Browser: Game ready to play
```

---

## Rolling Dice Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer
    participant Anim as Animation System
    participant JS as Game Manager
    participant WASM as Game Logic

    User->>UI: Click "Roll Dice"
    UI->>JS: rollDice()

    Note over JS: Check remaining tiles

    JS->>JS: Generate random die1 (1-6)

    alt Tiles 7-9 still up
        JS->>JS: Generate random die2 (1-6)
        JS->>JS: useTwoDice = true
    else Only tiles 1-6 remain
        JS->>JS: die2 = 0
        JS->>JS: useTwoDice = false
    end

    JS->>Anim: Start dice tumbling
    Anim->>Anim: Rotate dice (20 frames)

    loop 20 rotations
        Anim->>Anim: dice.rotation += (0.3, 0.4, 0.2)
        Anim->>Anim: requestAnimationFrame()
    end

    Anim->>Anim: paintDieFaces(die1Value)

    alt useTwoDice
        Anim->>Anim: paintDieFaces(die2Value)
        Anim->>Anim: dice[1].visible = true
    else Single die
        Anim->>Anim: dice[1].visible = false
    end

    Anim->>Anim: Reset rotation to (0,0,0)

    Anim->>WASM: set_dice_values(die1, die2)
    WASM->>WASM: current_sum = die1 + die2
    WASM->>WASM: has_valid_moves()?

    alt No valid moves
        WASM->>WASM: game_over = true
        WASM-->>Anim: State updated
        Anim->>UI: updateUI()
        UI->>User: Display "Game Over"
    else Valid moves exist
        WASM-->>Anim: State updated
        Anim->>UI: updateUI()
        UI->>User: Display dice values
        UI->>UI: Disable Roll button
        UI->>User: Ready for tile selection
    end
```

---

## Tile Selection Sequence

```mermaid
sequenceDiagram
    participant User
    participant Input as Input Handler
    participant Ray as Raycaster
    participant Tile as Tile Objects
    participant Select as Selection Manager
    participant UI as UI Controller

    User->>Input: Click on canvas
    Input->>Input: Normalize mouse coords

    Input->>Ray: setFromCamera(mouse, camera)
    Ray->>Tile: intersectObjects(tiles)

    alt No intersection
        Tile-->>Ray: []
        Ray-->>Input: No hit
        Input->>User: No action
    else Tile hit
        Tile-->>Ray: [intersection]
        Ray-->>Input: Clicked tile

        Input->>Tile: Check userData.isUp

        alt Tile is down
            Input->>User: No action
        else Tile is up
            Input->>WASM: get_current_sum()
            WASM-->>Input: current_sum

            alt No dice rolled (sum = 0)
                Input->>User: No action
            else Dice rolled
                Input->>Select: Check if tile selected

                alt Already selected
                    Select->>Select: Remove from selectedTiles
                    Select->>Tile: Set color to gold (0xffd700)
                else Not selected
                    Select->>Select: Add to selectedTiles
                    Select->>Tile: Set color to red (0xff6b6b)
                end

                Select->>UI: updateSelectedTilesDisplay()
                UI->>UI: Calculate sum of selected
                UI->>UI: Check sum == current_sum

                alt Sum matches
                    UI->>UI: Enable Submit button
                else Sum doesn't match
                    UI->>UI: Disable Submit button
                end

                UI->>User: Update display
            end
        end
    end
```

---

## Submit Move Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer
    participant JS as Game Manager
    participant WASM as Game Logic
    participant Anim as Animation System
    participant Tiles as Tile Objects

    User->>UI: Click "Submit Move"
    UI->>JS: submitMove()

    JS->>JS: Get selectedTiles array
    JS->>WASM: make_move(selectedTiles)

    WASM->>WASM: is_valid_move(tiles)?

    alt Invalid move
        WASM-->>JS: false
        JS->>User: No action (shouldn't happen)
    else Valid move
        WASM->>WASM: Flip tiles in state
        WASM->>WASM: current_sum = 0
        WASM->>WASM: Check if all tiles down

        alt All tiles down
            WASM->>WASM: game_over = true
        end

        WASM-->>JS: true

        JS->>Tiles: For each selected tile

        loop Each selected tile
            JS->>Anim: Start flip animation
            Anim->>Tiles: rotation = 0

            loop rotation < π
                Anim->>Tiles: rotation.x += 0.1
                Anim->>Anim: requestAnimationFrame()
            end

            Anim->>Tiles: rotation.x = π
            Anim->>Tiles: color = gray (0x555555)
            Anim->>Tiles: userData.isUp = false
        end

        JS->>JS: Clear selectedTiles
        JS->>UI: updateSelectedTilesDisplay()
        JS->>UI: updateUI()

        UI->>WASM: is_game_over()
        WASM-->>UI: game_over status

        alt Game over
            UI->>WASM: get_score()
            WASM-->>UI: final_score

            alt Score = 0
                UI->>User: "Victory! Perfect score!"
                UI->>UI: Disable all buttons
            else Score > 0
                UI->>User: "Game Over! Score: {score}"
                UI->>UI: Disable all buttons
            end
        else Game continues
            UI->>UI: Enable Roll button
            UI->>UI: Disable Submit button
            UI->>User: Ready for next roll
        end
    end
```

---

## Complete Game Flow

```mermaid
flowchart TD
    START([Page Load]) --> INIT[Initialize WASM & Three.js]
    INIT --> SPLASH{Test Environment?}

    SPLASH -->|Yes| SKIP[Skip Splash]
    SPLASH -->|No| SHOW[Show Splash Screen]

    SHOW --> WAIT[Wait for Play Click]
    WAIT --> GAME_START

    SKIP --> GAME_START[Start New Game]

    GAME_START --> READY[Ready State Roll button enabled]

    READY --> ROLL[User Rolls Dice]
    ROLL --> GEN[Generate Random Values]
    GEN --> ANIMATE_DICE[Animate Dice Tumbling]
    ANIMATE_DICE --> PAINT[Paint Die Faces]
    PAINT --> SET_DICE[Set Dice Values in WASM]

    SET_DICE --> CHECK_MOVES{Valid Moves Exist?}

    CHECK_MOVES -->|No| GAME_OVER[Game Over State]
    CHECK_MOVES -->|Yes| SELECT_STATE[Selection State]

    SELECT_STATE --> CLICK[User Clicks Tiles]
    CLICK --> TOGGLE[Toggle Selection]
    TOGGLE --> CHECK_SUM{Sum Matches Dice?}

    CHECK_SUM -->|No| SELECT_STATE
    CHECK_SUM -->|Yes| ENABLE_SUBMIT[Enable Submit Button]

    ENABLE_SUBMIT --> SUBMIT[User Submits Move]
    SUBMIT --> VALIDATE[Validate Move in WASM]

    VALIDATE --> FLIP[Flip Tiles Animation]
    FLIP --> UPDATE_STATE[Update Game State]

    UPDATE_STATE --> CHECK_WIN{All Tiles Down?}

    CHECK_WIN -->|Yes| VICTORY[Victory State Score = 0]
    CHECK_WIN -->|No| READY

    GAME_OVER --> RESET_WAIT[Wait for Reset]
    VICTORY --> RESET_WAIT

    RESET_WAIT --> RESET{User Clicks Reset?}
    RESET -->|Yes| GAME_START
    RESET -->|No| RESET_WAIT

    style START fill:#90ee90
    style VICTORY fill:#ffd700
    style GAME_OVER fill:#ff6b6b
    style READY fill:#87ceeb
    style SELECT_STATE fill:#dda0dd
```

---

## Valid Move Detection Flow

```mermaid
flowchart TD
    START[has_valid_moves] --> CHECK_SUM{current_sum = 0?}

    CHECK_SUM -->|Yes| RETURN_TRUE[Return true No validation needed]

    CHECK_SUM -->|No| GET_TILES[Get all tiles still up]

    GET_TILES --> SINGLE[Check single tiles]

    SINGLE --> LOOP1[For each up tile]
    LOOP1 --> MATCH1{tile = sum?}
    MATCH1 -->|Yes| RETURN_TRUE
    MATCH1 -->|No| NEXT1[Next tile]
    NEXT1 --> MORE1{More tiles?}
    MORE1 -->|Yes| LOOP1
    MORE1 -->|No| PAIRS

    PAIRS[Check pairs of tiles] --> LOOP2A[For i in tiles]
    LOOP2A --> LOOP2B[For j > i in tiles]
    LOOP2B --> MATCH2{tiles[i]+tiles[j] = sum?}
    MATCH2 -->|Yes| RETURN_TRUE
    MATCH2 -->|No| NEXT2[Next pair]
    NEXT2 --> MORE2{More pairs?}
    MORE2 -->|Yes| LOOP2B
    MORE2 -->|No| COMBOS

    COMBOS[Check 3+ combinations] --> LOOP3[For size = 3 to len]
    LOOP3 --> RECURSIVE[check_combinations tiles, size, sum]

    RECURSIVE --> RECUR_CHECK{Match found?}
    RECUR_CHECK -->|Yes| RETURN_TRUE
    RECUR_CHECK -->|No| NEXT3[Next size]
    NEXT3 --> MORE3{More sizes?}
    MORE3 -->|Yes| LOOP3
    MORE3 -->|No| RETURN_FALSE[Return false No valid moves]

    style RETURN_TRUE fill:#90ee90
    style RETURN_FALSE fill:#ff6b6b
    style RECURSIVE fill:#ffd700
```

---

## Recursive Combination Checker

```mermaid
flowchart TD
    START[check_combinations tiles, size, target] --> BASE1{size = 0?}

    BASE1 -->|Yes| CHECK_TARGET{target = 0?}
    CHECK_TARGET -->|Yes| TRUE1[Return true]
    CHECK_TARGET -->|No| FALSE1[Return false]

    BASE1 -->|No| BASE2{tiles empty?}
    BASE2 -->|Yes| FALSE2[Return false]

    BASE2 -->|No| BASE3{target = 0?}
    BASE3 -->|Yes| FALSE3[Return false]

    BASE3 -->|No| INCLUDE[Try INCLUDING first tile]

    INCLUDE --> CHECK_VAL{tiles[0] ≤ target?}
    CHECK_VAL -->|Yes| RECUR1[check_combinations tiles[1..], size-1, target-tiles[0]]
    CHECK_VAL -->|No| EXCLUDE

    RECUR1 --> RESULT1{Returned true?}
    RESULT1 -->|Yes| TRUE2[Return true]
    RESULT1 -->|No| EXCLUDE

    EXCLUDE[Try EXCLUDING first tile] --> RECUR2[check_combinations tiles[1..], size, target]

    RECUR2 --> RESULT2[Return result]

    style TRUE1 fill:#90ee90
    style TRUE2 fill:#90ee90
    style FALSE1 fill:#ff6b6b
    style FALSE2 fill:#ff6b6b
    style FALSE3 fill:#ff6b6b
    style INCLUDE fill:#87ceeb
    style EXCLUDE fill:#dda0dd
```

**Example Trace:**
```
Goal: Find 3 tiles summing to 12
Tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9]

check_combinations([1,2,3,4,5,6,7,8,9], 3, 12)
├─ Include 1: check_combinations([2,3,4,5,6,7,8,9], 2, 11)
│  ├─ Include 2: check_combinations([3,4,5,6,7,8,9], 1, 9)
│  │  ├─ Include 3: check_combinations([4,5,6,7,8,9], 0, 6) → false
│  │  ├─ Exclude 3: check_combinations([4,5,6,7,8,9], 1, 9)
│  │  │  ├─ Include 4: check_combinations([5,6,7,8,9], 0, 5) → false
│  │  │  ├─ Exclude 4: ...
│  │  │  │  ... eventually finds 9
│  │  │  └─ Return true (found [2, 9])
│  │  └─ Return true
│  └─ Return true (found [1, 2, 9])
└─ Return true

Result: [1, 2, 9] sums to 12 ✓
```

---

## Reset Game Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer
    participant JS as Game Manager
    participant WASM as Game Logic
    participant Tiles as 3D Tiles

    User->>UI: Click "Reset"
    UI->>JS: resetGame()

    JS->>WASM: reset()
    WASM->>WASM: tiles = [true; 9]
    WASM->>WASM: current_sum = 0
    WASM->>WASM: dice1 = 0, dice2 = 0
    WASM->>WASM: game_over = false
    WASM-->>JS: Reset complete

    JS->>Tiles: For each tile

    loop Each tile
        Tiles->>Tiles: rotation.x = 0
        Tiles->>Tiles: color = gold (0xffd700)
        Tiles->>Tiles: userData.isUp = true
    end

    JS->>JS: Clear selectedTiles
    JS->>UI: Enable Roll button
    JS->>UI: Disable Submit button
    JS->>UI: Clear message
    JS->>UI: updateSelectedTilesDisplay()
    JS->>UI: updateUI()

    UI->>WASM: get_score()
    WASM-->>UI: 45

    UI->>User: Display "Score: 45"
    UI->>User: Game ready to play
```

---

## Error Handling Flows

### Invalid Move Attempt

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant WASM

    User->>UI: Select tiles [1, 2]
    UI->>UI: Calculate sum = 3
    UI->>WASM: get_current_sum()
    WASM-->>UI: 7

    UI->>UI: 3 ≠ 7
    UI->>UI: Keep Submit disabled
    UI->>User: Submit button grayed out

    Note over User,UI: User cannot submit invalid move
```

### No Valid Moves

```mermaid
sequenceDiagram
    participant WASM as Game Logic
    participant JS as Game Manager
    participant UI

    Note over WASM: After set_dice_values()

    WASM->>WASM: has_valid_moves()?
    WASM->>WASM: Check single tiles → none
    WASM->>WASM: Check pairs → none
    WASM->>WASM: Check combinations → none
    WASM->>WASM: Return false

    WASM->>WASM: game_over = true

    WASM-->>JS: State updated
    JS->>UI: updateUI()
    UI->>UI: Display "Game Over"
    UI->>UI: Disable all buttons
    UI->>UI: Show final score
```

---

**Related Pages:**
- [Architecture Overview](Architecture)
- [Game Logic Details](Game-Logic)
- [Frontend Implementation](Frontend-3D)
