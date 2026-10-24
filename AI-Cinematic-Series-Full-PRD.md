
# AI Cinematic Series Platform
## Comprehensive Product Requirements Document (PRD)

Version: 1.0
Status: Draft
Audience: Product Owner, Development Team, UI/UX Team

---

# Executive Summary

This platform is a Story Operating System for AI Filmmaking. It will act as the single source of truth for story development, screenplay management, world-building, production planning, asset management, and future AI video generation.

The system is intended for a small creative team (1-10 users) producing a cinematic television series where content may eventually be generated using AI video tools.

---

# Vision

Build a centralized knowledge platform capable of:

- Managing the story universe
- Organizing screenplay content
- Maintaining continuity and canon
- Managing production assets
- Preparing AI generation prompts
- Supporting human and AI-assisted production
- Providing a future public-facing story encyclopedia

---

# Product Objectives

1. Create a structured story database.
2. Enable screenplay authoring through Episodes → Acts → Scenes → Clips.
3. Maintain consistency across characters, locations and lore.
4. Organize reference images, audio and generated assets.
5. Make every clip AI-generation ready.
6. Provide production tracking.
7. Support future integrations with AI video models.

---

# User Roles

## Administrator
- Full access
- Manage users
- Configure project settings
- Delete content

## Writer
- Manage story bible
- Create episodes
- Create scenes
- Create clips
- Edit dialogue

## Producer
- Review progress
- Manage assets
- Track production status

## Viewer (Future)
- Read-only access

---

# System Architecture

```
Series
 ├── Story Bible
 ├── Characters
 ├── Locations
 ├── Artifacts
 ├── Organizations
 ├── Timeline
 ├── Seasons
 │    └── Episodes
 │          └── Acts
 │                └── Scenes
 │                      └── Clips
 └── Assets
```

---

# Story Bible Module

## Premise
One page summary of the series.

## Themes
Examples:
- Identity
- Freedom
- Memory
- Justice

## Canon Rules
Rules defining the universe and continuity.

## Lore
Historical and background information.

## Timeline
Chronological events.

Required features:
- Rich text editing
- Linking to characters
- Linking to episodes
- Cross references

---

# Character Module

## Fields

```yaml
Name
Aliases
Role
Biography
Goals
Motivations
Fears
Relationships
Status
```

## AI Fields

```yaml
Visual Description
Voice Description
Costume Description
Mannerisms
Reference Images
Reference Videos
```

## Relationships

Character should link to:
- Episodes
- Scenes
- Clips
- Locations
- Artifacts

---

# Location Module

Represents reusable virtual sets.

Fields:

```yaml
Name
Description
Architecture
Mood
Lighting
Environment
Weather
Importance
```

AI Metadata:

```yaml
Image Prompt
Environment Prompt
Video Prompt
```

---

# Artifact Module

Fields:

```yaml
Name
Description
Type
Origin
Current Owner
Importance
```

---

# Organization Module

Fields:

```yaml
Name
Purpose
Leadership
Members
Description
Relationships
```

---

# Episode Management

Fields:

```yaml
Episode Number
Title
Synopsis
Season
Status
Estimated Runtime
```

Statuses:

- Draft
- Review
- Approved
- Production
- Complete

---

# Act Management

Fields:

```yaml
Act Number
Summary
Purpose
```

---

# Scene Management

Fields:

```yaml
Scene Number
Summary
Location
Purpose
Characters
```

---

# Clip Management (Core Entity)

Each clip represents a small cinematic segment.

Target duration:

```text
5-8 seconds
Preferred: 7 seconds
```

## Story Data

```yaml
Clip ID
Story Beat
Action
Dialogue
Emotion
Purpose
```

## Cinematic Data

```yaml
Camera Shot
Camera Angle
Camera Movement
Composition
Lens
Lighting
```

## Audio Data

```yaml
Voice
Ambient Audio
SFX
Music
```

## AI Generation Data

```yaml
Image Prompt
Video Prompt
Voice Prompt
Audio Prompt
Negative Prompt
```

## Production Status

```text
Planned
Ready
Generated
Review
Approved
Final
```

---

# Dialogue Module

Fields:

```yaml
Character
Dialogue
Emotion
Delivery Notes
```

Benefits:
- Subtitle generation
- Voice generation
- Translation

---

# Asset Library

Supported asset types:

- Images
- Videos
- Audio
- Music
- Storyboards
- Documents

Metadata:

```yaml
Title
Description
Tags
Version
Linked Entity
Upload Date
```

---

# Search Requirements

Global search must support:

- Characters
- Locations
- Episodes
- Scenes
- Clips
- Assets
- Lore
- Artifacts

Filters:

- Tags
- Status
- Date
- Entity Type

---

# Dashboard Requirements

Metrics:

- Total Episodes
- Total Scenes
- Total Clips
- Completed Clips
- Pending Clips
- Generated Clips

Visual progress bars:

- Writing Progress
- Production Progress
- Asset Progress

---

# Public Site (Future)

Public navigation:

```
Home
World
Characters
Locations
Artifacts
Timeline
Episodes
Gallery
```

Viewers cannot modify content.

---

# Permissions

Role-based access control.

Capabilities:

| Feature | Admin | Writer | Producer |
|----------|--------|---------|----------|
| User Management | Yes | No | No |
| Story Bible | Yes | Yes | Read |
| Episodes | Yes | Yes | Read |
| Assets | Yes | Read | Yes |
| Production Status | Yes | Read | Yes |

---

# Technology Recommendations

Frontend:
- Next.js
- TypeScript
- Tailwind CSS

Backend:
- Node.js
- NestJS

Database:
- PostgreSQL

ORM:
- Prisma

Storage:
- Azure Blob Storage or AWS S3

Authentication:
- Microsoft Entra ID or Auth.js

---

# UI/UX Guidelines

Theme:
- Light cinematic workspace
- Story-first design
- Knowledge-base style navigation

Colors:

```css
Background: #F8F6F2;
Text: #1F2937;
Accent: #6B7280;
```

Fonts:
- Playfair Display (headings)
- Inter (body)

---

# Future Roadmap

Phase 1
- Story bible
- Characters
- Locations
- Episodes
- Scenes
- Clips

Phase 2
- Asset management
- Prompt management
- Production tracking

Phase 3
- AI video integrations
- Automated prompt generation
- Story consistency validation

Phase 4
- Public encyclopedia
- Viewer portal
- Fan wiki

---

# Final Vision

This platform is not a screenplay editor.

It is a Knowledge Graph and Production Operating System for a cinematic universe. Scripts, prompts, assets, timelines, AI-generated videos, and public encyclopedia pages should all originate from a single structured source of truth.
