// src/core/GameStory.js
// Game story management module

export class GameStory {
  // Story content definition
  static STORIES = {
    INTRO: {
      title: 'Elder Guide',
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
   * Show story
   * @param {string} storyKey - Story key
   * @param {Function} onNext - Callback when story is finished
   */
  showStory(storyKey = 'INTRO', onNext = null) {
    const story = GameStory.STORIES[storyKey];
    if (!story) {
      console.warn(`Story "${storyKey}" not found`);
      if (onNext) onNext();
      return;
    }

    this.currentStory = storyKey;
    
    // Support segmented stories
    if (story.type === 'segmented' && story.segments) {
      this.ui.showSegmentedStory(story.title, story.segments, onNext, story.avatar);
    } else {
      this.ui.showStoryScreen(story.title, story.text, onNext);
    }
  }

  /**
   * Hide story
   */
  hideStory() {
    this.ui.hideStoryScreen();
    this.currentStory = null;
  }

  /**
   * Add a new story
   * @param {string} key - Story key
   * @param {string} title - Story title
   * @param {string} text - Story content
   */
  static addStory(key, title, text) {
    GameStory.STORIES[key] = { title, text };
  }

  /**
   * Get all available stories
   */
  static getAvailableStories() {
    return Object.keys(GameStory.STORIES);
  }
}
