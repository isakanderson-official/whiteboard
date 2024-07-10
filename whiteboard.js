const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let erasing = false;
let currentLine = [];
const lines = [];
let strokeSize = 5;

let spacePressed = false;
let dragging = false;
let dragStart = { x: 0, y: 0 };
let canvasOffset = { x: 0, y: 0 };
let zoomLevel = 1;
const zoomFactor = 1.1; // Adjust this value to control zoom speed

// Function to adjust mouse coordinates based on the zoom level
const getAdjustedMouseCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Calculate mouse position relative to the canvas
  let mouseX = (e.clientX - rect.left) * scaleX;
  let mouseY = (e.clientY - rect.top) * scaleY;

  // Adjust mouse position for canvas offset
  mouseX -= canvasOffset.x;
  mouseY -= canvasOffset.y;

  // Adjust for zoom level
  // Calculate the center of the canvas
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Calculate the distance of the mouse from the center of the canvas
  let dx = mouseX - centerX;
  let dy = mouseY - centerY;

  // Adjust the distance by the zoom level
  dx /= zoomLevel;
  dy /= zoomLevel;

  // Calculate the new mouse position based on the adjusted distance
  mouseX = centerX + dx;
  mouseY = centerY + dy;

  // Return the adjusted coordinates
  return { x: mouseX, y: mouseY };
};

const startDrawing = (e) => {
  const { x, y } = getAdjustedMouseCoordinates(e);

  if (e.button === 2) {
    erasing = true;
    erase(e, x, y); // Pass adjusted coordinates to erase
  } else {
    drawing = true;
    currentLine = [{ x, y, size: strokeSize }];
  }
};

const stopDrawing = () => {
  if (drawing) {
    lines.push(currentLine);
  }
  drawing = false;
  erasing = false;
};

const draw = (e) => {
  if (!drawing) return;

  const { x, y } = getAdjustedMouseCoordinates(e);
  const point = { x, y, size: strokeSize };
  // Check if currentLine has points to compare with
  if (currentLine.length > 0) {
    const lastPoint = currentLine[currentLine.length - 1];
    const diffX = Math.abs(x - lastPoint.x);
    const diffY = Math.abs(y - lastPoint.y);

    // Only push the new point if it's more than 5 units away in x or y from the last point
    if (diffX > 1 || diffY > 1) {
      currentLine.push(point);
    }
  } else {
    // If currentLine is empty, push the new point
    currentLine.push(point);
  }
  redraw();
};

const erase = (e, x = null, y = null) => {
  if (!erasing) return;

  if (x === null || y === null) {
    ({ x, y } = getAdjustedMouseCoordinates(e));
  }

  const erasePoint = { x, y };
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isPointNearLine(erasePoint, lines[i])) {
      lines.splice(i, 1); // Remove the line if it intersects with the erase point
    }
  }
  redraw();
};

const isPointNearLine = (point, line) => {
  for (let i = 0; i < line.length - 1; i++) {
    const dist = distanceToSegment(point, line[i], line[i + 1]);
    if (dist < 10) {
      // Threshold distance to consider the point near the line
      return true;
    }
  }
  return false;
};

const distanceToSegment = (p, v, w) => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y))
  );
};

// Modify the redraw function to apply zoom
const redraw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save(); // Save the current context state

  // Apply the translation based on canvasOffset
  context.translate(canvasOffset.x, canvasOffset.y);

  // Calculate the center of the canvas
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Translate to the center, scale, and then translate back
  context.translate(centerX, centerY);
  context.scale(zoomLevel, zoomLevel);
  context.translate(-centerX, -centerY);

  lines.forEach((line) => {
    drawSmoothLine(line);
  });

  if (drawing) {
    drawSmoothLine(currentLine);
  }

  context.restore(); // Restore the context to its original state
};

// Step 3: Add a wheel event listener for zooming
canvas.addEventListener('wheel', (e) => {
  if (e.metaKey || e.ctrlKey) {
    // Check if Command key is pressed
    e.preventDefault(); // Prevent the page from scrolling
    if (e.deltaY < 0) {
      zoomLevel *= zoomFactor; // Zoom in
    } else {
      zoomLevel /= zoomFactor; // Zoom out
    }
    redraw();
  }
});

const drawSmoothLine = (line) => {
  if (line.length < 2) return;

  context.lineWidth = line[0].size;
  context.lineCap = 'round';
  context.strokeStyle = 'black';
  context.beginPath();
  context.moveTo(line[0].x, line[0].y);

  for (let i = 1; i < line.length - 2; i++) {
    const xc = (line[i].x + line[i + 1].x) / 2;
    const yc = (line[i].y + line[i + 1].y) / 2;
    context.quadraticCurveTo(line[i].x, line[i].y, xc, yc);
  }

  context.quadraticCurveTo(
    line[line.length - 2].x,
    line[line.length - 2].y,
    line[line.length - 1].x,
    line[line.length - 1].y
  );

  context.stroke();
};

const setStrokeSize = (size) => {
  strokeSize = size;
};

const startDragging = (e) => {
  if (spacePressed && e.button === 0) {
    // Left mouse button
    dragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    e.preventDefault(); // Prevent text selection
  }
};

const performDragging = (e) => {
  if (!dragging) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  // Update canvas offset
  canvasOffset.x += dx;
  canvasOffset.y += dy;

  // Update the starting point for the next move
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;

  // Function to actually move the canvas view
  moveCanvasView(canvasOffset.x, canvasOffset.y);
};

const stopDragging = () => {
  dragging = false;
};

// Implement this function based on how your canvas is rendered
function moveCanvasView(x, y) {
  console.log('moving canvas view');
  canvasOffset.x = x;
  canvasOffset.y = y;
  redraw();
  // Adjust the canvas view based on x and y offsets
}

canvas.addEventListener('mousedown', (e) => {
  if (spacePressed) {
    startDragging(e);
  } else {
    // Existing logic for drawing/erasing
    startDrawing(e);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (spacePressed) {
    stopDragging();
  } else {
    // Existing logic for drawing/erasing
    stopDrawing();
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (spacePressed) {
    performDragging(e);
    return;
  }
  if (erasing) {
    erase(e);
  } else {
    draw(e);
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent the context menu from appearing

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    spacePressed = true;
    e.preventDefault(); // Prevent the default space bar action (page scroll)
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spacePressed = false;
  }
});
