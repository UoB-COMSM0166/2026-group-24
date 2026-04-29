# FOR THE TREASURE


<p align="center">
  <img src="./documents/demo_video.gif" width="600" height="337">
  <br>
</p>

STRAPLINE. Add an exciting one sentence description of your game here.

IMAGE. Add an image of your game here, keep this updated with a snapshot of your latest development.

LINK. GAME LINK: [Play For The Treasure](https://uob-comsm0166.github.io/2026-group-24/)

VIDEO. Include a demo video of your game here (you don't have to wait until the end, you can insert a work in progress video)

# Your Group

<p align="center">
  <img src="./documents/groupphoto.jpg" width="600" height="800">
  <br>
  <em>Figure 0.1: Group Photo</em>
</p>

<div align="center">

<strong>Table 0.1: Group Members</strong>

| Name | Username | Email | Role |
|------|----------|-------|------|
| Junjie Peng | JAY-bru | sg25291@bristol.ac.uk | Role |
| Songyun Han |  zhishihsy | bo24091@bristol.ac.uk | Developer, System Designer |
| Jian Ye | yejian414-tech | ok25241@bristol.ac.uk | Role |
| Junjian Cao | JulianC-2778 | nh25975@bristol.ac.uk | Developer , QA Engineer |
| Xiaoyu Zhao | zongshifei | rc25481@bristol.ac.uk | Role |
| Shangqing Li | shangqinglee123-create | pd25964@bristol.ac.uk | Developer , Scrum Master |

</div>

# Project Report

## Table of Contents

- [1 Introduction](#1-introduction)
- [2 Requirements](#2-requirements)
  - [2.1 Ideation](#21-ideation)
  - [2.2 Stakeholder Analysis (Onion Model)](#22-stakeholder-analysis-onion-model)
  - [2.3 Feasibility Studies](#23-feasibility-studies)
  - [2.4 Identifying Top-Level Needs with User Stories](#24-identifying-top-level-needs-with-user-stories)
  - [2.5 Use-Case Breakdown](#25-use-case-breakdown)
- [3 Design](#3-design)
  - [3.1 Gameplay Flow Overview](#31-gameplay-flow-overview)
  - [3.2 Refined System Architecture](#32-refined-system-architecture)
- [4 Implementation](#4-implementation)
  - [4.1 Challenge 1: Hexagonal Grid Pathfinding System](#41-challenge-1-hexagonal-grid-pathfinding-system)
  - [4.2 Challenge 2: Modular Turn-Based Combat and Status Effect Pipeline](#42-challenge-2-modular-turn-based-combat-and-status-effect-pipeline)
- [5 Evaluation](#5-evaluation)
  - [5.1 Qualitative Evaluation](#51-qualitative-evaluation)
  - [5.2 Quantitative Evaluation](#52-quantitative-evaluation)
- [6 Testing](#6-testing)
- [7 Process](#7-process)
  - [7.1 Online Collaboration](#71-online-collaboration)
  - [7.2 Offline Collaboration](#72-offline-collaboration)
  - [7.3 Team Roles](#73-team-roles)
  - [7.4 Challenges and How We Adapted](#74-challenges-and-how-we-adapted)
- [8 Sustainability, Ethics and Accessibility](#8-sustainability-ethics-and-accessibility)
  - [8.1 Environmental Sustainability](#81-environmental-sustainability)
  - [8.2 Social Dimension](#82-social-dimension)
  - [8.3 Individual Impact](#83-individual-impact)
- [9 Conclusion](#9-conclusion)
  - [9.1 Project Reflection](#91-project-reflection)
  - [9.2 Lessons Learnt](#92-lessons-learnt)
  - [9.3 Reflect on challenges](#93-reflect-on-challenges)
  - [9.4 Future Work](#94-future-work)
- [10 Contribution Statement](#10-contribution-statement)
- [11 AI statement](#11-ai-statement)

---

## 1 Introduction

For The Treasure is an adventure role-playing game that integrates roguelike mechanics with turn-based tactical combat.

Players assemble a party of two heroes — selected from four distinct classes including the Knight, Wizard, Priest, and Ranger — each with a unique stat profile and weapon specialisation, before setting out to defeat enemies, resolve crises, and ultimately claim a legendary treasure.

The core gameplay is divided into two complementary pillars: hexagonal map exploration and turn-based combat. On the overworld, players navigate a procedurally structured hex grid under a strict turn limit, discovering randomised event tiles such as treasure chests, altars, merchant shops, and monster encounters.

Items and weapons collected throughout exploration directly augment hero statistics, providing a meaningful sense of progression that carries into combat. The turn-based battle system is speed-driven: unit turn order is determined by Agility, and players must evaluate character stats, enemy attributes, and available skills to make optimal tactical decisions each round.

The game draws primary inspiration from For the King and Pokémon, adopting the former's overworld structure and resource management philosophy, and the latter's accessible yet strategic approach to turn-based combat. Weapons are class-specific and unlock unique skills upon equipping, while accessories and consumables offer flexible cross-class customisation, encouraging diverse build experimentation.

The defining innovation of For The Treasure lies in its deep integration of roguelike randomness. The game adheres to a single-life permadeath rule, and virtually every element — from item rarity rolls to enemy encounter generation — is governed by probability and dice mechanics.

At the map level, the game employs a random seed system that sequentially constructs hexagonal terrain distribution, barrier placement, and event population based on the seed value, ensuring full map reproducibility while guaranteeing a distinct layout in every playthrough. This design fundamentally sustains long-term replayability and the desire to explore, making each run a genuinely unique adventure.

<p align="center">
  <img src="./documents/FTK.png" width="600"/><br/>
  <em>Figure 1.1: For the King</em>
</p>

<p align="center">
  <img src="./documents/POKEMON.png" width="600"/><br/>
  <em>Figure 1.2: Pokémon</em>
</p>

<table align="center">
  <tr>
    <td align="center">
      <img src="./documents/hero.gif" width="400"/><br/>
      <em>Figure 1.3: Hero</em>
    </td>
    <td align="center">
      <img src="./documents/enemy.gif" width="400"/><br/>
      <em>Figure 1.4: Enemy</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="./documents/items.png" width="400"/><br/>
      <em>Figure 1.5: Items</em>
    </td>
    <td align="center">
      <img src="./documents/events.png" width="400"/><br/>
      <em>Figure 1.6: Events</em>
    </td>
  </tr>
</table>

---

## 2 Requirements

### 2.1 Ideation

In the early stages of the project, the team held a series of meetings to discuss the choice of game theme, exploring how to design a game with creative mechanics, rich gameplay, and high replayability. After extensive deliberation, we decided to develop a roguelite game featuring large-scale map exploration combined with turn-based combat.

This decision was greatly facilitated by the shared enthusiasm all team members had for the roguelite genre. To refine our vision and seek inspiration, every member of the team played For the King 2, studying its game design in depth. This proved to be a highly valuable exercise, as a significant portion of our design decisions were informed and inspired by that title.

In the subsequent laboratory workshop sessions, we applied the knowledge and methodologies acquired during class to develop the first paper prototype of For the Treasure. This prototype helped solidify the overall design direction of the game and defined the core features to be implemented. We also engaged in cross-group discussions, gathering feedback from fellow students, which allowed us to make preliminary refinements to the game design.

<p align="center">
  <img src="/documents/paper_prototypes.gif" width="600" height="800">
  <br>
  <em>Figure 2.1: Paper Prototype Demonstration</em>
</p>

### 2.2 Stakeholder Analysis (Onion Model)


<p align="center">
  <img src="./documents/onion.png" width="650">
</p>
<p align="center"><em>Figure 2.2: Onion Model of Stakeholders for “For the Treasure”</em></p>

To systematically identify stakeholders within the project, we adopt the Onion Model, which categorises stakeholders based on their proximity to and interaction with the system.

At the core of the model lies the system itself, *For the Treasure*. The game represents the central entity of all interactions, incorporating key mechanics such as map exploration, turn-based combat, and character progression.

The second layer consists of **direct users**, including players and testers. Players are the primary beneficiaries of the system, and their experience directly determines the success of the game. Testers interact with the system during development, providing valuable feedback that helps identify usability issues and refine gameplay mechanics.

The third layer represents the **development team**, including developers, UI/UX designers, data balancing designers, and maintainers. This group is responsible for implementing, maintaining, and improving the system. Their role ensures that the game functions correctly, remains scalable, and delivers a consistent user experience.

The outermost layer represents the **wider environment**, including professors, peers, course staff, and supporting platforms such as p5.js and GitHub. These stakeholders do not directly use the system but influence it through feedback, evaluation, and technical support. Additionally, the general public, as potential future players, represents long-term system impact.

A key insight from this model is the role of **surrogate stakeholders**. Professors and peers act as representatives of broader player groups, allowing requirements to be gathered even when direct access to real users is limited. This is particularly useful in early-stage development, enabling rapid feedback and iterative design improvements.

However, reliance on surrogate stakeholders introduces potential limitations. They may not fully reflect the diversity of real users, especially in terms of gameplay preferences, skill levels, or accessibility needs. Therefore, their feedback must be complemented by broader user testing.

Furthermore, we identify **negative stakeholders**, such as players who may perceive the game as too difficult or unbalanced, and users experiencing performance issues on low-end devices. Recognising these stakeholders helps anticipate risks and improve system design.

Overall, the Onion Model provides a structured framework for understanding stakeholder relationships, ensuring that both direct and indirect influences are considered within the requirements engineering process.


### 2.3 Feasibility Studies

After a period of discussion and testing, we ultimately validated the feasibility of the core mechanics and gameplay of the game.

By implementing a central state machine to manage the interaction system between the map and various game elements — including combat, events, and treasure chests — we successfully integrated the rich game content into a cohesive whole. This culminated in the completion of a fully runnable version 2.0, following the initial paper prototype, which formally marked the beginning of the iterative refinement of both the visual presentation and gameplay features built upon this foundation.

<p align="center">
  <img src="/documents/early map demo.png" width="600" height="800">
  <br>
  <em>Figure 2.3: Early Map Demo</em>
</p>

### 2.4 Identifying Top-Level Needs with User Stories

**Epics, User Stories & Acceptance Criteria**

Through the study conducted in both laboratory workshops and lecture sessions, we developed a structured table to organise and manage our epics, user stories, and acceptance criteria. Throughout the subsequent game development process, we continuously referred to this table to ensure that every user requirement was addressed by a corresponding implemented feature in the game.

<div align="center">

<strong>Table 2.1: Epics, User Stories and Acceptance Criteria</strong>

</div>

<table>
  <thead>
    <tr>
      <th>Epic</th>
      <th>User Story</th>
      <th>Acceptance Criterion</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2"><b>Map Exploration</b></td>
      <td>
        As an Adventure RPG enthusiast, I want to move across a hexagonal tile map so that I can explore the world and discover new areas.
      </td>
      <td>
        Given the player selects a hex tile, when it is within the movement range, then the player moves to that tile and the remaining steps decrease accordingly.
      </td>
    </tr>
    <tr>
      <td>
        As an Adventure RPG enthusiast, I want a limited number of steps per turn so that I must plan my movement strategically.
      </td>
      <td>
        Given the player has used all available steps, when they attempt to move further, then the action is blocked and a visual indicator shows that no steps remain.
      </td>
    </tr>
   <tr>
      <td rowspan="2"><b>Combat System</b></td>
      <td>
        As a turn-based game enthusiast, I want to engage in turn-based combat where I can use a variety of skills and apply status effects so that I can defeat enemies through diverse and strategic decision-making.
      </td>
      <td>
        Given the player encounters an enemy, when combat begins, then both sides take turns performing actions; the player may select from multiple skills each turn, and the corresponding effects (damage, buff, debuff, or status) are applied and reflected in the combat log until one side is defeated.
      </td>
    </tr>
    <tr>
      <td>
        As a turn-based game enthusiast, I want to choose from multiple distinct character classes so that I can experience different playstyles and combat approaches.
      </td>
      <td>
        Given the player starts a new run, when they reach the class selection screen, then at least three distinct classes are available, each with a unique skill set and stat profile, and the selected class is applied for the entire run.
      </td>
    </tr>
    <tr>
      <td rowspan="2"><b>Roguelite Mechanics</b></td>
      <td>
        As a rougelite enthusiast, I want my character to die permanently upon defeat so that each run feels meaningful and high-stakes.
      </td>
      <td>
        Given the player's HP reaches zero, when the defeat condition is triggered, then all progress for that run is lost and the player is returned to the start screen with no carry-over state.
      </td>
    </tr>
    <tr>
      <td>
        As a rougelite enthusiast, I want items and enemy encounters to be randomised each run so that every playthrough feels fresh and unpredictable.
      </td>
      <td>
        Given a new run begins, when the map and events are generated, then item drops and enemy placements are randomised so that no two runs follow the same pattern.
      </td>
    </tr>
    <tr>
      <td rowspan="2"><b>Equipment & Accessory System</b></td>
      <td>
        As a player, I want to collect a wide variety of class-specific equipment and accessories so that I can build a character suited to my playstyle.
      </td>
      <td>
        Given the player obtains a piece of equipment or accessory, when they open the inventory, then the item is displayed with its stats and any class restrictions clearly indicated.
      </td>
    </tr>
    <tr>
      <td>
        As a player, I want to freely mix and match equipment and accessories so that I can experiment with different build combinations.
      </td>
      <td>
        Given the player equips a combination of items, when the loadout is confirmed, then the combined stat bonuses and any synergy effects are calculated and displayed in real time.
      </td>
    </tr>
    <tr>
      <td rowspan="2"><b>UI & Feedback</b></td>
      <td>
        As a new player, I want an in-game tutorial so that I can learn the core mechanics without consulting external resources.
      </td>
      <td>
        Given the player launches the game for the first time, when the tutorial begins, then interactive prompts guide the player through movement, combat, and inventory step by step.
      </td>
    </tr>
    <tr>
      <td>
        As a player, I want to see the current turn count and active quest hints on screen so that I can track my progress at a glance.
      </td>
      <td>
        Given the player is in an active run, when a new turn begins or a quest objective updates, then the turn counter increments and the relevant quest hint is displayed in the HUD without obscuring gameplay.
      </td>
    </tr>
  </tbody>
</table>


### 2.5 Use-Case Breakdown

<p align="center">
  <img src="./documents/usecase.png" width="650">
  <br>
  <em>Figure 2.4: Use Case Diagram</em>
</p>

Based on our identified stakeholders and user needs, we developed a Use Case Diagram to represent the core interactions between the player and the system. The diagram focuses on high-level gameplay actions rather than low-level mechanics, allowing us to clearly define the system’s functional scope during the requirements phase.

From this model, we identified three main areas of interaction: map exploration, combat, and system management. During exploration, players can navigate the map, trigger tile-based events, and interact with the game world. These interactions form the core gameplay loop and are essential for maintaining player engagement. The inclusion of movement and event triggering as supporting use cases ensures that exploration is both dynamic and responsive.

In addition, inventory management was identified as a key supporting system. Players are able to manage and equip items, which directly influence their performance in combat. This connection between exploration, inventory, and combat reflects the integrated design of the game’s mechanics.

Combat is represented as a structured interaction sequence, where players select skills and perform actions against enemies. The use case diagram highlights this as a simplified flow, abstracting away internal logic while still capturing the player’s role in decision-making.

Overall, the use case diagram helped us define clear system boundaries and prioritise essential gameplay features, ensuring that the design remains focused on player interaction and usability.


---

## 3 Design

**Core Gameplay Loop**

```mermaid
flowchart LR
    A["Character Selection"] --> B["Hex Map Exploration"]
    B --> C{"Tile Event"}
    C --> D["Treasure / Shop / Altar"]
    C --> E["Enemy Encounter"]
    E --> F["Turn-Based Combat"]
    F --> G{"Battle Result"}
    G -->|"Victory"| H["Loot and Upgrade"]
    G -->|"Defeat"| I["Run Ends"]
    H --> B
    B --> J["Boss Challenge"]
```

### 3.1 Gameplay Flow Overview

<p align="center">
  <img src="./documents/liucheng.png" width="650">
  <br>
  <em>Figure 3.1: Gameplay Flow Overview</em>
</p>


Figure 3.1 illustrates the sequence of interactions between key system objects during a single combat encounter. The diagram captures the collaboration between the `PlayerInput` actor, `GameController`, `CombatManager`, `Hero`, `Enemy`, and `CombatUI`.

The sequence begins when the player clicks on a monster tile, triggering the `GameController` to transition into the **COMBAT** state and initialise a new `CombatManager` instance with the current heroes and enemies. Once the player starts the battle, the `CombatManager` sorts all units by their speed stat to determine turn order.

On the player's turn, the `CombatUI` presents available skill buttons. The player selects a skill and a target, after which the `CombatManager` executes a dice roll to determine the outcome. The roll result, ranging from 1 to 6, maps to different damage multipliers:
- A roll of **1** results in a miss
- A roll of **6** delivers a perfect hit with double damage

The calculated damage is then applied to the `Enemy`, and the `CombatUI` displays a floating damage number to provide visual feedback.

Following the player's action, the `CombatManager` triggers the enemy AI, which selects a skill and attacks the `Hero`. After both sides have acted, `evaluateTurn()` checks whether all enemies are defeated or all heroes have fallen.

- **Victory** transitions the game back to `MAP_EXPLORATION`
- **Defeat** results in the game being reloaded

<p align="center">
  <img src="./documents/class_diagram.png" width="650">
  <br>
  <em>Figure 3.2: Class Diagram</em>
</p>

<div align="center">

<strong>Table 3.1: Main Classes and Responsibilities</strong>

| Class | Description | Key Responsibilities |
|-------|-------------|---------------------|
| GameController | Central control class | Holds all core component references, drives the state machine, and coordinates update() and render() each frame |
| StateMachine | Game state manager | Registers game states and handles transitions between character select, exploration, combat, and game over |
| GameLoop | Main loop driver | Calls update() and render() every frame via requestAnimationFrame to keep the game running continuously |
| Character | Abstract base class | Defines six core stats, calculates derived combat values, and provides shared methods for all character types |
| Player | Player character | Manages weapon slots, equipment, and inventory, and handles weapon switching and map movement |
| Enemy | Enemy unit | Scales stats by level and difficulty, and supports stat overrides for boss-type enemies |
| CombatManager | Combat flow controller | Generates turn order, handles player actions and enemy AI, and manages damage calculation and win/loss evaluation |
| HexMap | World map container | Stores hex grid data, generates terrain and events on initialisation, and provides tile queries and coordinate conversion |
| Tile | Single hex grid cell | Records terrain type, reveal state, and event content as the basic building block of the game world |
| Camera | Viewport controller | Supports panning and zooming, converts between screen and world coordinates, and enforces map boundaries |
| Pathfinder | Pathfinding utility | Implements A* to find the shortest movement path and calculates all reachable tiles within movement points |
| Renderer | Rendering utility | Draws the map, characters, health bars, and movement highlights for both exploration and combat scenes |
| UIManager | UI layer manager | Manages all interface screens including HUD, combat overlay, and event popups, bridging game logic and the DOM |
| DataLoader | Asset loader | Loads hero, skill, and weapon data alongside image assets at startup and caches them for runtime access |
| InputHandler | Input processor | Captures mouse and keyboard events and translates them into game commands for GameController |
| GameStory | Story display manager | Stores narrative content and triggers story screens at key moments throughout the game |
</div>

### 3.2 Refined System Architecture

The final class diagram presents the refined system architecture of **For the Treasure**. Instead of relying on a small number of oversized controller classes, the final design separates the game into modular components with clearer responsibilities. This makes the system easier to maintain, test, and extend as new maps, combat mechanics, items, and interface features are added.

At the centre of the architecture, `GameController` coordinates the overall game lifecycle through the `StateMachine`. It maintains the high-level game state, including map exploration, story progression, combat transitions, and turn advancement, while delegating specialised behaviour to independent subsystems during the update loop.

**Level and world management.** The world layer is built around the hexagonal grid system (`HexMap`) and the event system (`EventTable`). This structure supports multi-area gameplay, such as the Main World and Novice Village, while allowing each map layer to preserve its own state and event content.

**Combat and entity system.** Combat logic is separated from exploration logic. When the player enters an encounter, the state machine transfers control to `CombatManager`, which manages heroes, enemies, turn phases, skill execution, stat calculation, battle feedback, and loot settlement before returning control to the main game flow.

**Resource and presentation management.** Game configuration data, including heroes, weapons, skills, and monster information, is loaded through `DataLoader`. At the same time, rendering (`Renderer`) and interface interaction (`UIManager`) operate independently from the core logic layer, reducing coupling between gameplay rules and visual presentation.

By separating exploration control, combat calculations, resource loading, rendering, and interface management, the architecture provides a more stable foundation for complex map structures and deeper combat mechanics.

<p align="center">
  <img src="./documents/game_class_diagram_new.png" width="650">
  <br>
  <em>Figure 3.3: New Class Diagram</em>
</p>

The main improvements to the system are reflected in the following three aspects.

**Core control decomposition.** In the initial class diagram design, `GameController` and `CombatManager` included a massive amount of mixed responsibilities. Now, the core logic is clearly defined and separated into specialised independent classes, including `TurnManager`, `Dice`, `TaskList`, and `TutorialManager`. This improvement allows different game rules and lifecycle mechanics to be managed through a more modular and highly cohesive structure.

**World generation refinement.** Previously, `HexMap` was responsible for both storing data and generating the map. Now, a dedicated `MapGenerator` has been extracted to handle procedural generation and entity placement. `HexMap` strictly adopts the grid-based `Tile` structure to represent the map environment. Every `Tile` records its coordinate position `(q, r)`, type, and content, supporting more fine-grained map control and rendering inspection.

**User interface refactoring.** In the beginning design stage, UI logic was mainly processed by a single monolithic `UIManager`. In the final design, this overly centralised structure was replaced with specific UI component classes such as `CombatUI`, `InventoryUI`, `ShopUI`, and `StoryDialogueBox`. When a specific interface needs to be shown, `UIManager` acts as a router to manage the lifecycle of these independent views. This makes interface rendering clearer and reduces system coupling.

---

## 4 Implementation

### 4.1 Challenge 1: Hexagonal Grid Pathfinding System
One of the key challenges we faced was implementing a navigation system based on a hexagonal grid, enabling players to explore and move smoothly across large-scale maps. In the early stages of game design, we chose the hexagonal grid as the core map structure in order to provide more natural movement directions and more tactical path-planning possibilities.

Because players frequently select target positions during gameplay, the system must compute paths and reachable ranges in real time. When the map size expands to hundreds of tiles, pathfinding calculations can easily become a runtime performance bottleneck. At the same time, the camera system must support panning, zooming, and coordinate transformation simultaneously. If these functions are not handled in a unified manner, mouse interactions may become inaccurate or visual jitter may occur.

The primary difficulty came from the performance limitations of the A* pathfinding algorithm. In the early implementation, the open set in Pathfinder.js was stored using a standard array. Each time a new node was inserted, the array was sorted to select the optimal node. This implementation resulted in a time complexity of O(n² log n) for a single pathfinding operation.

As the map size increased, noticeable lag occurred when players selected distant targets, becoming the major runtime performance bottleneck. To address this issue, we redesigned the priority queue structure by implementing a custom MinHeap (binary minimum heap). This data structure sorts nodes according to their cumulative cost value (g-value), reducing the complexity of push and pop operations to O(log n). With the new implementation, the overall complexity of the A* algorithm was optimized to O(n log n), significantly improving pathfinding efficiency.

In addition, we optimized the logical rules of the pathfinding system. In the game, tiles containing events (such as treasure chests or shops) are allowed to serve as destination nodes but cannot be used as intermediate nodes in a path. This rule is implemented through the isPassable(tile, isGoal) function, where the Boolean parameter isGoal distinguishes between the destination and intermediate nodes. This ensures that the generated paths correctly follow the intended gameplay rules.

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/5f786c67-f0ff-4239-8f92-57b127aa7cf9" width="400"/>
      <br>
      <em>Figure 4.1: Hexagonal Pathfinding Demonstration</em>
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/1b609a4e-4f82-428e-ad3e-84b441fc5d2b" width="450"/>
      <br>
      <em>Figure 4.2: Reachable Range and Movement Preview</em>
    </td>
  </tr>
</table>


### 4.2 Challenge 2: Modular Turn-Based Combat and Status Effect Pipeline

Another major challenge was implementing a multi-layer turn-based combat state management system, designed to support complex combat interactions between multiple characters and enemies. In the game design, each unit can not only perform attacks and skills but may also be affected by multiple status effects, such as burn, freeze, poison, shield, and attack enhancement. Therefore, the system must be capable of managing multiple status effects simultaneously and executing their logic at the correct timing points.

Damage calculation in combat is not simply a matter of subtracting numerical values. Instead, multiple modifiers must be applied in a specific order, including equipment effects, buffs, debuffs, and triggered effects from special items. If these logical operations are not clearly structured, it can easily result in incorrect damage calculations or code that is difficult to maintain. Therefore, this challenge involved not only state management but also complex data flow design and modular extensibility.

The first major difficulty came from the unified representation and management of status effects. In CombatManager.js, each unit's status effects are stored within a statusEffects object, where the effect type serves as the key and the remaining number of turns serves as the value. For example, when the burn effect is applied, statusEffects.burn is set to 3, indicating that the effect will persist for the next three turns. Different status effects have different trigger timings. For instance, burn and poison deal damage at the start of a turn, freeze skips a unit's action, while some effects are triggered when the unit receives damage.

To avoid scattered conditional logic, we adopted a centralized management strategy. At the start of nextTurn(), the _tickStatus() function is called to process all status effects in a unified manner, including immediate damage, healing effects, and duration reduction. When adding a new status effect, developers only need to implement the corresponding logic within _applyStatus() and _tickStatus(), significantly reducing system maintenance complexity.

The second key difficulty arose from the complexity of the damage calculation logic. During combat, a single damage calculation requires multiple modifiers to be applied sequentially, and the order of execution directly affects the final result. In the _getIncomingDamage() function, we apply effects in a strictly defined sequence. For example, the system first checks the protective effect of the Star Cloak, which may completely block incoming damage if triggered. Next, damage amplification effects from Shockwave and Entangle are applied. Then, damage reduction provided by the Rock Shield is calculated. Finally, additional vulnerability effects provided by equipment are applied. This ordered calculation pipeline ensured predictable results and simplified debugging during balancing stages.

Another important aspect of the system was managing the overall combat flow. The CombatManager class controlled the turn cycle through the nextTurn() method, which selected the active unit based on the predefined turn order. At the beginning of each turn, the system first executed the _tickStatus() function to process ongoing effects before allowing the unit to act. If a unit was affected by disabling conditions such as freeze, the turn was automatically skipped and the system advanced to the next unit. Otherwise, the system determined whether the unit belonged to the player or the enemy team and triggered the corresponding action logic. This structured turn progression ensured that all combat actions were executed in a predictable sequence while maintaining synchronization between game logic and user interface updates.


<p align="center">
  <img src="https://github.com/user-attachments/assets/84a1bb46-c112-40ce-a810-19ba2b779717" width="25%" /><br/>
  <em>Figure 4.3: Multiple-layer buff</em>
</p>

<p align="center">
   <img src="./documents/combat.gif"width="600"/><br/>
  <em>Figure 4.4: Battle system</em>
</p>

---

## 5 Evaluation

### 5.1 Qualitative Evaluation

To iteratively improve our game's mechanics, difficulty balance, and player enjoyment, we gathered qualitative feedback through two complementary methods: Think Aloud sessions and a Heuristic Evaluation.

### 5.1.1 Think Aloud

**5.1.1.1 Process**

Ten participants were invited to play the game while verbalising their thoughts in real time. Sessions were recorded and reviewed, with particular attention paid to moments of confusion, frustration, or engagement. The recurring themes were then organised into a thematic map (Figure 5.1), which guided our design iterations.

<p align="center">
  <img src="./documents/think_aloud_map_figure.png" width="800">
  <br>
  <em>Figure 5.1: Thematic Map of Key Think Aloud Evaluation Feedback</em>
</p>

**5.1.1.2 Solutions and Adjustments**

**Combat System:**
- **Issues:** Players struggled to follow the turn-based combat flow, especially regarding which unit would act next and how speed stats influenced turn ordering.
- **Solutions:** A turn order strip was introduced at the top of the combat screen, giving players a clear visual preview of the upcoming action sequence for both heroes and enemies.

**Instructions and Onboarding:**
- **Issues:** Many players entered the game with little understanding of core mechanics, particularly around equipment (weapon slot allocation, class-based restrictions) and the distinction between weapons and consumable items.
- **Solutions:** A step-by-step tutorial system was implemented via an Elder Guide NPC, who introduces each mechanic in sequence — covering combat, treasure chests, altars, merchants, and inventory management.

**Difficulty and Progression:**
- **Issues:** The boss encounter felt overwhelming, item usage during combat was unclear, and players were unsure when to swap out gear.
- **Solutions:** Visual status effect indicators (burn, poison, shield, etc.) were added beneath each unit, inventory tooltips were improved, and the enemy encounter table was rebalanced to create a more gradual difficulty ramp from early warrior enemies through to elite foes and the final boss.

**Map Navigation:**
- **Issues:** Players were unfamiliar with the action point system and did not realise that tiles were clickable to move.
- **Solutions:** A movement UI now clearly displays remaining action points, and the Elder Guide tutorial explicitly covers the movement mechanic before the player's first encounter.

### 5.1.2 Heuristic Evaluation

**5.1.2.1 Process**

Three evaluators played through the game and assessed it against Nielsen's 10 usability heuristics (Nielsen, 1994). This framework was chosen because our game relies heavily on menu navigation, inventory management, and combat UI — areas where these heuristics are particularly applicable. Each identified violation was rated by the team across three dimensions — impact, frequency, and persistence — to derive a composite severity score (Table 5.1). All violations were subsequently addressed.

<div align="center"><strong>Table 5.1: Heuristic Violations, Severity Ratings, and Solutions</strong></div>

<div align="center">

| Heuristic Violated | Issue Description | Impact (0–4) | Frequency (0–4) | Persistence (0–4) | Overall Severity | Solution |
|--------------------|-------------------|:------------:|:---------------:|:-----------------:|:----------------:|----------|
| Visibility of system status | No indicator of how many turns remain before the boss battle timer expires | 3 | 3 | 3 | 3.00 | A progress bar was added at the top of the screen displaying current turn vs. maximum turns, with a danger animation as the limit approaches |
| Visibility of system status | Status effects (burn, poison, shield) were not visibly communicated on affected units | 3 | 4 | 2 | 3.00 | Status effect icons with remaining duration counters now appear beneath each unit's health bar |
| Recognition rather than recall | Players had no quick reference for which skills were available based on the currently equipped weapon | 3 | 3 | 2 | 2.67 | A skill panel was added to the bottom of the combat screen, colour-coded by category (ATK, MAG, HEAL, BUFF, DEB), listing all available skills for the active hero |
| Flexibility and efficiency of use | Ending a turn required a mouse click each time; no keyboard shortcut existed | 2 | 4 | 3 | 3.00 | A Space bar shortcut was added to end the current turn on the map |
| Help and documentation | No introduction to combat or equipment mechanics was provided before the first encounter | 4 | 2 | 3 | 3.00 | A Novice Village tutorial area was created, where an Elder Guide NPC walks players through each mechanic before they encounter it in the game world |
| Error prevention | Players could equip weapons whose stat scaling did not match their hero's primary stat, causing underperformance with no information given upfront | 2 | 2 | 2 | 2.00 | Each weapon's tooltip now displays a descriptive tag on acquisition indicating which hero archetype it best suits, and the Novice Village tutorial was extended to explain how core stats influence weapon performance |

</div>

### 5.2 Quantitative Evaluation

To measure both perceived workload and usability more rigorously, we administered two validated questionnaire instruments alongside statistical testing:
- **Raw NASA TLX** — to quantify perceived cognitive workload across difficulty modes
- **System Usability Scale (SUS)** — to assess overall interface usability
- **Wilcoxon Signed-Rank Test** — to determine whether observed differences were statistically significant

### 5.2.1 Process

Ten participants each played the game in both Easy and Hard difficulty modes (Kosch et al., 2023). Early sessions revealed that participants were unfamiliar with turn-based combat and equipment mechanics, so a short live demonstration was incorporated before testing. Following gameplay, participants completed both questionnaires. To mitigate learning effects, the order in which participants experienced each difficulty was counterbalanced.

### 5.2.2 Raw NASA TLX

**5.2.2.1 Subscale Workload Scores**

Median scores across all six NASA TLX subscales rose with difficulty (Table 5.2). The most pronounced increase was in Frustration, climbing from 25 (Easy) to 60 (Hard). Effort and Temporal Demand also showed substantial increases.

<div align="center"><strong>Table 5.2: NASA TLX Subscale Median Scores (Easy vs Hard)</strong></div>

<div align="center">

| Scale | Median (Easy) | Median (Hard) | Δ Median |
|-------|:-------------:|:-------------:|:--------:|
| Mental Demand | 30 | 55 | +25 |
| Physical Demand | 10 | 15 | +5 |
| Temporal Demand | 20 | 50 | +30 |
| Frustration | 25 | 60 | +35 |
| Effort | 30 | 55 | +25 |
| Performance | 60 | 75 | +15 |

</div>

**5.2.2.2 Overall Perceived Workload Scores**

Every participant reported higher perceived workload under the harder difficulty setting (Figure 5.2). Counterbalancing the test order helped minimise the influence of learning effects on these results.

<p align="center">
  <img src="./documents/nasatlx_figure.png" width="750">
  <br>
  <em>Figure 5.2: Mean NASA TLX Scores for Each Participant (Easy vs Hard)</em>
</p>

**5.2.2.3 Statistical Analysis**

A Wilcoxon Signed-Rank test was applied at both the subscale and overall level to assess the significance of workload differences. As shown in Table 5.3, the overall workload increase was statistically significant, as were all individual subscales except Physical Demand.

<div align="center"><strong>Table 5.3: Wilcoxon Signed-Rank Test Results for NASA TLX</strong></div>

<div align="center">

| Scale | W Test Statistic | Critical Value | Statistical Significance |
|-------|:----------------:|:--------------:|:------------------------:|
| Mental Demand | 3 | 8 | Yes |
| Physical Demand | 12 | 8 | No |
| Temporal Demand | 1 | 8 | Yes |
| Frustration | 2 | 8 | Yes |
| Effort | 0 | 8 | Yes |
| Performance | 4 | 8 | Yes |
| Overall Perceived Workload | 0 | 8 | Yes |

</div>

**5.2.2.4 Solutions and Adjustments**

Given that Hard difficulty produced statistically significant increases in Frustration, Temporal Demand, and Effort, we introduced several changes to preserve challenge without undermining player experience:
- Rebalanced the enemy encounter table so that difficulty scales more gradually in the early game.
- Introduced additional healing opportunities through altars and item drops to reduce perceived effort.
- Added clearer boss battle warnings and a visible turn countdown, giving players time to plan ahead and reducing time pressure.
- Improved Hard difficulty loot drops so that increased challenge feels rewarding rather than punishing.

### 5.2.3 System Usability Scale (SUS)

**5.2.3.1 Process**

Immediately following the NASA TLX, all 10 participants completed the SUS — a standardised 10-question instrument for assessing system usability (Lewis, 2018). Scores were derived using the standard SUS calculation method.

**5.2.3.2 Raw Data**

Individual question responses (on a 1–5 Likert scale) and calculated SUS scores for each participant are presented in Tables 5.4 and 5.5 below.

<div align="center"><strong>Table 5.4: Raw SUS Questionnaire Responses (Easy Difficulty)</strong></div>

<div align="center">

| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | SUS Score |
|:-----------:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---------:|
| P1 | 3 | 4 | 3 | 3 | 3 | 2 | 4 | 4 | 3 | 5 | 45.0 |
| P2 | 3 | 2 | 3 | 4 | 4 | 3 | 4 | 1 | 3 | 4 | 57.5 |
| P3 | 4 | 3 | 2 | 4 | 4 | 2 | 4 | 2 | 4 | 5 | 55.0 |
| P4 | 2 | 3 | 2 | 4 | 4 | 3 | 4 | 2 | 4 | 5 | 47.5 |
| P5 | 4 | 2 | 4 | 2 | 4 | 3 | 4 | 2 | 4 | 5 | 65.0 |
| P6 | 5 | 2 | 4 | 2 | 4 | 3 | 5 | 3 | 5 | 2 | 77.5 |
| P7 | 4 | 1 | 4 | 1 | 5 | 2 | 4 | 2 | 4 | 2 | 82.5 |
| P8 | 4 | 2 | 5 | 1 | 4 | 1 | 5 | 1 | 5 | 2 | 90.0 |
| P9 | 5 | 1 | 4 | 2 | 5 | 1 | 5 | 1 | 5 | 1 | 95.0 |
| P10 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 5 | 2 | 77.5 |

</div>

<div align="center"><strong>Table 5.5: Raw SUS Questionnaire Responses (Hard Difficulty)</strong></div>

<div align="center">

| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | SUS Score |
|:-----------:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---------:|
| P1 | 2 | 4 | 2 | 4 | 3 | 3 | 3 | 4 | 2 | 5 | 30.0 |
| P2 | 3 | 3 | 2 | 4 | 3 | 3 | 3 | 2 | 3 | 4 | 45.0 |
| P3 | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 4 | 45.0 |
| P4 | 2 | 3 | 2 | 4 | 3 | 3 | 3 | 3 | 3 | 4 | 40.0 |
| P5 | 3 | 2 | 3 | 3 | 4 | 3 | 3 | 2 | 4 | 4 | 57.5 |
| P6 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 3 | 72.5 |
| P7 | 3 | 2 | 3 | 2 | 4 | 2 | 4 | 2 | 4 | 3 | 67.5 |
| P8 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 75.0 |
| P9 | 4 | 1 | 4 | 2 | 4 | 2 | 4 | 1 | 4 | 2 | 80.0 |
| P10 | 3 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 3 | 70.0 |

</div>

> **Note on SUS scoring:** Odd-numbered items (Q1, Q3, Q5, Q7, Q9) contribute (scale position − 1); even-numbered items (Q2, Q4, Q6, Q8, Q10) contribute (5 − scale position). The sum of all contributions is multiplied by 2.5 to yield a score between 0 and 100.

**5.2.3.3 Results**

Individual SUS scores are plotted in Figure 5.3, with the industry-standard benchmark of 68 shown for reference.
- Mean SUS score (Easy) — **69.25**
- Mean SUS score (Hard) — **58.25**

<p align="center">
  <img src="./documents/sus_figure.png" width="750">
  <br>
  <em>Figure 5.3: SUS Scores for Each Participant (Easy vs Hard)</em>
</p>

At Easy difficulty, scores broadly clustered around or above the 68 benchmark, indicating acceptable usability. Under Hard difficulty, several participants scored notably lower, suggesting that the increased enemy complexity and tighter turn constraints introduced meaningful usability friction.

**5.2.3.4 Statistical Analysis**

A Wilcoxon Signed-Rank test on the paired SUS scores yielded a W statistic of 0 against a critical value of 8 (N = 10, α = 0.05), confirming a statistically significant difference in usability between the two difficulty settings.

**5.2.3.5 Solutions and Adjustments**

The SUS results validated our qualitative and NASA TLX findings by confirming that Hard difficulty introduced usability friction not present in Easy mode. We found the SUS somewhat less actionable than the other instruments for identifying specific design changes, though it was valuable for confirming the overall pattern.

We also noted a risk of questionnaire fatigue from administering both instruments in the same session — in future studies, we would separate the two evaluations or introduce breaks between them. Based on these findings, we prioritised:
- Streamlining the Hard difficulty combat UI to lower cognitive demands during play.
- Adding in-combat tooltips to make enemy abilities and status effects more transparent.
- Refining the inventory management flow to reduce time spent navigating menus mid-encounter.

---

## 6 Testing

### 6.1 White Box Testing

Jest unit tests were used to verify the correctness of our game's internal logic, focusing on state transitions and confirming that function calls produced expected changes in game state.

Given the complexity of the turn-based combat system and the variety of status effect interactions, this required careful scoping. We prioritised testing the classes and methods governing combat mechanics, status effect processing, and encounter generation, as these had the greatest potential to affect gameplay correctness. Jest mocking was used extensively to construct controlled, reproducible game states.

**Example — Status Effect Testing:** Our game includes multiple status effects, including burn, poison, shield, and heal aura, that apply at the start of each unit's turn. We verified their application, stacking behaviour, and expiry using a suite of assertions, facilitated by the modular design of the `CombatManager` class.

**Example — Encounter Table Testing:** We also validated the encounter generation system, confirming that the correct enemy compositions spawn at each difficulty tier.

### 6.2 Black Box Testing

Extensive black box testing was carried out throughout the development cycle. A dedicated `develop` branch was used to consolidate and test feature merges before they were promoted to the `main` branch.

Particular focus was given to edge cases in combat, such as simultaneous status effects, zero-HP transitions, and boss phase changes. Map generation was also tested to verify that all tile types rendered correctly and that events fired as expected.

---

## 7 Process

[Kanban board](https://caojunjian2025.atlassian.net/jira/software/projects/KAN/boards/1)

Our team adopted an Agile development methodology, which prioritises working software, customer collaboration, and the ability to respond to change over rigid upfront planning. This approach allowed us to iteratively refine the game across multiple short development cycles, incorporating feedback at each stage rather than locking in a fixed design from the outset.We established a three-sprint development plan, outlining the design direction for each phase.

<p align="center">
  <img src="./documents/weekly_sprint.png" width="600"/><br/>
  <em> Weekly Sprint</em>
</p>

We also adopted a hybrid collaboration model combining both online and offline working modes. This proved to be flexible and helped us identify and resolve issues in a timely manner throughout the development process.

**Team Workflow**

```mermaid
flowchart LR
    A["Sprint Planning"] --> B["Jira Task Breakdown"]
    B --> C["Feature Branch Development"]
    C --> D["Pair Programming / Peer Review"]
    D --> E["Testing on develop"]
    E --> F["Merge to main"]
    F --> G["Sprint Review and Retrospective"]
    G --> A
```

### 7.1 Online Collaboration

Our development was structured around weekly sprints. Each sprint began with a planning session where tasks were drawn from the product backlog on our Jira Kanban board and assigned to team members.

Our weekly team meetings via OOPZ served as a combined sprint review and retrospective: members reported on individual progress, surfaced blockers, and collectively agreed on priorities for the next sprint. Members could also propose improvements to each other's implementations during these sessions. This rhythm of structured, recurring communication kept the entire team aligned and prevented misunderstandings from snowballing into larger problems.

<p align="center">
  <img src="./documents/Voice Channel.png" width="600"/><br/>
  <em>Figure 7.1: Voice Channel</em>
</p>

To complement our meetings, we adopted Jira as our Kanban management tool. After each meeting, individual tasks were broken down and placed onto the Kanban board, giving everyone a clear, at-a-glance view of their own responsibilities and those of their teammates. This transparency was invaluable: rather than relying on informal memory or fragmented chat messages, the board served as a single source of truth for the project's current state.

For version control, we followed a disciplined Git workflow: pull → edit → commit → push. We used IntelliJ IDEA as our primary development environment, which provided convenient built-in Git integration. Our agreed convention was to create a new branch for each feature or fix and only merge into the main branch after the changes had been reviewed and tested during a team meeting.

In line with test-driven development (TDD) principles, unit tests were written alongside — and in some cases prior to — feature implementation, ensuring that all code met defined acceptance criteria before being promoted from the develop branch to main. This practice allowed members to browse each other's pre-written function stubs and interface definitions, making cross-module integration significantly smoother.

<p align="center">
  <img src="./documents/kanban.png" width="600"/><br/>
  <em>Figure 7.2: Kanban Board</em>
</p>

### 7.2 Offline Collaboration

Beyond our digital tools, we made full use of our scheduled in-person class time. Each week, team members brought their own laptops to the classroom, where we could discuss technical challenges face-to-face and practise pair programming on the spot.

In these sessions, one member took the role of the helm — actively writing code at the keyboard — while the other acted as the tactician, reviewing logic in real time, anticipating edge cases, and suggesting refactoring opportunities. This meant all code was reviewed as it was written, supporting the principle of collective code ownership: any team member could read and contribute to any part of the codebase.

This real-time, side-by-side collaboration proved especially effective for solving complex problems that were difficult to articulate through text or voice alone. Being physically present together created an energy and immediacy that online tools simply could not replicate.

<p align="center">
  <img src="./documents/pair_programming.jpg" width="600"/><br/>
  <em>Figure 7.3: pair programming</em>
</p>

### 7.3 Team Roles

Every member of our team was involved in programming work, which reflected the complexity and scope of the game we set out to build. Given the large number of functional modules required, we divided responsibilities roughly along the following lines: inventory system, combat system, map generation, event handling, finite state machine, and item data.

However, it is worth emphasising that these modules were far from isolated — they were deeply interconnected. For instance, the item system fed into both the inventory and combat modules; the event system interacted with the map; and the state machine threaded through virtually every other component. As a result, clear inter-member communication and regular pair programming were not merely helpful, but essential.

To further support this collective ownership, the team agreed on shared coding standards at the outset, including naming conventions, file structure, and commenting practices, ensuring that any member could understand and modify any module without requiring a handover from the original author.

### 7.4 Challenges and How We Adapted

The tight coupling between modules created real difficulties, particularly in the early stages of the project. Our most persistent pain point was Git merge conflicts. When multiple members edited overlapping areas of the codebase simultaneously, merging branches into main often produced a tangled mess of conflicts that cost us significant time and frustration to resolve.

Recognising this as a structural problem rather than a one-off incident, we adapted our workflow. We introduced stricter branch ownership conventions so that overlapping edits were less likely to occur in the first place, and we made a point of communicating in real time — via Oopz online, or in person in the classroom or our shared accommodation — whenever two members were working on interdependent features. This meant that integration issues could be caught and negotiated before they ever reached the merge stage.

Looking back, the early turbulence with version control was genuinely challenging, but it pushed us to develop better habits and a more disciplined approach to collaboration. By the latter half of the project, our hybrid online-offline model had matured into a workflow that felt natural and efficient.

More than the technical skills we developed, the experience strengthened our interpersonal relationships and built a genuine sense of mutual trust within the team — something we consider one of the most valuable outcomes of this project.

---

## 8 Sustainability, Ethics and Accessibility

### 8.1 Environmental Sustainability

Both the development and operation of a browser-based game consume electrical energy. The game's core update-and-render loop runs continuously while active, requiring sustained CPU and GPU processing. Left unaddressed, this would represent an avoidable energy overhead, particularly if the game were to attract a large user base.

To mitigate this, we implemented the browser's `requestAnimationFrame` API to synchronise rendering with the display refresh cycle, avoiding redundant computation between frames. A resource preloading system further reduces runtime overhead by loading all image and audio assets once at startup rather than on demand, thereby decreasing repeated file I/O and processing cost during play.

Considering the chain of effects from widespread use, if thousands of players were to run the game simultaneously, aggregate energy consumption across devices could become non-trivial. Future optimisations, such as pausing the render loop when the browser tab is inactive or reducing asset resolution for low-power devices, would be worthwhile steps toward a lower carbon footprint at scale.

A secondary environmental consideration is that *For the Treasure* is a digital replacement for a traditional board game. Physical equivalents require paper maps, plastic tokens, printed cards, and character sheets — materials that consume natural resources in production and generate packaging and transportation emissions.

By storing all game data in JSON and rendering maps and characters digitally on screen, the game eliminates these material costs entirely and allows the game to be updated or expanded without any reprinting or physical distribution.

<p align="center">
  <img src="./documents/zhuoyou.jpg" width="650">
  <br>
  <em>Figure 8.1: Traditional Board Game Components</em>
</p>

### 8.2 Social Dimension

At the level of direct use, *For the Treasure* is a single-player game, which limits the social interactions it directly mediates. However, its social impact should still be considered in the broader context of how games shape behaviour, discussion, and informal community.

The roguelite genre, with its permadeath and randomised runs, encourages repeated engagement and a culture of challenge-sharing among players. This can foster informal social communities around strategy discussion, route planning, build comparison, and run outcomes.

A potential negative chain of effects concerns time displacement. If the game becomes highly engaging — which our NASA TLX and SUS results suggest it does at Easy difficulty — players may spend extended periods in play, potentially at the expense of social interaction, physical activity, or academic work.

We partially address this through a natural session structure: each run has a defined turn limit, creating a clear endpoint rather than an open-ended loop that encourages indefinite play. Difficulty settings also allow players to calibrate the intensity of their engagement.

### 8.3 Individual Impact

*For the Treasure* is designed to deliver cognitive and emotional value to individual players. The core gameplay loop — planning movement routes, managing a limited action budget, selecting skills in combat, and adapting strategies in response to random events — exercises logical thinking, forward planning, and probabilistic reasoning under uncertainty. These are transferable cognitive skills that extend beyond the game context.

The game also provides positive emotional feedback through its reward systems: item drops, treasure discoveries, level-ups, and successful combat outcomes each deliver a moment of achievement. Our evaluation results support this: think-aloud participants reported enjoyment and engagement, and SUS scores at Easy difficulty averaged 69.25, above the usability benchmark of 68.

The Novice Village tutorial and Elder Guide NPC were specifically designed to reduce onboarding frustration, ensuring that players derive satisfaction rather than stress from early interactions with the system.

The chain-of-effects risk at the individual level mirrors the social concern above: a highly rewarding game loop, particularly one with permadeath and randomised content, can create compulsive replaying behaviour. The roguelite structure is specifically optimised for replayability.

We consider this an honest trade-off inherent to the genre, and we mitigate it through the bounded run length. We also note that providing a Hard difficulty mode allows experienced players to find genuine challenge rather than artificially extending play time through repetition.

---

## 9 Conclusion

### 9.1 Project Reflection

Developing **For the Treasure** was a rewarding journey that challenged our technical and design capabilities alike. We are proud of the cohesive core gameplay loop we delivered: exploring procedurally populated hexagonal maps, managing a diverse party of four distinct hero classes — Knight, Wizard, Priest, and Ranger — and engaging in strategic turn-based combat enriched by a deep weapon system and status-effect mechanics.

From unpredictable event encounters to challenging dungeon bosses, the variety keeps exploration consistently engaging, while the Novice Village tutorial and Elder Guide dialogue provide an accessible entry point for new players.

However, development required tough choices. Due to time constraints, features such as planned chapter expansions were scaled back. These compromises underscored the importance of scope management and maintaining a firm feature freeze. Ultimately, For the Treasure stands as a testament to our growth as developers. Building a feature-rich, playable RPG from the ground up remains a deeply satisfying achievement that reflects our ability to navigate complexity and shifting priorities under real-world constraints.

### 9.2 Lessons Learnt

By adopting an agile methodology supported by a Kanban board, we were able to identify and resolve issues within the same development cycle rather than deferring them.

For instance, during playtesting, we discovered that combat damage values were severely unbalanced: certain skills could eliminate enemies in a single hit, stripping away all strategic tension. This was logged as a high-priority card and patched in the following sprint, preventing the imbalance from compounding as new systems were built atop the core combat loop.

Through think aloud testing sessions, we observed players verbalizing their confusion and expectations in real time, revealing friction points that internal testing had overlooked. These insights directly informed the design of the new player tutorial and the creation of "Elder Guide" dialogues, which contextualized complex mechanics within the game’s narrative. Consequently, players now navigate systems they once found unintuitive with noticeably greater confidence and independence.

### 9.3 Reflect on challenges

The development of **For the Treasure** was defined by two central technical challenges that tested our ability to maintain system integrity while scaling complexity:

* **Algorithmic Rigor**: Implementing a hexagonal grid using axial coordinates $(q, r)$ taught us the importance of mathematical precision. We realized that minor rounding errors in coordinate conversion could break immersion, requiring a robust cube-coordinate rounding trick to ensure stability. The evolution of our A* pathfinding from a simple array to a MinHeap priority queue also underscored how critical data structure selection is for maintaining consistent performance in a dynamic world.
* **State Management Sophistication**: Developing the multi-layered combat system taught us the necessity of logic decoupling and execution sequencing. We moved away from a simplistic "hit-and-subtract" damage model to a centralized modifier pipeline, where status effects (burn, shield, etc.) and equipment buffs are processed as distinct middleware layers.
  This transition forced us to implement a rigid trigger-based lifecycle, processing effects at precise moments like onTurnStart or onDamageReceive. This architectural shift prevented the "spaghetti code" typically caused by overlapping status effects and ensured that complex interactions, such as damage reduction being applied before vulnerability multipliers, remained mathematically consistent and easily extensible for new skills.

These obstacles ultimately moved us away from nested conditional logic toward a more professional, hook-based StateMachine architecture, significantly improving the game's extensibility.

### 9.4 Future Work

**9.4.1 Immediate Next Steps**

Our immediate goal is to focus on **refinement and content expansion**, transforming the existing demo into a more polished and complete experience.

* **Content Diversification:** We plan to introduce a wider variety of **items, enemies, and random events**. By adding items with unique **synergies** and enemies with distinct behavioral patterns, we aim to ensure that every adventure offers players a significantly different experience.
* **Numerical Balancing:** We will establish a more robust balancing framework to ensure the difficulty curve remains both challenging and fair. This will help prevent "power creep" from making the late-game tedious, while also avoiding excessive frustration in the early stages.
* **User Experience (UX) & Polish:** We aim to resolve remaining UI defects and **enhance the feedback** (visual and audio) for player actions to improve the overall "game feel."

**9.4.2 Sequel**

If given the opportunity to develop a sequel or an extended version of this project, our vision would be to expand this single-player demo into a **multiplayer online game**.

* **Immersive Narrative Systems:** Beyond simple random encounters, we would introduce a **dynamic faction system** or a "living world" concept, where player choices have long-term consequences on the game environment.
* **Technical Evolution:** We will re-engineer the core architecture to support **network synchronization for cooperative multiplayer**, enabling strategic, team-based gameplay.
---

## 10 Contribution Statement

The table below summarises the main contribution areas recorded for each team member.

<div align="center">

<strong>Table 10.1: Team Contribution Statement</strong>

| Team Member | Contribution |
|---|---|
| Junjie Peng | 1|
| Songyun Han | 1 |
| Jian Ye | 1|
| Junjian Cao |1 |
| Xiaoyu Zhao | 1|
| Shangqing Li | 1|

</div> 

---

## 11 AI statement

Throughout this project, our team utilised AI tools in two specific areas to support our development process, while ensuring that all design decisions, logic, and overall implementation remained our own.

**Programming support.** We used AI assistance during the programming phase of the project. When implementing complex logic structures, such as state machines, we consulted AI tools to help generate initial code templates and suggest appropriate syntax.

These outputs were not used directly; rather, they served as a starting point which our team then critically reviewed, modified, and integrated into our broader codebase. All architectural decisions, debugging, and final implementation were carried out by team members themselves.

**Image editing support.** AI tools were used to assist with image editing during the UI development process. Specifically, we used AI-powered image editing tools to process and refine visual assets used in our interface, such as background removal, resizing, and style adjustments. The overall UI design, layout, and visual direction were conceived and executed by our team, with AI serving purely as an editing aid to improve efficiency.

In both cases, AI was used as a practical tool to reduce repetitive workload and improve the quality of specific outputs, rather than to replace our own thinking or decision-making. All core contributions — including system design, user interface planning, and project logic — reflect the independent work of our team members.

We believe our use of AI was responsible, transparent, and consistent with the spirit of the project requirements.
