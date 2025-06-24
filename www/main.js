import init, { Game } from './shut_the_box.js';

let game;
let scene, camera, renderer;
let tiles = [];
let dice = [];
let selectedTiles = new Set();
let raycaster, mouse;

function initThreeJS() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Camera setup - isometric view
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 20;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);
    
    // Create game board
    createBoard();
    createTiles();
    createDice();
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Event listeners
    renderer.domElement.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function createBoard() {
    // Main board
    const boardGeometry = new THREE.BoxGeometry(20, 1, 10);
    const boardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        specular: 0x222222,
        shininess: 10
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.y = -0.5;
    board.receiveShadow = true;
    scene.add(board);
    
    // Board edges
    const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    
    // Front edge
    const frontEdge = new THREE.BoxGeometry(20, 2, 0.5);
    const frontMesh = new THREE.Mesh(frontEdge, edgeMaterial);
    frontMesh.position.set(0, 0, 5.25);
    scene.add(frontMesh);
    
    // Back edge
    const backMesh = new THREE.Mesh(frontEdge, edgeMaterial);
    backMesh.position.set(0, 0, -5.25);
    scene.add(backMesh);
    
    // Side edges
    const sideEdge = new THREE.BoxGeometry(0.5, 2, 11);
    const leftMesh = new THREE.Mesh(sideEdge, edgeMaterial);
    leftMesh.position.set(-10.25, 0, 0);
    scene.add(leftMesh);
    
    const rightMesh = new THREE.Mesh(sideEdge, edgeMaterial);
    rightMesh.position.set(10.25, 0, 0);
    scene.add(rightMesh);
}

function createTiles() {
    tiles = [];
    const tileGeometry = new THREE.BoxGeometry(1.8, 0.2, 3);
    
    for (let i = 0; i < 9; i++) {
        const tileMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffd700,
            specular: 0x444444,
            shininess: 30
        });
        
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        tile.position.set(-8 + i * 2, 0.1, 0);
        tile.castShadow = true;
        tile.receiveShadow = true;
        tile.userData = { tileNumber: i + 1, isUp: true };
        
        // Add number
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const numberMaterial = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true 
        });
        
        const numberGeometry = new THREE.PlaneGeometry(1.5, 1.5);
        const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
        numberMesh.position.y = 0.11;
        numberMesh.rotation.x = -Math.PI / 2;
        tile.add(numberMesh);
        
        tiles.push(tile);
        scene.add(tile);
    }
}

function createDice() {
    dice = [];
    const diceGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    
    for (let i = 0; i < 2; i++) {
        // Create empty die - we'll paint faces dynamically
        const die = new THREE.Mesh(diceGeometry, []);
        die.position.set(-2 + i * 4, 3, -3);
        die.castShadow = true;
        die.userData = { 
            dieIndex: i,
            faceMap: [1, 6, 3, 4, 2, 5] // placeholder, will be updated per roll
        };
        
        dice.push(die);
        scene.add(die);
    }
}

function paintDieFaces(die, topValue) {
    // Generate valid die faces where topValue is on top
    // Standard die rule: opposite faces sum to 7
    const bottomValue = 7 - topValue;
    
    // Start with remaining 4 values after removing top and bottom
    const remainingValues = [1, 2, 3, 4, 5, 6].filter(v => v !== topValue && v !== bottomValue);
    
    console.log(`Die ${die.userData.dieIndex + 1}: Top=${topValue}, Bottom=${bottomValue}, Remaining=[${remainingValues.join(',')}]`);
    
    // Pick a random value for the front face from remaining values
    const frontIndex = Math.floor(Math.random() * remainingValues.length);
    const frontValue = remainingValues[frontIndex];
    const backValue = 7 - frontValue; // Back is opposite of front
    
    // Remove front and back values from remaining
    const finalRemaining = remainingValues.filter(v => v !== frontValue && v !== backValue);
    
    // The last two values go to right and left (pick one randomly for right)
    const rightValue = finalRemaining[Math.floor(Math.random() * finalRemaining.length)];
    const leftValue = finalRemaining.find(v => v !== rightValue);
    
    console.log(`  Front=${frontValue}, Back=${backValue}, Right=${rightValue}, Left=${leftValue}`);
    
    // Verify all opposite pairs sum to 7
    console.log(`  Verification: Top+Bottom=${topValue + bottomValue}, Front+Back=${frontValue + backValue}, Right+Left=${rightValue + leftValue}`);
    
    // Assign faces: [right, left, top, bottom, front, back]
    const faceValues = [
        rightValue,  // right
        leftValue,   // left
        topValue,    // top
        bottomValue, // bottom
        frontValue,  // front  
        backValue    // back
    ];
    
    // Update die's face map
    die.userData.faceMap = faceValues;
    
    // Create materials for each face
    const diceMaterials = [];
    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
        const value = faceValues[faceIndex];
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 256);
        
        // Draw pips
        ctx.fillStyle = '#000000';
        const pipRadius = 20;
        const center = 128;
        const offset = 60;
        
        drawPips(ctx, value, center, offset, pipRadius);
        
        const texture = new THREE.CanvasTexture(canvas);
        diceMaterials.push(new THREE.MeshPhongMaterial({ 
            map: texture,
            specular: 0x222222,
            shininess: 20
        }));
    }
    
    // Update die materials
    die.material = diceMaterials;
    
    return faceValues;
}

function drawPips(ctx, value, center, offset, pipRadius) {
    switch(value) {
        case 1:
            // Center pip
            ctx.beginPath();
            ctx.arc(center, center, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 2:
            // Two diagonal pips
            ctx.beginPath();
            ctx.arc(center - offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 3:
            // Three diagonal pips
            ctx.beginPath();
            ctx.arc(center - offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center, center, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 4:
            // Four corner pips
            ctx.beginPath();
            ctx.arc(center - offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center - offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 5:
            // Five pips (four corners + center)
            ctx.beginPath();
            ctx.arc(center - offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center - offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center, center, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center - offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center + offset, center + offset, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 6:
            // Six pips (two columns)
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(center - offset, center - offset + j * offset, pipRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(center + offset, center - offset + j * offset, pipRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tiles);
    
    if (intersects.length > 0) {
        const clickedTile = intersects[0].object;
        const tileNumber = clickedTile.userData.tileNumber;
        
        if (clickedTile.userData.isUp && game.get_current_sum() > 0) {
            if (selectedTiles.has(tileNumber)) {
                selectedTiles.delete(tileNumber);
                clickedTile.material.color.setHex(0xffd700);
            } else {
                selectedTiles.add(tileNumber);
                clickedTile.material.color.setHex(0xff6b6b);
            }
            updateSelectedTilesDisplay();
        }
    }
}

function updateSelectedTilesDisplay() {
    const selected = Array.from(selectedTiles).sort((a, b) => a - b);
    document.getElementById('selected-tiles').textContent = 
        selected.length > 0 ? `Selected: ${selected.join(', ')}` : 'Selected: None';
    
    const sum = selected.reduce((acc, val) => acc + val, 0);
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = sum !== game.get_current_sum();
}

function updateGameWithActualRoll(actualResults) {
    // Instead of using the game's internal roll, we set the values based on what's actually showing
    game.set_dice_values(actualResults[0], actualResults[1]);
    
    console.log(`Set dice values: ${actualResults[0]} + ${actualResults[1]} = ${actualResults[0] + actualResults[1]}`);
    console.log(`Game over status: ${game.is_game_over()}`);
    
    if (game.is_game_over()) {
        // Game over - disable all interactions
        document.getElementById('roll-btn').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        console.log('Game over detected - no valid moves available');
    } else {
        // Dice have been rolled - disable roll button until move is submitted
        document.getElementById('roll-btn').disabled = true;
        // Submit button starts disabled until valid selection is made
        document.getElementById('submit-btn').disabled = true;
    }
    
    updateUI();
}

function getAllFaceValues(die) {
    // Returns all 6 face values in order: right, left, top, bottom, front, back
    return die.userData.faceMap.slice();
}

function getTopFaceValue(die) {
    // Our face arrangement: [1, 6, 3, 4, 2, 5] = [right, left, top, bottom, front, back]
    const faceValues = die.userData.faceMap;
    
    // Create a vector pointing up (in world space)
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Test each face normal to see which one points most upward
    const faceNormals = [
        new THREE.Vector3(1, 0, 0),   // right face (+X)
        new THREE.Vector3(-1, 0, 0),  // left face (-X)
        new THREE.Vector3(0, 1, 0),   // top face (+Y)
        new THREE.Vector3(0, -1, 0),  // bottom face (-Y)
        new THREE.Vector3(0, 0, 1),   // front face (+Z)
        new THREE.Vector3(0, 0, -1),  // back face (-Z)
    ];
    
    let maxDot = -1;
    let topFaceIndex = 2; // default to top face
    
    // Transform each face normal by the die's rotation and find which points most upward
    for (let i = 0; i < 6; i++) {
        const transformedNormal = faceNormals[i].clone();
        transformedNormal.applyEuler(die.rotation);
        
        const dot = transformedNormal.dot(upVector);
        if (dot > maxDot) {
            maxDot = dot;
            topFaceIndex = i;
        }
    }
    
    // Verify dice validity (opposite faces sum to 7)
    const faceNames = ['Right(+X)', 'Left(-X)', 'Top(+Y)', 'Bottom(-Y)', 'Front(+Z)', 'Back(-Z)'];
    console.log(`Die ${die.userData.dieIndex + 1}: Face ${topFaceIndex} (${faceNames[topFaceIndex]}) with value ${faceValues[topFaceIndex]} is detected as top`);
    console.log('Die rotation:', `x=${die.rotation.x.toFixed(2)}, y=${die.rotation.y.toFixed(2)}, z=${die.rotation.z.toFixed(2)}`);
    console.log('Face values:', faceValues);
    console.log('Opposite face sums:', 
        `${faceValues[0]}+${faceValues[1]}=${faceValues[0]+faceValues[1]}`,
        `${faceValues[2]}+${faceValues[3]}=${faceValues[2]+faceValues[3]}`,
        `${faceValues[4]}+${faceValues[5]}=${faceValues[4]+faceValues[5]}`
    );
    
    return faceValues[topFaceIndex];
}

function displayAllFaceCombinations(die1Faces, die2Faces) {
    const faceNames = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back'];
    
    console.log('=== All Face Combinations ===');
    if (die2Faces) {
        for (let i = 0; i < 6; i++) {
            const isTop = (i === 2);
            const marker = isTop ? ' ← ACTUAL TOPS (what you see)' : '';
            console.log(`(${faceNames[i]}) Dice: ${die1Faces[i]} + ${die2Faces[i]} = ${die1Faces[i] + die2Faces[i]}${marker}`);
        }
    } else {
        for (let i = 0; i < 6; i++) {
            const isTop = (i === 2);
            const marker = isTop ? ' ← ACTUAL TOP (what you see)' : '';
            console.log(`(${faceNames[i]}) Die: ${die1Faces[i]}${marker}`);
        }
    }
    console.log('=============================');
}

function getTopFaceIndex(die) {
    const upVector = new THREE.Vector3(0, 1, 0);
    const faceNormals = [
        new THREE.Vector3(1, 0, 0),   // right face (+X)
        new THREE.Vector3(-1, 0, 0),  // left face (-X)
        new THREE.Vector3(0, 1, 0),   // top face (+Y)
        new THREE.Vector3(0, -1, 0),  // bottom face (-Y)
        new THREE.Vector3(0, 0, 1),   // front face (+Z)
        new THREE.Vector3(0, 0, -1),  // back face (-Z)
    ];
    
    let maxDot = -1;
    let topFaceIndex = 2;
    
    for (let i = 0; i < 6; i++) {
        const transformedNormal = faceNormals[i].clone();
        transformedNormal.applyEuler(die.rotation);
        const dot = transformedNormal.dot(upVector);
        if (dot > maxDot) {
            maxDot = dot;
            topFaceIndex = i;
        }
    }
    
    return topFaceIndex;
}

function rollDice() {
    // Generate random dice values first
    const useTwoDice = game.get_tiles().some((up, i) => up && i >= 6); // tiles 7-9 are up
    const die1Value = Math.floor(Math.random() * 6) + 1;
    const die2Value = useTwoDice ? Math.floor(Math.random() * 6) + 1 : 0;
    
    console.log('Generated dice values:', die1Value, die2Value || 'N/A');
    
    // Animate dice
    let rotations = 0;
    const maxRotations = 20;
    
    const animateDice = () => {
        if (rotations < maxRotations) {
            dice.forEach((die, index) => {
                die.rotation.x += 0.3;
                die.rotation.y += 0.4;
                die.rotation.z += 0.2;
            });
            rotations++;
            requestAnimationFrame(animateDice);
        } else {
            // Paint dice faces with the desired top values
            const die1Faces = paintDieFaces(dice[0], die1Value);
            let die2Faces = null;
            
            if (useTwoDice) {
                die2Faces = paintDieFaces(dice[1], die2Value);
                dice[1].visible = true;
            } else {
                dice[1].visible = false;
            }
            
            // Set dice to show tops clearly (no rotation = top face visible)
            dice[0].rotation.set(0, 0, 0);
            if (useTwoDice) {
                dice[1].rotation.set(0, 0, 0);
            }
            
            console.log('Die 1 painted faces:', die1Faces);
            if (die2Faces) console.log('Die 2 painted faces:', die2Faces);
            
            // Display all face combinations
            displayAllFaceCombinations(die1Faces, die2Faces);
            
            // Use the values we painted on top
            const actualResults = [die1Value];
            if (useTwoDice) {
                actualResults.push(die2Value);
            } else {
                actualResults.push(0);
            }
            
            console.log('Final dice values:', actualResults);
            
            // Tell the game what we rolled
            updateGameWithActualRoll(actualResults);
            updateDiceDisplay(actualResults);
        }
    };
    
    animateDice();
    
    document.getElementById('roll-btn').disabled = true;
    selectedTiles.clear();
    tiles.forEach(tile => {
        if (tile.userData.isUp) {
            tile.material.color.setHex(0xffd700);
        }
    });
    updateSelectedTilesDisplay();
}

function updateDiceDisplay(results) {
    const diceResult = document.getElementById('dice-result');
    if (results[1] > 0) {
        diceResult.textContent = `Dice: ${results[0]} + ${results[1]} = ${results[0] + results[1]}`;
    } else {
        diceResult.textContent = `Die: ${results[0]}`;
    }
}

function submitMove() {
    const selected = Array.from(selectedTiles);
    if (game.make_move(selected)) {
        console.log(`Move submitted: flipped tiles [${selected.join(', ')}]`);
        
        // Flip tiles
        selected.forEach(tileNum => {
            const tile = tiles[tileNum - 1];
            tile.userData.isUp = false;
            
            // Animate tile flipping
            let rotation = 0;
            const animateFlip = () => {
                if (rotation < Math.PI) {
                    tile.rotation.x += 0.1;
                    rotation += 0.1;
                    requestAnimationFrame(animateFlip);
                } else {
                    tile.rotation.x = Math.PI;
                    tile.material.color.setHex(0x555555);
                }
            };
            animateFlip();
        });
        
        selectedTiles.clear();
        updateSelectedTilesDisplay();
        updateUI();
        
        // Check if game is over after this move
        if (game.is_game_over()) {
            // Game is over - buttons will be disabled by updateUI()
            console.log('Game over after move submission');
        } else {
            // Move completed successfully - enable rolling for next turn
            document.getElementById('roll-btn').disabled = false;
            document.getElementById('submit-btn').disabled = true;
            console.log('Move completed - ready for next roll');
        }
    }
}

function resetGame() {
    game.reset();
    
    // Reset tiles
    tiles.forEach((tile, index) => {
        tile.rotation.x = 0;
        tile.userData.isUp = true;
        tile.material.color.setHex(0xffd700);
    });
    
    selectedTiles.clear();
    document.getElementById('roll-btn').disabled = false;
    document.getElementById('submit-btn').disabled = true;
    
    // Clear any game over messages
    const message = document.getElementById('message');
    message.textContent = '';
    message.style.color = '';
    
    updateSelectedTilesDisplay();
    updateUI();
    
    console.log('Game reset - new game started');
}

function updateUI() {
    const score = game.get_score();
    document.getElementById('score').textContent = `Score: ${score}`;
    
    const message = document.getElementById('message');
    if (game.is_game_over()) {
        if (score === 0) {
            message.textContent = '🎉 Congratulations! You shut the box! Perfect score!';
            message.style.color = '#4CAF50';
        } else {
            message.textContent = `💀 Game Over! No valid moves available. Final score: ${score}`;
            message.style.color = '#f44336';
        }
        document.getElementById('roll-btn').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        
        // Log final game state
        const upTiles = game.get_tiles().map((up, i) => up ? i + 1 : null).filter(x => x !== null);
        console.log(`Game ended with tiles still up: [${upTiles.join(', ')}]`);
        console.log(`Final score (sum of up tiles): ${score}`);
    } else {
        message.textContent = '';
        message.style.color = '';
    }
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 20;
    
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Splash screen and instructions functionality
function showSplashScreen() {
    document.getElementById('splash-screen').classList.remove('hidden');
    document.getElementById('game-container').style.display = 'none';
}

function hideSplashScreen() {
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('game-container').style.display = 'block';
}

function showInstructions() {
    document.getElementById('instructions-dialog').classList.remove('hidden');
}

function hideInstructions() {
    document.getElementById('instructions-dialog').classList.add('hidden');
}

// Detect if we're in a test environment
function isTestEnvironment() {
    // Check for wasm-bindgen-test indicators
    return typeof window !== 'undefined' && (
        window.location.href.includes('wasm-bindgen-test') ||
        window.__wbindgen_test_unstable ||
        document.title.includes('wasm-bindgen test runner') ||
        // Check for headless browser indicators
        navigator.webdriver === true ||
        window.navigator.userAgent.includes('HeadlessChrome')
    );
}

// Initialize the game but don't start it yet
async function initializeGame() {
    await init();
    game = new Game();
    initThreeJS();
    updateUI();
    
    // In test environment, skip splash screen and start immediately
    if (isTestEnvironment()) {
        console.log('Test environment detected - skipping splash screen');
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('splash-screen').style.display = 'none';
        resetGame(); // Ensure clean test state
    } else {
        // Hide the game initially and show splash screen for normal use
        document.getElementById('game-container').style.display = 'none';
    }
}

// Start the actual game
function startGame() {
    hideSplashScreen();
    resetGame(); // Reset to ensure clean state
}

// Event listeners for splash screen and instructions
document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('instructions-btn').addEventListener('click', showInstructions);
document.getElementById('instructions-close').addEventListener('click', hideInstructions);

// Keyboard event listener for ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideInstructions();
    }
});

// Click outside dialog to close
document.getElementById('instructions-dialog').addEventListener('click', function(event) {
    if (event.target === this) {
        hideInstructions();
    }
});

// Existing game event listeners
document.getElementById('roll-btn').addEventListener('click', rollDice);
document.getElementById('submit-btn').addEventListener('click', submitMove);
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Initialize game on load
initializeGame();