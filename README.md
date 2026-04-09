# 2026-group-24
2026 COMSM0166 group 24

# COMSM0166 Project Template
A project template for the Software Engineering Discipline and Practice module (COMSM0166).

## Info

This is the template for your group project repo/report. We'll be setting up your repo and assigning you to it after the group forming activity. You can delete this info section, but please keep the rest of the repo structure intact.

You will be developing your game using [P5.js](https://p5js.org) a javascript library that provides you will all the tools you need to make your game. However, we won't be teaching you javascript, this is a chance for you and your team to learn a (friendly) new language and framework quickly, something you will almost certainly have to do with your summer project and in future. There is a lot of documentation online, you can start with:

- [P5.js tutorials](https://p5js.org/tutorials/) 
- [Coding Train P5.js](https://thecodingtrain.com/tracks/code-programming-with-p5-js) course - go here for enthusiastic video tutorials from Dan Shiffman (recommended!)

## FOR THE TREASURE

STRAPLINE. Add an exciting one sentence description of your game here.

IMAGE. Add an image of your game here, keep this updated with a snapshot of your latest development.

LINK. GAME LINK: https://uob-comsm0166.github.io/2026-group-24/

VIDEO. Include a demo video of your game here (you don't have to wait until the end, you can insert a work in progress video)

## Your Group

<img src="./documents/groupphoto.jpg" width="600" height="800">


| Name | Username | Email | Role |
|------|----------|-------|------|
| Junjie Peng | JAY-bru | sg25291@bristol.ac.uk | Role |
| Songyun Han |  zhishihsy | bo24091@bristol.ac.uk | Role |
| Jian Ye | yejian414-tech | ok25241@bristol.ac.uk | Role |
| Junjian Cao | JulianC-2778 | nh25975@bristol.ac.uk | Role |
| Xiaoyu Zhao | zongshifei | rc25481@bristol.ac.uk | Role |
| Shangqing Li | shangqinglee123-create | pd25964@bristol.ac.uk | Role |

## Project Report

### Introduction

For The Treasure is an adventure role-playing game that integrates roguelike mechanics with turn-based tactical combat. Players assemble a party of two heroes — selected from four distinct classes including the Knight, Wizard, Priest, and Ranger — each with a unique stat profile and weapon specialisation, before setting out to defeat enemies, resolve crises, and ultimately claim a legendary treasure.

The core gameplay is divided into two complementary pillars: hexagonal map exploration and turn-based combat. On the overworld, players navigate a procedurally structured hex grid under a strict turn limit, discovering randomised event tiles such as treasure chests, altars, merchant shops, and monster encounters. Items and weapons collected throughout exploration directly augment hero statistics, providing a meaningful sense of progression that carries into combat. The turn-based battle system is speed-driven: unit turn order is determined by Agility, and players must evaluate character stats, enemy attributes, and available skills to make optimal tactical decisions each round.

The game draws primary inspiration from For the King and Pokémon, adopting the former's overworld structure and resource management philosophy, and the latter's accessible yet strategic approach to turn-based combat. Weapons are class-specific and unlock unique skills upon equipping, while accessories and consumables offer flexible cross-class customisation, encouraging diverse build experimentation.

The defining innovation of For The Treasure lies in its deep integration of roguelike randomness. The game adheres to a single-life permadeath rule, and virtually every element — from item rarity rolls to enemy encounter generation — is governed by probability and dice mechanics. At the map level, the game employs a random seed system that sequentially constructs hexagonal terrain distribution, barrier placement, and event population based on the seed value, ensuring full map reproducibility while guaranteeing a distinct layout in every playthrough. This design fundamentally sustains long-term replayability and the desire to explore, making each run a genuinely unique adventure.

### Requirements 
<img src="/documents/paper_prototypes.gif" width="600" height="800">
- 15% ~750 words
- Early stages design. Ideation process. How did you decide as a team what to develop? Use case diagrams, user stories. 

### Design

- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams. 

### Implementation

- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

### Evaluation

- 15% ~750 words

- One qualitative evaluation (of your choice) 

- One quantitative evaluation (of your choice) 

- Description of how code was tested. 

### Process 
[kanboard](https://caojunjian2025.atlassian.net/jira/software/projects/KAN/boards/1)

- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.

### Conclusion


#### Project Reflection

Developing **For the Treasure** was a rewarding journey that challenged our technical and design capabilities alike. We are proud of the cohesive core gameplay loop we delivered: exploring procedurally populated hexagonal maps, managing a diverse party of four distinct hero classes — Knight, Wizard, Priest, and Ranger — and engaging in strategic turn-based combat enriched by a deep weapon system and status-effect mechanics. From unpredictable event encounters to challenging dungeon bosses, the variety keeps exploration consistently engaging, while the Novice Village tutorial and Elder Guide dialogue provide an accessible entry point for new players.

However, development required tough choices. Due to time constraints, features such as planned chapter expansions were scaled back. These compromises underscored the importance of scope management and maintaining a firm feature freeze. Ultimately, For the Treasure stands as a testament to our growth as developers. Building a feature-rich, playable RPG from the ground up remains a deeply satisfying achievement that reflects our ability to navigate complexity and shifting priorities under real-world constraints.

#### Lessons Learnt

By adopting an agile methodology supported by a Kanban board, we were able to identify and resolve issues within the same development cycle rather than deferring them. For instance, during playtesting, we discovered that combat damage values were severely unbalanced: certain skills could eliminate enemies in a single hit, stripping away all strategic tension. This was logged as a high-priority card and patched in the following sprint, preventing the imbalance from compounding as new systems were built atop the core combat loop.

Through think aloud testing sessions, we observed players verbalizing their confusion and expectations in real time, revealing friction points that internal testing had overlooked. These insights directly informed the design of the new player tutorial and the creation of "Elder Guide" dialogues, which contextualized complex mechanics within the game’s narrative. Consequently, players now navigate systems they once found unintuitive with noticeably greater confidence and independence.

#### Reflect on challenges

The development of **For the Treasure** was defined by two central technical challenges that tested our ability to maintain system integrity while scaling complexity:

* **Algorithmic Rigor**: Implementing a hexagonal grid using axial coordinates $(q, r)$ taught us the importance of mathematical precision. We realized that minor rounding errors in coordinate conversion could break immersion, requiring a robust cube-coordinate rounding trick to ensure stability. Furthermore, the evolution of our A* pathfinding from a simple array to a MinHeap priority queue underscored how critical data structure selection is for maintaining a consistent performance in a dynamic world.
* **Architectural Cohesion**: Integrating the imperative Canvas loop with a declarative React UI forced us to rethink state management. The friction between these paradigms initially led to persistent "ghost" UI elements, which we resolved by implementing a snapshot pattern. This transition from mutable state to a strict one-way data flow (Manager → Snapshot → React) was a pivotal lesson in building maintainable, decoupled systems that prevent race conditions during complex combat sequences.

These obstacles ultimately moved us away from nested conditional logic toward a more professional, hook-based StateMachine architecture, significantly improving the game's extensibility.
#### Future Work

##### Immediate Next Steps

Our immediate goal is to focus on **refinement and content expansion**, transforming the existing demo into a more polished and complete experience.

* **Content Diversification:** We plan to introduce a wider variety of **items, enemies, and random events**. By adding items with unique **synergies** and enemies with distinct behavioral patterns, we aim to ensure that every adventure offers players a significantly different experience.
* **Numerical Balancing:** We will establish a more robust balancing framework to ensure the difficulty curve remains both challenging and fair. This will help prevent "power creep" from making the late-game tedious, while also avoiding excessive frustration in the early stages.
* **User Experience (UX) & Polish:** We aim to resolve remaining UI defects and **enhance the feedback**  (visual and audio) for player actions to improve the overall "game feel."

##### Sequel

If given the opportunity to develop a sequel or an extended version of this project, our vision would be to expand this single-player demo into a **multiplayer online game**.

* **Immersive Narrative Systems:** Beyond simple random encounters, we would introduce a **dynamic faction system** or a "living world" concept, where player choices have long-term consequences on the game environment.
* **Technical Evolution:** We will re-engineer the core architecture to support **network synchronization for cooperative multiplayer**, enabling strategic, team-based gameplay.
### Contribution Statement

- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

| Team Member | Contribution |
|---|---|
| Junjie Peng | |
| Songyun Han | |
| Jian Ye | |
| Junjian Cao | |
| Xiaoyu Zhao | |
| Shangqing Li | |

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
