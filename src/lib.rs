mod utils;
use web_sys;
use js_sys;

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

/// Set default width and height of universe
const SIZE: u32 = 64;
const DEBUG: bool = false;

use cfg_if::cfg_if;
use wasm_bindgen::prelude::*;
use fixedbitset::FixedBitSet;

cfg_if::cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}
use web_sys::console;

pub struct Timer<'a> {
    name: &'a str,
}

impl<'a> Timer<'a> {
    pub fn new(name: &'a str) -> Timer<'a> {
        console::time_with_label(name);
        Timer { name }
    }
}

impl<'a> Drop for Timer<'a> {
    fn drop(&mut self) {
        console::time_end_with_label(self.name);
    }
}

/// Cell enum, used to easially count nearby cells
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    /// Dead cell
    Dead = 0,
    /// Alive cell
    Alive = 1,
}

/// Universe struct we use a linear vector instead of a double one
#[wasm_bindgen]
pub struct Universe {
    /// Width of a given universe
    width: u32,
    /// Height of a given universe
    height: u32,
    /// Linear vector of cells, each row ends at width * n, whereas n = row
    cells: FixedBitSet,
}

/// Exported to JS
#[wasm_bindgen]
impl Universe {
    /// Create a new universe with a default size (i.e. 64 x 64) and pattern
    pub fn new() -> Universe {
        utils::set_panic_hook();

        let width = SIZE;
        let height = SIZE;

        // Set size
        let size = (width * height) as usize;
        let mut cells = FixedBitSet::with_capacity(size);

        for i in 0..size {
            // Generate inital world
            cells.set(i, i % 2 == 0 || i % 7 == 0);
        }


        Universe {
            width,
            height,
            cells,
        }
    }

    /// Clear universe
    pub fn clear(&mut self){
        let size = (self.width * self.height) as usize;
        self.cells = FixedBitSet::with_capacity(size);
    }

    /// Clears universe and creates a new random state
    pub fn random(&mut self){
        let size = (self.width * self.height) as usize;
        self.cells = FixedBitSet::with_capacity(size);

        for i in 0..size {
            let random_boolean = js_sys::Math::random() >= 0.5;
            self.cells.set(i, random_boolean);
        }
    }


    /// Set a cell
    pub fn set_cell(&mut self, row: u32, column: u32, alive: bool) {
        let idx = self.get_index(row, column);
        self.cells.set(idx, alive);

    }

    /// Toggle a cell
    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = self.get_index(row, column);
        let cell = self.cells[idx];
        self.cells.set(idx, !cell);
    }

    /// Set the width of the universe.
    ///
    /// Resets all cells to the dead state.
    pub fn set_width(&mut self, width: u32) {
        self.width = width;
        self.clear()
    }

    /// Set the height of the universe.
    ///
    /// Resets all cells to the dead state.
    pub fn set_height(&mut self, height: u32) {
        self.height = height;
        self.clear()
    }

    /// Returns the width of the universe
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Returns the height of the universe
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Returns a pointer to the cells
    pub fn cells(&self) -> *const u32 {
        self.cells.as_slice().as_ptr()
    }

    /// Get index in the linear array
    fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }

    /// Get count of neighbors next to given coordinates
    fn live_neighbor_count(&self, row: u32, column: u32) -> u8 {
        let mut count = 0;

        let north = if row == 0 {
            self.height - 1
        } else {
            row - 1
        };

        let south = if row == self.height - 1 {
            0
        } else {
            row + 1
        };

        let west = if column == 0 {
            self.width - 1
        } else {
            column - 1
        };

        let east = if column == self.width - 1 {
            0
        } else {
            column + 1
        };

        let nw = self.get_index(north, west);
        count += self.cells[nw] as u8;

        let n = self.get_index(north, column);
        count += self.cells[n] as u8;

        let ne = self.get_index(north, east);
        count += self.cells[ne] as u8;

        let w = self.get_index(row, west);
        count += self.cells[w] as u8;

        let e = self.get_index(row, east);
        count += self.cells[e] as u8;

        let sw = self.get_index(south, west);
        count += self.cells[sw] as u8;

        let s = self.get_index(south, column);
        count += self.cells[s] as u8;

        let se = self.get_index(south, east);
        count += self.cells[se] as u8;

        count
    }

    /// Run a tick of the simulation
    pub fn tick(&mut self) {
        if DEBUG {
            let _timer = Timer::new("Universe::tick");
        }
        let mut next = self.cells.clone();


        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbors = self.live_neighbor_count(row, col);

                // This KILLS preformance
                // log!( "cell[{}, {}] is initially {:?} and has {} live neighbors", row, col, cell, live_neighbors);

                next.set(idx, match (cell, live_neighbors) {
                    (true, x) if x < 2 => false,
                    (true, 2) | (true, 3) => true,
                    (true, x) if x > 3 => false,
                    (false, 3) => true,
                    (otherwise, _) => otherwise
                });
            }
        }

        self.cells = next;

    }

    /// Import a file via a string
    pub fn import_file(&mut self, file: &str) {
        // Clear field
        self.clear();

        // Get width
        let width = file.chars().position(|r| r == '\n').unwrap_or(101) - 1;
        let size = (width * width) as usize;

        self.cells = FixedBitSet::with_capacity(size);

        if DEBUG {
            log!("Width of map: {}\nSize: {}", width, size);
            log!("Cells:\nLen: {}", self.cells.len());
        }



        self.set_height(width as u32);
        self.set_width(width as u32);

        let mut counter = 0;
        for chr in file.chars().into_iter() {
            // log!("{}", counter);
            if chr == '#'{
                self.cells.set(counter, true);
                counter = counter + 1;
            }
            else if chr == '.' {
                self.cells.set(counter, false);
                counter = counter + 1;
            }
        }


    }

}

impl Universe {
    /// Get the dead and alive values of the entire universe.
    pub fn get_cells(&self) -> &[u32] {
        &self.cells.as_slice()
    }

    /// Set cells to be alive in a universe by passing the row and column
    /// of each cell as an array.
    pub fn set_cells(&mut self, cells: &[(u32, u32)]) {
        for (row, col) in cells.iter().cloned() {
            let idx = self.get_index(row, col);
            self.cells.set(idx, true);
        }
    }
}

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet(s: &str) {
    alert(&format!("Hello, {}!",s));
}

