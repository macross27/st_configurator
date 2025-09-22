# 3D Model Assets

This directory contains GLB model files for the Hybrid GLB Model System.

## Current Models

- `model.gltf` - Default fallback model (usually a plane geometry)
- `shirt.glb` - T-shirt uniform model (placeholder)
- `hoodie.glb` - Hooded sweatshirt model (placeholder) 
- `pants.glb` - Pants/trousers model (placeholder)
- `jacket.glb` - Jacket/blazer model (placeholder)

## Adding New Models

1. Place GLB files in this directory
2. Update the model list in `main.js` -> `initializeModelSelector()`
3. Models should be optimized for web viewing (low poly count, compressed textures)
4. All embedded textures will be ignored - the texture editor generates the final texture

## Model Requirements

- **Format**: GLB (binary GLTF) preferred for single-file deployment
- **Size**: Recommended < 5MB per model
- **Geometry**: Optimized for web (< 50k vertices)
- **Textures**: Will be replaced by texture editor output
- **Materials**: Will be converted to MeshLambertMaterial with shared texture

## Performance Considerations

- Models are cached in memory using the ModelCache system
- Large models may be evicted based on LRU (Least Recently Used) algorithm
- Background preloading occurs for adjacent models
- Memory usage is monitored and optimized automatically

## Testing Models

The system gracefully handles missing model files:
- Failed loads don't break the system
- Error messages are shown to users
- Fallback to previous/working model occurs automatically