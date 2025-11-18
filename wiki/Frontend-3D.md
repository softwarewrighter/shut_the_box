# 3D Frontend (Three.js)

This page documents the Three.js-based frontend implementation, including 3D rendering, animations, and user interaction handling.

## Overview

The frontend is implemented in `www/main.js` using Three.js for WebGL rendering. It creates an isometric 3D view of the game board with interactive tiles and animated dice.

## Scene Architecture

```mermaid
graph TD
    SCENE[Scene] --> CAMERA[OrthographicCamera]
    SCENE --> LIGHTS
    SCENE --> BOARD[Game Board]
    SCENE --> TILES[9 Numbered Tiles]
    SCENE --> DICE[2 Dice]

    LIGHTS --> AMBIENT[AmbientLight]
    LIGHTS --> DIRECTIONAL[DirectionalLight]

    BOARD --> MAIN_BOARD[Main Board Mesh]
    BOARD --> EDGES[4 Edge Meshes]

    TILES --> TILE_MESH[BoxGeometry Meshes]
    TILES --> NUMBERS[Canvas Textures]

    DICE --> DIE_MESH[BoxGeometry Meshes]
    DICE --> PIPS[Canvas Textures]

    RENDERER[WebGLRenderer] --> SCENE

    style SCENE fill:#333,color:#fff
    style CAMERA fill:#049ef4
    style TILES fill:#ffd700
    style DICE fill:#fff
```

## 3D Components

### Scene Setup

**Location:** `www/main.js:10-65`

```javascript
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Isometric camera
    camera = new THREE.OrthographicCamera(...);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // Renderer with shadows
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
```

**Camera Configuration:**
```mermaid
graph LR
    subgraph "Orthographic Camera"
        POS[Position: 10,10,10]
        TARGET[Look At: 0,0,0]
        FRUSTUM[Frustum Size: 20]
        ASPECT[Aspect: window ratio]
    end

    POS --> VIEW[Isometric View]
    TARGET --> VIEW
    FRUSTUM --> VIEW
    ASPECT --> VIEW

    style VIEW fill:#049ef4
```

**Why Orthographic?**
- No perspective distortion
- Consistent tile sizes regardless of depth
- Clear isometric view
- Predictable raycasting for mouse clicks

---

### Lighting System

**Location:** `www/main.js:36-49`

```mermaid
graph TD
    LIGHTING[Scene Lighting] --> AMBIENT[AmbientLight Color: 0xffffff Intensity: 0.6]
    LIGHTING --> DIR[DirectionalLight Color: 0xffffff Intensity: 0.8]

    DIR --> SHADOW[Shadow Mapping]
    SHADOW --> CONFIG[Shadow Camera Config near: 0.1 far: 50 bounds: ±15]

    DIR --> POS[Position: 5, 10, 5]

    style AMBIENT fill:#fff8dc
    style DIR fill:#fffacd
    style SHADOW fill:#ddd
```

**Shadow Configuration:**
- **Type:** PCFSoftShadowMap (smooth edges)
- **Casters:** Tiles and dice cast shadows
- **Receivers:** Board receives shadows

---

### Game Board

**Location:** `www/main.js:67-103`

```mermaid
graph TD
    BOARD[Game Board] --> MAIN[Main Board 20x1x10 units Color: 0x8B4513]
    BOARD --> FRONT[Front Edge 20x2x0.5]
    BOARD --> BACK[Back Edge 20x2x0.5]
    BOARD --> LEFT[Left Edge 0.5x2x11]
    BOARD --> RIGHT[Right Edge 0.5x2x11]

    MAIN --> MAT1[PhongMaterial Specular: 0x222222 Shininess: 10]
    FRONT --> MAT2[PhongMaterial Color: 0x654321]
    BACK --> MAT2
    LEFT --> MAT2
    RIGHT --> MAT2

    style MAIN fill:#8B4513,color:#fff
    style FRONT fill:#654321,color:#fff
    style BACK fill:#654321,color:#fff
    style LEFT fill:#654321,color:#fff
    style RIGHT fill:#654321,color:#fff
```

**Dimensions:**
- Main board: 20 × 1 × 10 units
- Position: Y = -0.5 (centered at origin)
- Material: Phong (realistic shading)

---

### Tile System

**Location:** `www/main.js:105-148`

#### Tile Creation

Each tile is a 3D object with:
- **Geometry:** BoxGeometry (1.8 × 0.2 × 3 units)
- **Material:** PhongMaterial (gold color: 0xffd700)
- **Number:** Canvas texture rendered on top face
- **Position:** Evenly spaced along X-axis
- **User Data:** `{tileNumber, isUp}`

**Tile Layout:**
```
Tile:  1    2    3    4    5    6    7    8    9
X pos: -8   -6   -4   -2    0    2    4    6    8
Y pos: 0.1  0.1  0.1  0.1  0.1  0.1  0.1  0.1  0.1
```

#### Number Rendering

```mermaid
flowchart LR
    CANVAS[Create Canvas 128x128] --> CTX[Get 2D Context]
    CTX --> DRAW[Draw Number Font: bold 80px Arial Color: black]
    DRAW --> TEX[Create CanvasTexture]
    TEX --> PLANE[PlaneGeometry 1.5x1.5]
    PLANE --> MESH[Mesh on Tile Top Y+0.11, rotX=-90°]

    style CANVAS fill:#fff
    style TEX fill:#87ceeb
    style MESH fill:#ffd700
```

**Code Pattern:**
```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.font = 'bold 80px Arial';
ctx.fillText(i + 1, 64, 64);
const texture = new THREE.CanvasTexture(canvas);
```

#### Tile States

```mermaid
stateDiagram-v2
    [*] --> Up: Game Start
    Up --> Selected: User Click
    Selected --> Up: User Unclick
    Selected --> Down: Submit Move
    Down --> [*]: Permanent

    note right of Up
        Color: 0xffd700 (gold)
        Rotation: 0
        isUp: true
    end note

    note right of Selected
        Color: 0xff6b6b (red)
        Rotation: 0
        isUp: true
    end note

    note right of Down
        Color: 0x555555 (gray)
        Rotation: π (flipped)
        isUp: false
    end note
```

---

### Dice System

**Location:** `www/main.js:150-318`

#### Dice Structure

```mermaid
graph TD
    DIE[Die Object] --> GEO[BoxGeometry 1.5x1.5x1.5]
    DIE --> MAT[6 Face Materials]
    DIE --> DATA[userData]

    MAT --> F1[Right Face]
    MAT --> F2[Left Face]
    MAT --> F3[Top Face]
    MAT --> F4[Bottom Face]
    MAT --> F5[Front Face]
    MAT --> F6[Back Face]

    F1 --> PIP1[Canvas Texture White + Black Pips]
    F2 --> PIP2[Canvas Texture]
    F3 --> PIP3[Canvas Texture]
    F4 --> PIP4[Canvas Texture]
    F5 --> PIP5[Canvas Texture]
    F6 --> PIP6[Canvas Texture]

    DATA --> INDEX[dieIndex]
    DATA --> FACES[faceMap array]

    style DIE fill:#fff
    style F3 fill:#fffacd
```

#### Face Painting Algorithm

**Location:** `www/main.js:169-242`

```mermaid
flowchart TD
    START[paintDieFaces target_value] --> OPPOSITE[Calculate Opposite opposite = 7 - target]
    OPPOSITE --> REMAIN[Get Remaining Values filter out target & opposite]
    REMAIN --> RAND_FRONT[Random Front Value from remaining]
    RAND_FRONT --> CALC_BACK[Calculate Back back = 7 - front]
    CALC_BACK --> FINAL[Remaining 2 Values for Right & Left]
    FINAL --> ASSIGN[Assign Face Array [R,L,T,B,F,K]]
    ASSIGN --> RENDER[Render Each Face Canvas + Pips]
    RENDER --> UPDATE[Update Die Materials]

    style START fill:#87ceeb
    style ASSIGN fill:#ffd700
    style UPDATE fill:#90ee90
```

**Die Face Rule:** Opposite faces always sum to 7
- Top + Bottom = 7
- Front + Back = 7
- Right + Left = 7

#### Pip Rendering Patterns

**Location:** `www/main.js:244-318`

```mermaid
graph TD
    PIPS[drawPips value] --> CHECK{value}

    CHECK -->|1| ONE[Center Pip]
    CHECK -->|2| TWO[Diagonal Pips TL to BR]
    CHECK -->|3| THREE[Diagonal + Center]
    CHECK -->|4| FOUR[Four Corners]
    CHECK -->|5| FIVE[Four Corners + Center]
    CHECK -->|6| SIX[Two Columns 3 pips each]

    style ONE fill:#fff
    style TWO fill:#fff
    style THREE fill:#fff
    style FOUR fill:#fff
    style FIVE fill:#fff
    style SIX fill:#fff
```

**Pip Rendering:**
- Canvas size: 256×256 pixels
- Pip radius: 20 pixels
- Pip color: Black (#000000)
- Background: White (#ffffff)

---

## User Interaction

### Mouse Click Handling

**Location:** `www/main.js:320-342`

```mermaid
flowchart TD
    CLICK[Mouse Click] --> NORMALIZE[Normalize Coordinates -1 to +1 range]
    NORMALIZE --> RAYCAST[Create Ray from Camera]
    RAYCAST --> INTERSECT[Intersect with Tiles]
    INTERSECT --> HIT{Tile Hit?}

    HIT -->|No| END[Ignore]
    HIT -->|Yes| CHECK_UP{Tile Up?}

    CHECK_UP -->|No| END
    CHECK_UP -->|Yes| CHECK_SUM{Dice Rolled?}

    CHECK_SUM -->|No| END
    CHECK_SUM -->|Yes| TOGGLE{Already Selected?}

    TOGGLE -->|Yes| DESELECT[Remove from Selection Color: Gold]
    TOGGLE -->|No| SELECT[Add to Selection Color: Red]

    DESELECT --> UPDATE[Update Display]
    SELECT --> UPDATE
    UPDATE --> VALIDATE[Enable/Disable Submit Button]

    style CLICK fill:#61dafb
    style SELECT fill:#ff6b6b
    style DESELECT fill:#ffd700
    style VALIDATE fill:#90ee90
```

**Raycasting Process:**
```javascript
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(tiles);

if (intersects.length > 0) {
    const clickedTile = intersects[0].object;
    // Handle selection
}
```

---

## Animation System

### Dice Roll Animation

**Location:** `www/main.js:474-545`

```mermaid
sequenceDiagram
    participant User
    participant Anim as Animation Loop
    participant Dice as Dice Objects
    participant Paint as Face Painter
    participant Game as WASM Game

    User->>Anim: Click Roll Dice
    Anim->>Dice: Start Tumbling
    loop 20 rotations
        Dice->>Dice: Rotate X, Y, Z
        Dice->>Anim: Request next frame
    end
    Anim->>Paint: Paint faces (target values)
    Paint->>Dice: Apply materials
    Anim->>Dice: Reset rotation to 0
    Anim->>Game: set_dice_values(d1, d2)
    Game-->>Anim: Game state updated
    Anim->>User: Display result
```

**Animation Parameters:**
- Total rotations: 20 frames
- Rotation speeds: X+0.3, Y+0.4, Z+0.2
- Final rotation: (0, 0, 0) for clear top view
- Visibility: Die 2 hidden in single-die mode

### Tile Flip Animation

**Location:** `www/main.js:556-580`

```mermaid
flowchart TD
    START[Submit Move] --> LOOP[For Each Selected Tile]
    LOOP --> INIT[rotation = 0]
    INIT --> ANIM{rotation < π?}

    ANIM -->|Yes| ROTATE[tile.rotation.x += 0.1]
    ROTATE --> INCREMENT[rotation += 0.1]
    INCREMENT --> NEXT[requestAnimationFrame]
    NEXT --> ANIM

    ANIM -->|No| FINAL[Set rotation = π]
    FINAL --> COLOR[Set color to gray 0x555555]
    COLOR --> MARK[Mark isUp = false]

    style START fill:#61dafb
    style ANIM fill:#ffd700
    style FINAL fill:#555,color:#fff
```

**Animation Flow:**
1. Increment rotation by 0.1 radians per frame
2. Continue until rotation ≥ π (180°)
3. Set final rotation to exactly π
4. Change color to gray (0x555555)
5. Mark tile as down

---

## UI Management

### State Display Updates

**Location:** `www/main.js:623-647`

```mermaid
flowchart TD
    UPDATE[updateUI Called] --> QUERY_SCORE[game.get_score]
    UPDATE --> QUERY_OVER[game.is_game_over]

    QUERY_SCORE --> DISPLAY_SCORE[Update Score Display]
    QUERY_OVER --> CHECK{Game Over?}

    CHECK -->|No| CLEAR[Clear Message]
    CHECK -->|Yes| CHECK_SCORE{Score = 0?}

    CHECK_SCORE -->|Yes| WIN[Show Victory Message Color: Green]
    CHECK_SCORE -->|No| LOSE[Show Game Over Message Color: Red]

    WIN --> DISABLE[Disable Roll & Submit]
    LOSE --> DISABLE

    style WIN fill:#4CAF50,color:#fff
    style LOSE fill:#f44336,color:#fff
    style DISPLAY_SCORE fill:#ffd700
```

**Messages:**
- **Victory:** "🎉 Congratulations! You shut the box! Perfect score!"
- **Game Over:** "💀 Game Over! No valid moves available. Final score: {score}"

### Button State Management

| Button | Enabled When | Disabled When |
|--------|--------------|---------------|
| Roll Dice | No dice rolled & game not over | Dice already rolled OR game over |
| Submit Move | Valid selection made | No selection OR invalid sum OR game over |
| Reset | Always enabled | Never |

**Logic Flow:**
```javascript
document.getElementById('roll-btn').disabled =
    game.is_game_over() || game.get_current_sum() > 0;

document.getElementById('submit-btn').disabled =
    selectedTiles.size === 0 ||
    sum !== game.get_current_sum() ||
    game.is_game_over();
```

---

## Responsive Design

### Window Resize Handling

**Location:** `www/main.js:649-660`

```mermaid
flowchart LR
    RESIZE[Window Resize Event] --> CALC[Calculate New Aspect Ratio]
    CALC --> UPDATE_CAM[Update Camera Frustum left, right, top, bottom]
    UPDATE_CAM --> PROJ[Update Projection Matrix]
    PROJ --> RENDER[Update Renderer Size]

    style RESIZE fill:#61dafb
    style UPDATE_CAM fill:#049ef4
```

**Calculation:**
```javascript
const aspect = window.innerWidth / window.innerHeight;
camera.left = frustumSize * aspect / -2;
camera.right = frustumSize * aspect / 2;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
```

---

## Splash Screen & Instructions

**Location:** `www/main.js:667-749`

### Splash Screen Flow

```mermaid
stateDiagram-v2
    [*] --> Splash: Page Load
    Splash --> Instructions: Click Instructions
    Instructions --> Splash: Close Dialog
    Splash --> Game: Click Play
    Game --> [*]

    note right of Splash
        3D jellybean buttons
        Title display
    end note

    note right of Instructions
        Modal dialog
        Game rules
        Strategy tips
    end note

    note right of Game
        3D scene visible
        Splash hidden
    end note
```

### Test Environment Detection

**Location:** `www/main.js:686-697`

```javascript
function isTestEnvironment() {
    return typeof window !== 'undefined' && (
        window.location.href.includes('wasm-bindgen-test') ||
        window.__wbindgen_test_unstable ||
        document.title.includes('wasm-bindgen test runner') ||
        navigator.webdriver === true ||
        window.navigator.userAgent.includes('HeadlessChrome')
    );
}
```

**Purpose:** Skip splash screen in automated tests to prevent timeouts

---

## Performance Optimizations

### Rendering

- **Shadow maps:** Limited to 15×15 unit area
- **Antialias:** Enabled for smooth edges
- **Material reuse:** Single material per tile type
- **Texture caching:** Canvas textures generated once

### Animation

- **requestAnimationFrame:** Browser-optimized timing
- **Limited rotations:** 20 frames for dice roll
- **Incremental updates:** 0.1 radian steps for tile flip

### Event Handling

- **Raycasting:** Only on click, not mousemove
- **Intersection:** Only with tiles array (9 objects)
- **Debouncing:** Browser handles via RAF

---

**Related Pages:**
- [Game Logic Details](Game-Logic)
- [Sequence Diagrams](Sequence-Diagrams)
- [Architecture Overview](Architecture)
