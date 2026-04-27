// src/core/Inputhandler.js
export class InputHandler {
  constructor(canvas, camera, getMap, gameController) {
    this.canvas = canvas;
    this.camera = camera;
    // 支持传入函数以获取最新 map（地图在游戏过程中可能被替换）
    this.getMap = typeof getMap === 'function' ? getMap : () => getMap;
    this.gameController = gameController;

    this.mouseDownPos = { x: 0, y: 0 };
    this.DRAG_THRESHOLD = 5;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onEndTurn = this._onEndTurn.bind(this);
    
    // 【新增】绑定键盘事件处理函数的上下文，确保 this 指向正确
    this._onKeyDown = this._onKeyDown.bind(this); 
  }

  bind(endTurnBtn) {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    // passive: false 让我们能调用 preventDefault() 阻止页面滚动
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    
    // 【新增】注册全局键盘按下事件
    window.addEventListener('keydown', this._onKeyDown);

    if (endTurnBtn) {
      this.endTurnBtn = endTurnBtn;
      endTurnBtn.addEventListener('click', this._onEndTurn);
    }
  }

  unbind() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    
    // 【新增】卸载全局键盘事件，防止内存泄漏和重复触发
    window.removeEventListener('keydown', this._onKeyDown);

    if (this.endTurnBtn) {
      this.endTurnBtn.removeEventListener('click', this._onEndTurn);
    }
  }

  // 【新增】键盘输入的具体处理逻辑
  _onKeyDown(e) {
    // 安全检查：如果玩家正在输入框里打字 (比如起名字、聊天)，则不触发结束回合
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    
    // 监听空格键
    if (e.code === 'Space') {
      e.preventDefault(); // 阻止浏览器按下空格时默认向下滚动网页的行为
      this._onEndTurn();  // 直接调用现成的结束回合方法
    }
  }

  _onMouseDown(e) {
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.camera.startDragging(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    if (this.camera.isDragging) {
      this.camera.drag(e.clientX, e.clientY);
    }
  }

  _onMouseUp(e) {
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.camera.stopDragging();

    // 移动距离未超过阈值才视为点击
    if (dist < this.DRAG_THRESHOLD) {
      const map = this.getMap();
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      const { q, r } = map.pixelToHex(world.x, world.y);
      if (map.getTile(q, r)) {
        this.gameController.movePlayer(q, r);
      }
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    // deltaY > 0 = 向下滚动 = 缩小；deltaY < 0 = 向上滚动 = 放大
    this.camera.zoomAt(cx, cy, -e.deltaY);
  }

  _onEndTurn() {
    this.gameController.onEndTurnBtnClick();
  }
}