# SNØ SKIΔ

A 3D ski slalom game built with WebGPU and a custom rendering engine.

## About

SnoSki is a skiing game where players navigate through a slalom course with alternating red and blue gates.

## Project Structure

```
SnoSki/
├── src/
│   ├── engine/           # Custom WebGPU game engine
│   │   ├── core/         # Core components (Entity, Camera, Transform, etc.)
│   │   ├── renderers/    # Rendering pipeline (UnlitRenderer + WGSL shaders)
│   │   ├── loaders/      # Resource loaders (GLTF, OBJ, Image, JSON)
│   │   ├── systems/      # Game systems (Update, Resize)
│   │   ├── controllers/  # Camera controllers (FirstPerson, Orbit, Turntable)
│   │   └── animators/    # Animation utilities
│   ├── game/            # Main game implementation
│   │   ├── index.html   # Entry point
│   │   └── main.js      # Game logic and scene setup
│   ├── lib/             # Third-party libraries (dat.gui, glMatrix)
│   └── models/          # 3D models and textures
│       ├── cube/        # Cube mesh
│       └── snow/        # Snow textures
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser with **WebGPU support** (Chrome 113+, Edge 113+, or Firefox Nightly)
- A local web server (required for ES6 modules)

## Features

### Current Implementation

- ✅ 3D rendering with WebGPU
- ✅ Textured slope with snow material
- ✅ Procedurally generated trees along the course
- ✅ Color-coded slalom gates (alternating red/blue)
- ✅ Camera system with configurable perspective

### Planned Features

- 🔲 Player movement and physics
- 🔲 Gate collision detection
- 🔲 Score tracking and timing system
- 🔲 Camera following the skier
- 🔲 Game over conditions
- 🔲 Audio effects

## Engine Architecture

The custom engine follows a modular **Entity-Component-System (ECS)** pattern:

## 🛠️ Technologies

- **WebGPU**: Next-generation graphics API
- **WGSL**: WebGPU Shading Language
- **ES6 Modules**: Modern JavaScript architecture
- **glMatrix (glm)**: Mathematics library for 3D transformations
- **dat.GUI**: Development UI controls

 and WebGPU*
