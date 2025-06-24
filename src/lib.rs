use wasm_bindgen::prelude::*;
use rand::Rng;

#[wasm_bindgen]
pub struct Game {
    tiles: Vec<bool>, // true = up, false = down
    current_sum: u8,
    dice1: u8,
    dice2: u8,
    game_over: bool,
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        Game {
            tiles: vec![true; 9], // tiles 1-9 all start up
            current_sum: 0,
            dice1: 0,
            dice2: 0,
            game_over: false,
        }
    }

    pub fn roll_dice(&mut self) -> Vec<u8> {
        if self.game_over {
            return vec![self.dice1, self.dice2];
        }

        let mut rng = rand::thread_rng();
        
        // Check how many tiles are up
        let up_tiles: Vec<usize> = self.tiles.iter()
            .enumerate()
            .filter(|(_, &up)| up)
            .map(|(i, _)| i + 1)
            .collect();
        
        // If only tiles 1-6 are up, use one die
        let use_one_die = up_tiles.iter().all(|&t| t <= 6);
        
        if use_one_die {
            self.dice1 = rng.gen_range(1..=6);
            self.dice2 = 0;
        } else {
            self.dice1 = rng.gen_range(1..=6);
            self.dice2 = rng.gen_range(1..=6);
        }
        
        self.current_sum = self.dice1 + self.dice2;
        
        // Check if any valid moves exist
        if !self.has_valid_moves() {
            self.game_over = true;
        }
        
        vec![self.dice1, self.dice2]
    }

    pub fn flip_tile(&mut self, tile: usize) -> bool {
        if tile < 1 || tile > 9 || !self.tiles[tile - 1] {
            return false;
        }
        
        self.tiles[tile - 1] = false;
        true
    }

    pub fn is_valid_move(&self, tiles: Vec<usize>) -> bool {
        if self.game_over || self.current_sum == 0 {
            return false;
        }
        
        // Check all tiles are up
        for &tile in &tiles {
            if tile < 1 || tile > 9 || !self.tiles[tile - 1] {
                return false;
            }
        }
        
        // Check sum matches current dice sum
        let sum: usize = tiles.iter().sum();
        sum == self.current_sum as usize
    }

    pub fn make_move(&mut self, tiles: Vec<usize>) -> bool {
        if !self.is_valid_move(tiles.clone()) {
            return false;
        }
        
        for tile in tiles {
            self.flip_tile(tile);
        }
        
        self.current_sum = 0;
        
        // Check if all tiles are down (win condition)
        if self.tiles.iter().all(|&t| !t) {
            self.game_over = true;
        }
        
        true
    }

    pub fn get_tiles(&self) -> Vec<u8> {
        self.tiles.iter().map(|&up| if up { 1 } else { 0 }).collect()
    }

    pub fn get_score(&self) -> u32 {
        self.tiles.iter()
            .enumerate()
            .filter(|(_, &up)| up)
            .map(|(i, _)| (i + 1) as u32)
            .sum()
    }

    pub fn is_game_over(&self) -> bool {
        self.game_over
    }

    pub fn get_current_sum(&self) -> u8 {
        self.current_sum
    }

    pub fn set_dice_values(&mut self, die1: u8, die2: u8) {
        self.dice1 = die1;
        self.dice2 = die2;
        self.current_sum = die1 + die2;
        
        // Check if any valid moves exist
        if !self.has_valid_moves() {
            self.game_over = true;
        }
    }

    pub fn reset(&mut self) {
        self.tiles = vec![true; 9];
        self.current_sum = 0;
        self.dice1 = 0;
        self.dice2 = 0;
        self.game_over = false;
    }

    fn has_valid_moves(&self) -> bool {
        if self.current_sum == 0 {
            return true;
        }
        
        let up_tiles: Vec<usize> = self.tiles.iter()
            .enumerate()
            .filter(|(_, &up)| up)
            .map(|(i, _)| i + 1)
            .collect();
        
        // Check single tiles
        for &tile in &up_tiles {
            if tile == self.current_sum as usize {
                return true;
            }
        }
        
        // Check combinations of 2 tiles
        for i in 0..up_tiles.len() {
            for j in i+1..up_tiles.len() {
                if up_tiles[i] + up_tiles[j] == self.current_sum as usize {
                    return true;
                }
            }
        }
        
        // Check combinations of 3+ tiles
        for combo_size in 3..=up_tiles.len() {
            if self.check_combinations(&up_tiles, combo_size, self.current_sum as usize) {
                return true;
            }
        }
        
        false
    }

    fn check_combinations(&self, tiles: &[usize], size: usize, target: usize) -> bool {
        if size == 0 {
            return target == 0;
        }
        if tiles.is_empty() || target == 0 {
            return false;
        }
        
        // Include first tile
        if tiles[0] <= target && self.check_combinations(&tiles[1..], size - 1, target - tiles[0]) {
            return true;
        }
        
        // Exclude first tile
        self.check_combinations(&tiles[1..], size, target)
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    web_sys::console::log_1(&"Shut the Box WASM module loaded!".into());
}