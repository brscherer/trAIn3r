# 🧠 Natural Strength Tracker — MVP Implementation Guide

## 🎯 Objective

Build a **mobile app (local-only)** to track:

- workouts
- progression (strength)
- fatigue
- body weight

The app must be:
- offline-first
- zero-cost
- optimized for fast usage during workouts

---

# 🏗️ Architecture

## Tech Stack

- Mobile: React Native (Expo) + TypeScript
- Navigation: React Navigation
- Storage: Expo SQLite (local database)
- State: React hooks (TanStack Query optional)

## Constraints

- NO backend
- NO authentication
- NO cloud
- Everything runs locally on device

---

# 📦 Core Features (MVP)

## 1. Workout Logging

User must be able to:

- create workout
- add exercises
- add sets:
  - reps
  - weight
  - RIR

---

## 2. Progression Engine

Rule:

IF reps >= maxRange  
→ increase weight  

ELSE  
→ maintain  

---

## 3. Fatigue Tracking

Inputs:

- energy (1–5)
- soreness (1–5)
- performance (1–5)

Formula:

fatigueScore = (6 - energy) + soreness + (6 - performance)

If fatigueScore > threshold:
→ show warning

---

## 4. Weight Tracking

- daily input
- weekly average
- trend visualization

---

## 5. CSV Import (IMPORTANT FEATURE)

App must support importing training plans via CSV.

### Required format:

day,type,exercise,week,sets,reps,weight,rir

### Rules:

- Validate structure before importing
- Reject invalid files
- Group workouts by:
  - day
  - week

---

# 🧬 Database Schema

## Workout

- id
- date
- type

## ExerciseLog

- id
- workoutId
- name

## SetLog

- id
- exerciseLogId
- reps
- weight
- rir

## UserMetrics

- id
- date
- weight
- energy
- soreness
- performance

---

# 🧩 Project Structure

src/
  features/
    workout/
    metrics/
    progression/
    csv-import/
  components/
  database/
  navigation/
  screens/

---

# 🧪 Requirements

- Code must be modular
- No unnecessary abstractions
- Keep UI simple and fast
- Optimize for minimal taps during workout

---

# 🚀 Development Plan (Milestones)

## Milestone 1 — Setup

- Create Expo app
- Setup navigation
- Create base screens

---

## Milestone 2 — Database

- Setup SQLite
- Create tables
- Create data access layer

---

## Milestone 3 — Workout Logging

- Create workout flow
- Add exercises
- Add sets
- Persist data

---

## Milestone 4 — Progression Engine

- Implement logic
- Connect to workout UI
- Show suggestions

---

## Milestone 5 — Metrics

- Add fatigue input
- Add weight tracking
- Store and retrieve data

---

## Milestone 6 — CSV Import

- Parse CSV
- Validate format
- Insert into database
- Show preview before import

---

## Milestone 7 — Dashboard

- Show:
  - last workout
  - progression suggestions
  - fatigue status
  - weight trend

---

# ⚙️ Execution Rules (VERY IMPORTANT)

- Implement ONE milestone at a time
- After each milestone:
  - ensure app runs
  - fix errors before proceeding

- Do NOT skip steps
- Do NOT implement future features early

---

# 📦 Output Requirements

- Working Expo app
- `npm install` works
- `npx expo start` runs successfully
- No broken screens

---

# ⚠️ Anti-Patterns to Avoid

- Overengineering
- Adding backend
- Complex UI libraries
- Premature optimization

---

# 🎯 Success Criteria

The app should:

- Run on mobile via Expo Go
- Allow fast workout logging
- Suggest next weights
- Track fatigue and weight
- Import CSV successfully

---

# 🧠 Engineering Principles

- Simplicity first
- Optimize for real usage (gym scenario)
- Progressive enhancement (MVP → improve later)

---

# 🚀 Start Here

1. Generate implementation plan
2. Execute Milestone 1
3. Stop and verify
4. Continue sequentially