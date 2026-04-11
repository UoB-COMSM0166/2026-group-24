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

<p align="center">
  <img src="./documents/FTK.png" style="width: 45%; height: 300px; object-fit: cover; display: inline-block; vertical-align: middle;" />
  <span style="display:inline-block; width: 100px;"></span>
  <img src="./documents/POKEMON.png" style="width: 45%; height: 300px; object-fit: cover; display: inline-block; vertical-align: middle;" />
</p>

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
## 6. Evaluation

### Qualitative Evaluation

To refine our game's mechanics, difficulty, and overall level of enjoyment, we collected qualitative feedback through Think Aloud and Heuristic evaluations.

#### Think Aloud

**Process**

Participants were asked to verbalise their thoughts and reactions during gameplay, which we recorded, focusing on moments of confusion and engagement with the game. From these records, we identified key themes, which we summarised and categorised in a thematic map (Figure 1).

<p align="center">
  <img src="./documents/think_aloud_map_figure.png" width="800">
  <br>
  <em>Figure 1: Thematic Map of Key Think Aloud Evaluation Feedback</em>
</p>

**Solutions and Adjustments**

**Combat System:**
- **Issues:** Players found it difficult to understand the turn-based combat flow, particularly which unit would act next and how speed determined turn order.
- **Solutions:** We added a turn order strip displayed at the top of the combat screen, clearly showing the sequence of upcoming actions for both heroes and enemies.

**Instructions and Onboarding:**
- **Issues:** Poor initial understanding of game mechanics, especially the equipment system (weapon slots, class-specific restrictions) and the distinction between weapons and items.
- **Solutions:** We implemented a comprehensive tutorial system with an Elder Guide NPC who introduces each game mechanic progressively, including combat, treasure chests, altars, merchants, and inventory management.

**Difficulty and Progression:**
- **Issues:** Players felt overwhelmed by the boss battle, were unsure how to use items during combat, and found it unclear when to equip new gear.
- **Solutions:** Added clear visual indicators for status effects (burn, poison, shield, etc.), improved the inventory UI with tooltips, and balanced the encounter table to provide a smoother difficulty curve from early warrior encounters to elite enemies and the final boss.

**Map Navigation:**
- **Issues:** Some players were confused about the action point system and did not realise they could click tiles to move.
- **Solutions:** Added clearer movement UI showing remaining action points, and the Elder Guide now explains the movement system during the tutorial phase.

---

#### Heuristic Evaluation

**Process**

Three participants were asked to play the game and evaluate it against the 10 Nielsen design heuristics. We felt that the Nielsen design heuristics were a valid approach, since our game involves significant menu navigation, inventory management, and combat UI interactions. (Nielsen, 1994) The main heuristic violations identified were documented and our team assessed their severity based on impact, frequency, and persistence, to calculate an overall severity rating (Table 1). All heuristic violations were addressed and the solution is documented below.

| Heuristic Violated | Issue Description | Impact (0–4) | Frequency (0–4) | Persistence (0–4) | Overall Severity | Solution |
|--------------------|-------------------|:------------:|:---------------:|:-----------------:|:----------------:|----------|
| Visibility of system status | No clear indication of remaining turns before the boss battle timer expires | 3 | 3 | 3 | 3.00 | We added a progress bar at the top of the screen showing current turn / max turns, with a danger animation when turns are running low |
| Visibility of system status | Status effects on units (burn, poison, shield) were not clearly displayed | 3 | 4 | 2 | 3.00 | We added visible status effect icons with remaining turn counters beneath each unit's health bar |
| Recognition rather than recall | Players could not easily check which skills were available for their currently equipped weapon | 3 | 3 | 2 | 2.67 | We added a skill panel at the bottom of the combat screen, colour-coded by type (ATK, MAG, HEAL, BUFF, DEB), showing all available skills for the active hero |
| Flexibility and efficiency of use | No keyboard shortcut to end turn; players had to click the button every time | 2 | 4 | 3 | 3.00 | We added a Space key shortcut to end the current turn on the map |
| Help and documentation | No explanation of the combat system or equipment mechanics before the first encounter | 4 | 2 | 3 | 3.00 | We created a Novice Village tutorial area with an Elder Guide NPC who introduces each mechanic before the player encounters it |
| Error prevention | Players could accidentally equip a weapon meant for another class, wasting a turn | 2 | 2 | 2 | 2.00 | We implemented class-specific weapon restrictions, preventing incompatible equipment from being assigned |

---

### Quantitative Evaluation

To ensure our game was both appropriately challenging and also user-friendly, we conducted quantitative evaluations of usability using two established and validated questionnaire tools, and statistical analysis:
- Raw NASA TLX — to quantify perceived workload
- System Usability Scale (SUS) — to quantify system usability
- Wilcoxon Signed-Rank Test — to calculate the statistical significance of the evaluations

**Process**

These evaluations involved 10 participants, each trialing two difficulty modes (Easy and Hard). (Kosch et al., 2023) Initially, participants struggled to grasp the turn-based combat system and equipment mechanics, prompting us to add a short live demonstration. Participants then filled out the two questionnaires. Learning effects were offset by alternating the difficulty testing order for each participant.

---

#### Raw NASA TLX

**Subscale Workload Scores**

Across all six subscales, the median scores for all participants increased with difficulty (Table 2). The largest change was in Frustration, which rose from a median of 25 (easy) to 60 (hard). Other sizeable increases were seen in Effort and Temporal Demand.

<div align="center"><p><strong>Table 2</strong><br>NASA TLX Subscale Median Scores (Easy vs Hard)</p></div>

| Scale | Median (Easy) | Median (Hard) | Δ Median |
|-------|:-------------:|:-------------:|:--------:|
| Mental Demand | 30 | 55 | +25 |
| Physical Demand | 10 | 15 | +5 |
| Temporal Demand | 20 | 50 | +30 |
| Frustration | 25 | 60 | +35 |
| Effort | 30 | 55 | +25 |
| Performance | 60 | 75 | +15 |

**Overall Perceived Workload Scores**

All participants reported an increased perceived workload at higher difficulty levels (Figure 2). Learning effects were offset with alternating the difficulty testing order for each participant.

<p align="center">
  <img src="./documents/nasatlx_figure.png" width="750">
  <br>
  <em>Figure 2: Mean NASA TLX Scores for Each Participant (Easy vs Hard)</em>
</p>

**Statistical Analysis**

A Wilcoxon Signed-Rank test was performed at both a subscale and overall level to ascertain the statistical significance of the change at varying levels of detail. The results (Table 3) show that increasing difficulty produced a statistically significant difference in overall perceived workload, and in all subscales except physical demand.

<div align="center"><p><strong>Table 3</strong><br>Wilcoxon Signed-Rank Test Results for NASA TLX</p></div>

| Scale | W Test Statistic | Critical Value | Statistical Significance |
|-------|:----------------:|:--------------:|:------------------------:|
| Mental Demand | 3 | 8 | Yes |
| Physical Demand | 12 | 8 | No |
| Temporal Demand | 1 | 8 | Yes |
| Frustration | 2 | 8 | Yes |
| Effort | 0 | 8 | Yes |
| Performance | 4 | 8 | Yes |
| Overall Perceived Workload | 0 | 8 | Yes |

**Solutions and Adjustments**

Since the data show that higher difficulty led to significant increases in median frustration, temporal demand, and effort, we made several design changes to maintain challenge without increasing frustration:
- Rebalanced the encounter table so that early-stage enemies scale more gradually in difficulty.
- Added more healing opportunities through altars and item drops to reduce perceived effort.
- Introduced clearer boss battle warnings and a turn-based countdown so players could plan their strategy, reducing temporal pressure.
- Ensured that difficulty increases felt rewarding by providing better loot drops at higher difficulty, giving players a sense of accomplishment.

---

#### System Usability Scale (SUS)

**Process**

After completing the NASA TLX, all 10 participants completed the SUS, which consists of 10 standardised questions assessing overall system usability (Lewis, 2018). Scores were calculated using standard SUS methodology.

**Raw Data**

The raw SUS responses from all 10 participants are shown below (Table 4 and Table 5). Each row represents one participant, with scores on a 1–5 Likert scale (1 = Strongly Disagree, 5 = Strongly Agree).

<div align="center"><p><strong>Table 4</strong><br>Raw SUS questionnaire responses (Easy difficulty)</p></div>

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

<div align="center"><p><strong>Table 5</strong><br>Raw SUS questionnaire responses (Hard difficulty)</p></div>

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

> **Note on SUS scoring:** For odd-numbered items (1, 3, 5, 7, 9) the score contribution is the scale position minus 1. For even-numbered items (2, 4, 6, 8, 10) the contribution is 5 minus the scale position. The sum of all contributions is then multiplied by 2.5 to obtain an overall SUS score between 0 and 100.

**Results**

The individual SUS scores are shown in Figure 3, with the industry average benchmark of 68 shown for comparison.
- Mean SUS score (Easy) — 69.25
- Mean SUS score (Hard) — 58.25

<p align="center">
  <img src="./documents/sus_figure.png" width="750">
  <br>
  <em>Figure 3: SUS Scores for Each Participant (Easy vs Hard)</em>
</p>

While several participants rated the harder difficulty below the average usability benchmark, the easy difficulty scores clustered around or above the 68 benchmark. This suggests that our game had acceptable usability at normal difficulty, but the harder mode introduced some usability friction, likely due to increased complexity of enemy encounters and tighter turn limits.

**Statistical Analysis**

A Wilcoxon Signed-Rank test was performed on the SUS scores for both difficulties. The critical value was 8 (N = 10, α = 0.05), and the W Test statistic was calculated to be 0, indicating that there was a statistically significant difference between usability at different difficulty levels.

**Solutions and Adjustments**

While the SUS confirmed reasonable usability at the easy level, the drop in scores at hard difficulty highlighted areas for improvement. We found the SUS less directly applicable than our qualitative and NASA TLX evaluations for informing specific design changes. Nonetheless, it served as a valuable confirmation of the overall trend. We noted potential questionnaire fatigue due to administering the SUS immediately after the NASA TLX, which may have affected response quality. In future iterations, we would schedule breaks or separate the two evaluations. Based on the results, we focused on:
- Simplifying the hard difficulty combat UI to reduce cognitive load.
- Adding more in-combat tooltips explaining enemy abilities and status effects.
- Improving the inventory management flow so players spend less time navigating menus.

---

### Testing

#### White Box Testing

We used Jest unit testing to verify our game code's logic, focusing on game states, ensuring that triggering functions produced expected changes in the game state. Due to the game's complexity, particularly the turn-based combat system and status effect interactions, this was quite a difficult step, so we concentrated on testing the classes and methods that controlled combat mechanics, status effect processing, and encounter generation, as these were the most likely to affect gameplay correctness. We used a range of Jest mocking to help construct testable game states.

**Example — Status Effect Testing:** Our game features multiple status effects (burn, poison, shield, heal aura) that tick at the start of each unit's turn. We tested their application and duration using a range of assertions. This was aided by using the modular status effect system in the CombatManager class. An excerpt is shown below.

**Example — Encounter Table Testing:** We also tested our encounter generation system to ensure the correct enemy groups spawn at each difficulty level.

#### Black Box Testing

We also conducted extensive black box testing throughout development. A develop branch allowed us to merge updates and test repeatedly, identifying bugs before deploying the code on the main branch. We paid particular attention to edge cases in combat (such as simultaneous status effects, zero-HP interactions, and boss phase transitions) and map generation (ensuring all tile types rendered correctly and events triggered as expected).


### Process 
[this is our kanboard](https://caojunjian2025.atlassian.net/jira/software/projects/KAN/boards/1)

Our team adopted a hybrid collaboration model combining both online and offline working modes, which proved to be highly flexible and allowed us to identify and resolve issues in a timely manner throughout the development process.

#### Online Collaboration

* The backbone of our online communication was a weekly team meeting held via a voice channel application called OOPZ. These regular sessions gave every member a dedicated space to share their individual progress, discuss blockers they had encountered, and evaluate the work completed since the previous meeting. Crucially, they also served as a forum for constructive peer feedback — members could propose improvements to each other's implementations and collectively agree on the priorities for the upcoming development phase. This rhythm of structured, recurring communication kept the entire team aligned and prevented misunderstandings from snowballing into larger problems.

* To complement our meetings, we adopted Jira as our Kanban management tool. After each meeting, individual tasks were broken down and placed onto the Kanban board, giving everyone a clear, at-a-glance view of their own responsibilities and those of their teammates. This transparency was invaluable: rather than relying on informal memory or fragmented chat messages, the board served as a single source of truth for the project's current state.

For version control, we followed a disciplined Git workflow: pull → edit → commit → push. We used IntelliJ IDEA as our primary development environment, which provided convenient built-in Git integration. Our agreed convention was to create a new branch for each feature or fix and only merge into the main branch after the changes had been reviewed and tested during a team meeting. This practice allowed members to browse each other's pre-written function stubs and interface definitions, making cross-module integration significantly smoother.

#### Offline Collaboration

Beyond our digital tools, we made full use of our scheduled in-person class time. Each week, team members brought their own laptops to the classroom, where we could discuss technical challenges face-to-face and engage in pair programming on the spot. This real-time, side-by-side collaboration proved especially effective for solving complex problems that were difficult to articulate through text or voice alone. Being physically present together created an energy and immediacy that online tools simply could not replicate.

#### Team Roles

Every member of our team was involved in programming work, which reflected the complexity and scope of the game we set out to build. Given the large number of functional modules required, we divided responsibilities roughly along the following lines: inventory system, combat system, map generation, event handling, finite state machine, and item data. However, it is worth emphasising that these modules were far from isolated — they were deeply interconnected. For instance, the item system fed into both the inventory and combat modules; the event system interacted with the map; and the state machine threaded through virtually every other component. As a result, clear inter-member communication and regular pair programming were not merely helpful, but essential.

#### Challenges and How We Adapted

The tight coupling between modules created real difficulties, particularly in the early stages of the project. Our most persistent pain point was Git merge conflicts. When multiple members edited overlapping areas of the codebase simultaneously, merging branches into main often produced a tangled mess of conflicts that cost us significant time and frustration to resolve.

Recognising this as a structural problem rather than a one-off incident, we adapted our workflow. We introduced stricter branch ownership conventions so that overlapping edits were less likely to occur in the first place, and we made a point of communicating in real time — via Oopz online, or in person in the classroom or our shared accommodation — whenever two members were working on interdependent features. This meant that integration issues could be caught and negotiated before they ever reached the merge stage.

Looking back, the early turbulence with version control was genuinely challenging, but it pushed us to develop better habits and a more disciplined approach to collaboration. By the latter half of the project, our hybrid online-offline model had matured into a workflow that felt natural and efficient. More than the technical skills we developed, the experience strengthened our interpersonal relationships and built a genuine sense of mutual trust within the team — something we consider one of the most valuable outcomes of this project.


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
  - Organize your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organized? Is code well commented throughout?
