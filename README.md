# SnoSki ⛷️

A 3D ski slalom game built with WebGPU and a custom rendering engine.

## 🎮 About

SnoSki is a skiing game where players navigate through a slalom course with alternating red and blue gates. The game features:

- **Realistic 3D environment** with a snowy slope, trees, and slalom gates
- **WebGPU rendering** for high-performance graphics
- **Custom game engine** with modular components
- **Dynamic gate system** with color-coded slalom course

## 🏗️ Project Structure

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

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Tide03/SnoSki.git
   cd SnoSki
   ```

2. **Start a local web server:**
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Or using Node.js:
   ```bash
   npx http-server
   ```

3. **Open in browser:**
   ```
   http://localhost:8000/src/game/index.html
   ```

## 🎯 Features

### Current Implementation

- ✅ 3D rendering with WebGPU
- ✅ Entity-Component-System architecture
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

## 🎨 Engine Architecture

The custom engine follows a modular **Entity-Component-System (ECS)** pattern:

### Core Components

- **Entity**: Base container for game objects
- **Transform**: Position, rotation, and scale
- **Camera**: Viewport and projection settings
- **Model**: 3D mesh with materials
- **Material**: Textures and color properties
- **Primitive**: Mesh geometry with material binding

### Rendering Pipeline

- **UnlitRenderer**: Main WebGPU renderer with shader support
- **BaseRenderer**: Abstract renderer base class
- Supports texture mapping with customizable samplers
- WGSL shader pipeline for modern GPU programming

### Systems

- **UpdateSystem**: Game loop management
- **ResizeSystem**: Responsive canvas handling

## 🛠️ Technologies

- **WebGPU**: Next-generation graphics API
- **WGSL**: WebGPU Shading Language
- **ES6 Modules**: Modern JavaScript architecture
- **glMatrix (glm)**: Mathematics library for 3D transformations
- **dat.GUI**: Development UI controls

## 📝 License

This project was created as part of a computer graphics course (RGTI) at university.

## 👤 Author

**Tide03**

---

*Built with ❄️ and WebGPU*
