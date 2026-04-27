// src/core/StateMachine.js
export class StateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this._previousState = null;  // ← 记录前一个状态
    this.states = {};
  }

  addState(name, { enter, exit }) {
    this.states[name] = { enter, exit };
  }

  transition(newState, data) {
    if (this.states[this.currentState] && this.states[this.currentState].exit) {
      this.states[this.currentState].exit();
    }

    console.log(`State Transition: ${this.currentState} -> ${newState}`);
    this._previousState = this.currentState;  // ← 保存前一个状态
    this.currentState = newState;

    if (this.states[newState] && this.states[newState].enter) {
      this.states[newState].enter(data);
    }
  }
}