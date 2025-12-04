struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(1) texcoords: vec2f,
    @location(2) worldPos: vec3f,
    @location(3) normal: vec3f,
}

struct FragmentInput {
    @location(1) texcoords: vec2f,
    @location(2) worldPos: vec3f,
    @location(3) normal: vec3f,
}

struct FragmentOutput {
    @location(0) color: vec4f,
}

struct CameraUniforms {
    viewMatrix: mat4x4f,
    projectionMatrix: mat4x4f,
    cameraPos: vec3f,
    _padding: f32,
}

struct ModelUniforms {
    modelMatrix: mat4x4f,
    normalMatrix: mat3x3f,
}

struct MaterialUniforms {
    baseFactor: vec4f,
    uvScale: vec2f,
    _padding: vec2f,
}

struct LightUniforms {
    position: vec3f,
    intensity: f32,
    color: vec3f,
    ambientStrength: f32,
    direction: vec3f,      // Smer svetlobe (spotlight)
    spotAngle: f32,        // Kot spot kota v radianih
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@group(1) @binding(0) var<uniform> model: ModelUniforms;

@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var baseSampler: sampler;

@group(3) @binding(0) var<uniform> light: LightUniforms;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    let worldPos = (model.modelMatrix * vec4(input.position, 1.0)).xyz;
    output.position = camera.projectionMatrix * camera.viewMatrix * vec4(worldPos, 1.0);
    output.texcoords = input.texcoords;
    output.worldPos = worldPos;
    output.normal = normalize(model.normalMatrix * input.normal);
    
    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    
    let scaledUV = input.texcoords * material.uvScale;
    let baseColor = textureSample(baseTexture, baseSampler, scaledUV) * material.baseFactor;
    
    // Ambient
    let ambient = baseColor.rgb * light.ambientStrength;
    
    // Light direction
    let toLight = light.position - input.worldPos;
    let lightDir = normalize(toLight);
    let normal = normalize(input.normal);
    
    // Diffuse lighting
    let diff = max(dot(normal, lightDir), 0.0);
    
    // Distance attenuation
    let dist = length(toLight);
    let attenuation = 1.0 / (0.1 + dist * 0.08);
    
    // Spotlight cone effect - pravi spotlight
    let spotDir = normalize(light.direction);
    let spotCos = dot(-lightDir, spotDir);
    let spotAngleCos = cos(light.spotAngle);
    
    // Smoothstep za mehak rob spotlight cone
    let spotIntensity = smoothstep(spotAngleCos - 0.1, spotAngleCos, spotCos);
    
    let diffuse = diff * baseColor.rgb * light.color * attenuation * spotIntensity;
    
    // Specular
    let viewDir = normalize(camera.cameraPos - input.worldPos);
    let halfDir = normalize(lightDir + viewDir);
    let spec = pow(max(dot(normal, halfDir), 0.0), 16.0);
    let specular = spec * light.color * 0.5 * attenuation * spotIntensity;
    
    // Final color: ambient + light
    let result = ambient + (diffuse + specular) * light.intensity;
    
    output.color = vec4(result, baseColor.a);
    return output;
}
