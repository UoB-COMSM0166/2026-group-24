let mode = 'brush';
let colorPicker, brushSizeSlider, fillCheckbox;
let canvas, pg;
let startX, startY;
let inpW, inpH;
let buttons = {};
let history = [];
let maxHistory = 20;

function setup() {
  // --- UI Container ---
  let mainWrapper = createDiv().style('display', 'flex').style('justify-content', 'center').style('align-items', 'flex-start').style('min-height', '100vh');
  let mainContainer = createDiv().parent(mainWrapper).style('display', 'flex').style('font-family', 'sans-serif').style('background', '#f0f2f5').style('padding', '20px').style('border-radius', '12px').style('margin', '20px');
  
  // --- SIDEBAR ---
  let sidebar = createDiv().parent(mainContainer).style('display', 'flex').style('flex-direction', 'column').style('gap', '10px').style('padding-right', '20px').style('border-right', '1px solid #ddd');
  
  createLabel('TOOLS', sidebar);
  buttons.brush = createStyledBtn('🖌️ Brush', () => mode = 'brush', sidebar);
  buttons.eraser = createStyledBtn('🧽 Eraser', () => mode = 'eraser', sidebar);
  buttons.rect = createStyledBtn('⬜ Rect', () => mode = 'rect', sidebar);
  buttons.ellipse = createStyledBtn('⭕ Circle', () => mode = 'ellipse', sidebar);
  buttons.triangle = createStyledBtn('🔺 Triangle', () => mode = 'triangle', sidebar);
  
  sidebar.child(createElement('hr').style('width', '100%'));
  createStyledBtn('↩️ Undo', undoAction, sidebar, '#8c8c8c');
  createStyledBtn('🗑️ Clear', clearCanvas, sidebar, '#ff4d4f');
  createStyledBtn('💾 Save', () => saveCanvas(canvas, 'my_art', 'png'), sidebar, '#52c41a');

  // --- TOP BAR & CANVAS ---
  let rightCol = createDiv().parent(mainContainer).style('display', 'flex').style('flex-direction', 'column').style('gap', '15px').style('padding-left', '20px');
  let topBar = createDiv().parent(rightCol).style('display', 'flex').style('gap', '20px').style('align-items', 'center').style('background', '#fff').style('padding', '10px 20px').style('border-radius', '8px').style('box-shadow', '0 2px 4px rgba(0,0,0,0.05)');
  
  topBar.child(createSpan('<b>Size:</b> '));
  brushSizeSlider = createSlider(1, 100, 5).parent(topBar);
  colorPicker = createColorPicker('#000000').parent(topBar);
  fillCheckbox = createCheckbox(' Fill Shape', false).parent(topBar);
  
  topBar.child(createSpan(' | <b>Canvas:</b> '));
  inpW = createInput('800').size(40).parent(topBar);
  inpH = createInput('500').size(40).parent(topBar);
  createButton('Resize').mousePressed(resizeBoard).parent(topBar);

  let canvasFrame = createDiv().parent(rightCol).style('border', '2px solid #ccc').style('box-shadow', '0 10px 30px rgba(0,0,0,0.1)');
  canvas = createCanvas(800, 500).parent(canvasFrame);
  
  // 禁止画布右键菜单
  canvas.elt.oncontextmenu = () => false;

  createGraphicsLayer(800, 500);
  saveHistory();
}

function draw() {
  background(240);
  image(pg, 0, 0);
  updateButtonStyles();

  if (mouseInCanvas()) {
    let sz = brushSizeSlider.value();
    let col = colorPicker.color();

    // 画笔预览
    noFill();
    stroke(mouseIsPressed && mouseButton === RIGHT ? 200 : col); // 右键预览变灰色
    strokeWeight(1);
    ellipse(mouseX, mouseY, sz);

    if (mouseIsPressed) {
      // 1. 右键擦除逻辑 (优先级最高)
      if (mouseButton === RIGHT) {
        pg.stroke(255);
        pg.strokeWeight(sz);
        pg.line(pmouseX, pmouseY, mouseX, mouseY);
      } 
      // 2. 左键常规模式
      else if (mouseButton === LEFT) {
        if (mode === 'brush') {
          pg.stroke(col);
          pg.strokeWeight(sz);
          pg.line(pmouseX, pmouseY, mouseX, mouseY);
        } else if (mode === 'eraser') {
          pg.stroke(255);
          pg.strokeWeight(sz);
          pg.line(pmouseX, pmouseY, mouseX, mouseY);
        } else if (['rect', 'ellipse', 'triangle'].includes(mode)) {
          // 形状实时预览
          noFill(); stroke(col); strokeWeight(2);
          if (mode === 'rect') rect(startX, startY, mouseX - startX, mouseY - startY);
          else if (mode === 'ellipse') ellipse(startX + (mouseX - startX)/2, startY + (mouseY - startY)/2, mouseX - startX, mouseY - startY);
          else if (mode === 'triangle') triangle(startX, startY, mouseX, startY, (startX + mouseX) / 2, mouseY);
        }
      }
    }
  }
}

// --- 鼠标滚轮调节笔触大小 ---
function mouseWheel(event) {
  if (mouseInCanvas()) {
    let currentVal = brushSizeSlider.value();
    // 向上滚动 event.delta 为负，减小数值；向下为正，增加数值
    // 我们将其反转以符合直觉：向上推滚轮变大
    let newVal = currentVal - (event.delta / 10);
    brushSizeSlider.value(constrain(newVal, 1, 100));
    return false; // 防止页面跟随滚动
  }
}

function mousePressed() {
  if (mouseInCanvas()) {
    startX = mouseX;
    startY = mouseY;
  }
}

function mouseReleased() {
  if (!mouseInCanvas()) return;
  
  // 如果是右键结束，或者普通画笔模式，直接存历史
  if (mouseButton === RIGHT || mode === 'brush' || mode === 'eraser') {
    saveHistory();
    return;
  }

  // 形状绘制确认
  let col = colorPicker.color();
  let sz = brushSizeSlider.value();
  pg.stroke(col); pg.strokeWeight(sz);
  if (fillCheckbox.checked()) pg.fill(col); else pg.noFill();

  if (mode === 'rect') pg.rect(startX, startY, mouseX - startX, mouseY - startY);
  else if (mode === 'ellipse') pg.ellipse(startX + (mouseX - startX)/2, startY + (mouseY - startY)/2, mouseX - startX, mouseY - startY);
  else if (mode === 'triangle') pg.triangle(startX, startY, mouseX, startY, (startX + mouseX) / 2, mouseY);
  
  saveHistory();
}

// --- 后台功能函数 ---
function saveHistory() {
  history.push(pg.get());
  if (history.length > maxHistory) history.shift();
}

function undoAction() {
  if (history.length > 1) {
    history.pop();
    pg.image(history[history.length - 1], 0, 0);
  }
}

function clearCanvas() { pg.background(255); saveHistory(); }

function createGraphicsLayer(w, h) { pg = createGraphics(w, h); pg.background(255); }

function resizeBoard() {
  let newW = int(inpW.value());
  let newH = int(inpH.value());
  if (newW > 0 && newH > 0) {
    resizeCanvas(newW, newH);
    createGraphicsLayer(newW, newH);
    history = []; saveHistory();
  }
}

function createStyledBtn(label, func, parent, bg = '#fff') {
  let btn = createButton(label).parent(parent).mousePressed(func);
  btn.style('padding', '10px').style('border', '1px solid #d9d9d9').style('border-radius', '6px').style('cursor', 'pointer').style('background', bg);
  if (bg !== '#fff') btn.style('color', '#fff');
  return btn;
}

function updateButtonStyles() {
  for (let m in buttons) {
    buttons[m].style('background', (m === mode) ? '#1890ff' : '#fff');
    buttons[m].style('color', (m === mode) ? '#fff' : '#000');
  }
}

function createLabel(txt, parent) {
  createSpan(txt).parent(parent).style('font-size', '12px').style('font-weight', 'bold').style('color', '#888');
}

function mouseInCanvas() { return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height; }
