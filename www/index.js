/*
 * Logistics
 */

// Import the WebAssembly memory at the top of the file.
import { memory } from "conways/conways_bg";
import { Universe } from "conways";

const CELL_SIZE = 10; // px
const GRID_COLOR = "#333333";
const DEAD_COLOR = "#000000";
const ALIVE_COLOR = "#20C20E";

// Construct the universe, and get its width and height.
const universe = Universe.new();

let width = universe.width();
let height = universe.height();

let animationId = null;

const isPaused = () => {
  return animationId === null;
};

const fps = new class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = 1 / delta * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
  }
};

/* 
 * Input setup
 */

// Generation counter
const genCounter = document.getElementById("gen");
genCounter.textContent = 0;

// File map
const mapUpload = document.getElementById("map");
mapUpload.addEventListener('change', event => {
  var files = event.target.files; // FileList object

  // use the 1st file from the list
  let f = files[0];

  var reader = new FileReader();

  // Closure to capture the file information.
  reader.onload = ((file) => {
    return function(e) {
      pause();
      universe.clear();

      universe.import_file(e.target.result);

      width = universe.width();
      height = universe.height();
      // setup canvas
      canvas.height = (CELL_SIZE + 1) * height + 1;
      canvas.width = (CELL_SIZE + 1) * width + 1;

      play();
      pause();
      

    };
  })(f);

  // Read in the image file as a data URL.
  reader.readAsText(f);
})

// Size
const sizeInput = document.getElementById("size");
sizeInput.value = 64;

sizeInput.addEventListener("input", event => {
  pause();
  let newsize = sizeInput.value / 5 + 64;

  // Update canvas
  width = newsize;
  height = newsize;


  // setup canvas
  canvas.height = (CELL_SIZE + 1) * height + 1;
  canvas.width = (CELL_SIZE + 1) * width + 1;

  // Update univsers
  universe.set_width(newsize);
  universe.set_height(newsize);

  universe.clear();
  play();
  genCounter.value = 0;
  pause();
})


// Speed slider
const speedRange = document.getElementById("speed");
speedRange.value = 1;

// Play / Pause button
const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", event => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

// Clear button
const clearButton = document.getElementById("clear");
clearButton.addEventListener("click", event => {
  pause();
  universe.clear();
  play();
  pause();
  genCounter.textContent = 0;
});

// Random button
const randomButton = document.getElementById("random");
randomButton.addEventListener("click", event => {
  pause();
  universe.random();
  play();
  genCounter.textContent = 0;

});

/* 
 * Rendering for canvas
 */

// Grab canvas to render on
let canvas = document.getElementById("game-of-life-canvas");

// setup canvas
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

// TODO Implement WebGL
const ctx = canvas.getContext('2d');

canvas.addEventListener("click", event => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  if (event.shiftKey) {
    // Create a glider
    console.log("Glider")
    universe.set_cell(row, col, true);
    universe.set_cell(row, col, false);
    universe.set_cell(row + 1, col, true);
    universe.set_cell(row - 1, col, true);
    universe.set_cell(row, col + 1, true);
    universe.set_cell(row - 1, col - 1, true);
    universe.set_cell(row - 1, col + 1, true);

  }
  else if (event.ctrlKey) {
    // Create a pulsar
    console.log("Pulsar")
    // TODO Implement pulsar
  }
  else {
    // set cell
    console.log("toggle")
    universe.toggle_cell(row, col);
  }

  drawGrid();
  drawCells();
});

/*
 * Game code
 */

// Create grid 
const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};


const getIndex = (row, column) => {
  return row * width + column;
};


const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << (n % 8);
  return (arr[byte] & mask) === mask;
};

// Draw cells on canvas
const drawCells = () => {
  const cellsPtr = universe.cells();

  // This is updated!
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height / 8);

  ctx.beginPath();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);

      // This is updated!
      ctx.fillStyle = bitIsSet(idx, cells)
        ? ALIVE_COLOR
        : DEAD_COLOR;

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // Alive cells.
  ctx.fillStyle = ALIVE_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (!bitIsSet(idx, cells)) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // Dead cells.
  ctx.fillStyle = DEAD_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (bitIsSet(idx,cells)) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }
  ctx.stroke();
};


// Render loop
const renderLoop = () => {
  fps.render();

  // console.log(speedRange.value / 10);
  for (let i = 0; i <= speedRange.value / 10; i++) {
    genCounter.textContent++;
    // console.log("ticking")
    universe.tick();
  }
  drawGrid();
  drawCells();
  animationId = requestAnimationFrame(renderLoop);
};


// Render initial unverse
play();

