# SNØ SKIΔ

A 3D ski slalom game built with WebGPU and a custom rendering engine.

## Project Structure

```
SnoSki/
├── src/
│   ├── engine/              # Custom WebGPU game engine
│   │   ├── core/            # Core components (Entity, Camera, Transform, Material, etc.)
│   │   ├── renderers/       # Rendering pipeline (UnlitRenderer with WGSL shaders)
│   │   ├── loaders/         # Resource loaders (GLTF, Image, JSON)
│   │   ├── systems/         # Game systems (Update, Resize, ParticleSystem)
│   │   ├── controllers/     # Input controllers (SkierController)
│   │   ├── animators/       # Animation utilities (EasingFunctions, LinearAnimator, etc.)
│   │   ├── WebGPU.js        # WebGPU device initialization
│   │   └── WebGPUMipmaps.js # Mipmap generation for textures
│   ├── game/                # Game logic
│   │   ├── index.html       # Entry point
│   │   ├── main.js          # Scene setup, entities, game loop
│   │   ├── GameState.js     # Game state management
│   │   ├── CollisionDetection.js # Collision detection logic
│   │   └── assets/audio/    # Sound effects and music
│   ├── lib/                 # Third-party libraries (dat.gui, glMatrix)
│   └── models/              # 3D models and textures
│       ├── skier/           # Player model with textures
│       ├── tree/            # Tree models (GLTF format)
│       ├── trunk/           # Dead tree trunk models
│       ├── coin/            # Collectible coin models
│       ├── finish2/         # Finish gate model
│       ├── skybox/          # Panoramic sky textures
│       ├── snow/            # Snow material textures
│       └── cube/            # Cube mesh (for slope and gates)
```

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Start a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (with http-server)
   npx http-server
   ```
4. Open `http://localhost:8000/src/game/` in your browser

## Highlighted Features

- **3D Rendering with WebGPU** - Modern GPU graphics pipeline
- **Slalom Course** - 22 color-coded gates (alternating red/blue) with obstacles and collectibles
- **Trail Effect** - Visual trail for player movement
- **A Ghost** - Visual representation of player's previous attempt
- **Camera System** - A third-person perspective
- **Panoramic Skybox** - Alpine background environment
- **Collision Detection** - Gate passing, tree/obstacle collision, coin collection
- **Player Animation** - Smooth skiing movement and rotation


## Utilised tools/technologies

- **WebGPU** - Graphics API
- **WGSL** - WebGPU Shading Language
- **ES6 Modules** - Modern JavaScript module system
- **glMatrix** - 3D mathematics library
- **dat.GUI** - Interactive UI controls
- **GLTF** - 3D model format support

## Game Architecture

The engine uses an **Entity-Component-System (ECS)** pattern:

- **Entities** - Game objects (camera, slope, trees, player, coins)
- **Components** - Attributes (Transform, Material, Model, Skybox, Parent)
- **Systems** - Logic handlers (UpdateSystem, ResizeSystem, ParticleSystem)


## Graphics Concepts Implemented

- **Scene Graph** - Hierarchical entity relationships
- **Texture Mapping** - 2D textures with sampling
- **Mipmapping** - Automatic LOD texture generation
- **Anisotropic Filtering** - Texture filtering at different angles
- **Vertex/Fragment Shaders** - GPU-accelerated rendering
- **Color Interpolation** - Smooth color blending across polygons
- **Skyboxes** - Immersive background rendering