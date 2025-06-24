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

impl Default for Game {
    fn default() -> Self {
        Self::new()
    }
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
        if !(1..=9).contains(&tile) || !self.tiles[tile - 1] {
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
            if !(1..=9).contains(&tile) || !self.tiles[tile - 1] {
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
            if Self::check_combinations(&up_tiles, combo_size, self.current_sum as usize) {
                return true;
            }
        }
        
        false
    }

    fn check_combinations(tiles: &[usize], size: usize, target: usize) -> bool {
        if size == 0 {
            return target == 0;
        }
        if tiles.is_empty() || target == 0 {
            return false;
        }
        
        // Include first tile
        if tiles[0] <= target && Self::check_combinations(&tiles[1..], size - 1, target - tiles[0]) {
            return true;
        }
        
        // Exclude first tile
        Self::check_combinations(&tiles[1..], size, target)
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    web_sys::console::log_1(&"Shut the Box WASM module loaded!".into());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_game() {
        let game = Game::new();
        assert_eq!(game.get_tiles(), vec![1; 9]);
        assert_eq!(game.get_score(), 45); // 1+2+3+4+5+6+7+8+9
        assert!(!game.is_game_over());
        assert_eq!(game.get_current_sum(), 0);
    }

    #[test]
    fn test_default() {
        let game = Game::default();
        assert_eq!(game.get_tiles(), vec![1; 9]);
        assert_eq!(game.get_score(), 45);
    }

    #[test]
    fn test_flip_tile() {
        let mut game = Game::new();
        
        // Valid tile flip
        assert!(game.flip_tile(5));
        let tiles = game.get_tiles();
        assert_eq!(tiles[4], 0); // tile 5 should be down
        
        // Invalid flips
        assert!(!game.flip_tile(0)); // out of range
        assert!(!game.flip_tile(10)); // out of range
        assert!(!game.flip_tile(5)); // already down
    }

    #[test]
    fn test_valid_moves() {
        let mut game = Game::new();
        game.set_dice_values(3, 4); // sum = 7
        
        // Valid single tile
        assert!(game.is_valid_move(vec![7]));
        
        // Valid combination
        assert!(game.is_valid_move(vec![3, 4]));
        assert!(game.is_valid_move(vec![1, 2, 4]));
        
        // Invalid moves
        assert!(!game.is_valid_move(vec![8])); // wrong sum
        assert!(!game.is_valid_move(vec![1, 2])); // wrong sum
        assert!(!game.is_valid_move(vec![0])); // invalid tile
        assert!(!game.is_valid_move(vec![10])); // invalid tile
    }

    #[test]
    fn test_make_move() {
        let mut game = Game::new();
        game.set_dice_values(2, 3); // sum = 5
        
        // Valid move
        assert!(game.make_move(vec![5]));
        assert_eq!(game.get_tiles()[4], 0); // tile 5 down
        assert_eq!(game.get_current_sum(), 0); // sum reset
        
        // Invalid move after tile is down
        game.set_dice_values(2, 3); // sum = 5 again
        assert!(!game.make_move(vec![5])); // tile already down
    }

    #[test]
    fn test_win_condition() {
        let mut game = Game::new();
        
        // Flip all tiles except the last one
        for i in 1..=8 {
            game.flip_tile(i);
        }
        assert!(!game.is_game_over());
        
        // Flip last tile - should trigger win
        game.set_dice_values(4, 5); // sum = 9
        assert!(game.make_move(vec![9]));
        assert!(game.is_game_over());
        assert_eq!(game.get_score(), 0);
    }

    #[test]
    fn test_dice_logic() {
        let mut game = Game::new();
        
        // With all tiles up (including 7, 8, 9), should use two dice
        let dice = game.roll_dice();
        assert!(dice[1] > 0); // second die should be used
        
        // Flip tiles 7, 8, 9 - tiles 1-6 remain, should use one die
        game.flip_tile(7);
        game.flip_tile(8);
        game.flip_tile(9);
        
        let dice = game.roll_dice();
        assert_eq!(dice[1], 0); // second die should be 0
        assert!(dice[0] >= 1 && dice[0] <= 6);
        
        // Test edge case: flip some low tiles but keep one high tile
        let mut game2 = Game::new();
        for i in 1..=6 {
            game2.flip_tile(i);
        }
        // Only tiles 7, 8, 9 remain - should use two dice
        let dice = game2.roll_dice();
        assert!(dice[1] > 0); // second die should be used
    }

    #[test]
    fn test_game_over_detection() {
        let mut game = Game::new();
        
        // Set up a scenario where no moves are possible
        // Flip tiles to leave only 9 up, then roll a low sum
        for i in 1..=8 {
            game.flip_tile(i);
        }
        
        game.set_dice_values(1, 1); // sum = 2, but only tile 9 is up
        assert!(game.is_game_over()); // Should detect no valid moves
    }

    #[test]
    fn test_reset() {
        let mut game = Game::new();
        
        // Make some changes
        game.set_dice_values(3, 4);
        game.make_move(vec![7]);
        
        // Reset and verify
        game.reset();
        assert_eq!(game.get_tiles(), vec![1; 9]);
        assert_eq!(game.get_score(), 45);
        assert!(!game.is_game_over());
        assert_eq!(game.get_current_sum(), 0);
    }

    #[test]
    fn test_score_calculation() {
        let mut game = Game::new();
        
        // Initial score
        assert_eq!(game.get_score(), 45);
        
        // Flip some tiles
        game.flip_tile(1);
        game.flip_tile(9);
        assert_eq!(game.get_score(), 35); // 45 - 1 - 9 = 35
        
        // Flip more
        game.flip_tile(5);
        assert_eq!(game.get_score(), 30); // 35 - 5 = 30
    }

    #[test]
    fn test_complex_combinations() {
        let mut game = Game::new();
        game.set_dice_values(6, 6); // sum = 12
        
        // Test various valid combinations that sum to 12
        assert!(game.is_valid_move(vec![1, 2, 9])); // 1+2+9=12
        assert!(game.is_valid_move(vec![3, 4, 5])); // 3+4+5=12
        assert!(game.is_valid_move(vec![1, 2, 3, 6])); // 1+2+3+6=12
        
        // Invalid combinations
        assert!(!game.is_valid_move(vec![1, 2, 8])); // 1+2+8=11
        assert!(!game.is_valid_move(vec![7, 6])); // 7+6=13
    }
}