// src/core/GameStory.js
// 游戏剧情管理模块

export class GameStory {
  // 故事内容定义
  static STORIES = {
    INTRO: {
      title: '老向导',
      type: 'segmented',
      avatar: 'elder',
      segments: [
        {
          text: 'In the farthest reaches of the western frontier lies a forgotten woodland known as the Lost\n Forest. Once, it was the busiest trade route in the region, where merchant caravans traveled safely along sunlit paths. Villages flourished along its borders, thriving on trade and prosperity.',
          backgroundImage: 'outset1'
        },
        {
          text: 'But everything changed several months ago. Villagers were the first to notice the signs—deep within the forest, a massive tree appeared where none had ever stood before. Twisted, black, and ancient, it seemed to rise from the very depths of the earth itself. Soon, it came to be known as the Dark Tree...',
          backgroundImage: 'outset2'
        }
      ]
    }
  };

  constructor(ui) {
    this.ui = ui;
    this.currentStory = null;
  }

  /**
   * 显示故事
   * @param {string} storyKey - 故事键名
   * @param {Function} onNext - 故事完成的回调
   */
  showStory(storyKey = 'INTRO', onNext = null) {
    const story = GameStory.STORIES[storyKey];
    if (!story) {
      console.warn(`Story "${storyKey}" not found`);
      if (onNext) onNext();
      return;
    }

    this.currentStory = storyKey;
    
    // 支持分段故事
    if (story.type === 'segmented' && story.segments) {
      this.ui.showSegmentedStory(story.title, story.segments, onNext, story.avatar);
    } else {
      this.ui.showStoryScreen(story.title, story.text, onNext);
    }
  }

  /**
   * 隐藏故事
   */
  hideStory() {
    this.ui.hideStoryScreen();
    this.currentStory = null;
  }

  /**
   * 添加新的故事
   * @param {string} key - 故事键名
   * @param {string} title - 故事标题
   * @param {string} text - 故事内容
   */
  static addStory(key, title, text) {
    GameStory.STORIES[key] = { title, text };
  }

  /**
   * 获取所有可用的故事
   */
  static getAvailableStories() {
    return Object.keys(GameStory.STORIES);
  }
}
