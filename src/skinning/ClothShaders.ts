export const clothVSText = `
    precision mediump float;
    
    // Vertex attributes
    attribute vec3 vertPosition;
    attribute vec3 vertNormal;
    attribute vec2 vertUV;
    
    // Transformation matrices
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    
    // Light position
    uniform vec4 lightPosition;
    
    // Output to fragment shader
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
    varying vec3 fragPosition;
    
    void main() {
        // Transform position to world space
        vec4 worldPosition = mWorld * vec4(vertPosition, 1.0);
        
        // Pass position to fragment shader
        fragPosition = worldPosition.xyz;
        
        // Transform to clip space
        gl_Position = mProj * mView * worldPosition;
        
        // Transform normal to world space
        normal = normalize(mWorld * vec4(vertNormal, 0.0));
        
        // Compute light direction
        lightDir = lightPosition - worldPosition;
        
        // Pass UV coordinates
        uv = vertUV;
    }
`;

export const clothFSText = `
    precision mediump float;
    
    // Inputs from vertex shader
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
    varying vec3 fragPosition;
    
    // Uniform parameters
    uniform vec3 materialColor;
    uniform float ambientIntensity;
    uniform float diffuseIntensity;
    uniform float specularIntensity;
    uniform float shininess;
    uniform vec3 cameraPosition;
    
    // Optional texture
    uniform sampler2D uTexture;
    uniform bool useTexture;
    
    void main() {
        // Normalize vectors
        vec3 N = normalize(normal.xyz);
        vec3 V = normalize(cameraPosition - fragPosition);
        
        // Check if we're viewing the back face
        // If dot product is negative, we're looking at the back face
        if (dot(N, V) < 0.0) {
            // Flip the normal for back-face lighting
            N = -N;
        }
        
        vec3 L = normalize(lightDir.xyz);
        vec3 H = normalize(L + V); // Half vector for Blinn-Phong
        
        // Calculate lighting components
        float ambient = ambientIntensity;
        
        // Diffuse lighting (Lambert's cosine law)
        float diffuseFactor = max(dot(N, L), 0.0);
        float diffuse = diffuseFactor * diffuseIntensity;
        
        // Specular lighting (Blinn-Phong)
        float specularFactor = pow(max(dot(N, H), 0.0), shininess);
        float specular = specularFactor * specularIntensity;
        
        // Get base color (from texture or material)
        vec3 baseColor = useTexture ? texture2D(uTexture, uv).rgb : materialColor;
        
        // Combine lighting components
        vec3 finalColor = baseColor * (ambient + diffuse) + vec3(1.0, 1.0, 1.0) * specular;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

export const clothWireframeVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    
    void main() {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;

export const clothWireframeFSText = `
    precision mediump float;
    
    uniform vec3 wireColor;
    
    void main() {
        gl_FragColor = vec4(wireColor, 1.0);
    }
`;

export const springVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    
    varying vec3 fragColor;
    
    void main() {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
        fragColor = vertColor;
    }
`;

export const springFSText = `
    precision mediump float;
    
    varying vec3 fragColor;
    
    void main() {
        gl_FragColor = vec4(fragColor, 1.0);
    }
`;

export const pointVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform float pointSize;
    
    // Pass through particle fixed status
    attribute float isFixed;
    varying float vIsFixed;
    
    void main() {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
        gl_PointSize = pointSize;
        vIsFixed = isFixed;
    }
`;

export const pointFSText = `
    precision mediump float;
    
    varying float vIsFixed;
    
    uniform vec3 freeColor;
    uniform vec3 fixedColor;
    
    void main() {
        // Calculate distance from center of point
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(gl_PointCoord, center);
        
        // Discard fragments outside the circle
        if (dist > 0.5) {
            discard;
        }
        
        // Use different colors for fixed vs free points
        vec3 color = vIsFixed > 0.5 ? fixedColor : freeColor;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Add sphere shaders for visualization
export const sphereVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    attribute vec3 vertNormal;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform vec4 lightPosition;
    
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec4 lightDir;
    
    void main() {
        // Transform to world space
        vec4 worldPosition = mWorld * vec4(vertPosition, 1.0);
        fragPosition = worldPosition.xyz;
        
        // Transform to clip space
        gl_Position = mProj * mView * worldPosition;
        
        // Pass normal to fragment shader
        fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
        
        // Light direction
        lightDir = lightPosition - worldPosition;
    }
`;

export const sphereFSText = `
    precision mediump float;
    
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec4 lightDir;
    
    uniform vec3 sphereColor;
    uniform vec3 cameraPosition;
    
    void main() {
        // Normalize vectors
        vec3 normal = normalize(fragNormal);
        vec3 lightDir = normalize(lightDir.xyz);
        vec3 viewDir = normalize(cameraPosition - fragPosition);
        vec3 halfVector = normalize(lightDir + viewDir);
        
        // Lighting calculations - INCREASED VALUES
        float ambient = 0.4;     // Increased from 0.2
        float diffuse = max(dot(normal, lightDir), 0.0) * 0.8;  // Increased from 0.6
        float specular = pow(max(dot(normal, halfVector), 0.0), 32.0) * 0.6;  // Increased from 0.4
        
        // Apply lighting to color
        vec3 finalColor = sphereColor * (ambient + diffuse) + vec3(1.0) * specular;
        
        // Ensure the color doesn't exceed 1.0 (optional)
        finalColor = min(finalColor, vec3(1.0));
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

/**
 * Vertex shader for skybox
 * Transforms skybox geometry based on camera rotation only (not position)
 */
export const skyboxVSText = `
    precision mediump float;
    
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;
    attribute vec4 aNorm;
    attribute vec3 aUV;  // Using 3D texture coordinates
    
    varying vec3 vPosition; // 3D position for noise sampling
    varying vec2 vUV;       // 2D coordinates for blending
    
    void main() {
        // Create view matrix without translation for skybox
        mat4 viewNoTranslation = mat4(
            uView[0][0], uView[0][1], uView[0][2], 0.0,
            uView[1][0], uView[1][1], uView[1][2], 0.0,
            uView[2][0], uView[2][1], uView[2][2], 0.0,
            0.0, 0.0, 0.0, 1.0
        );
        
        // Transform vertex by view and projection matrices
        vec4 pos = uProj * viewNoTranslation * aVertPos;
        
        // Set z = w so that the vertex is always at max depth
        gl_Position = pos.xyww;
        
        // Pass 3D position to fragment shader for noise sampling
        vPosition = aVertPos.xyz;
        
        // Pass 2D coordinates for face transitions
        vUV = aUV.xy;
    }
`;

/**
 * Fragment shader for skybox
 * Generates procedural sky and clouds using 3D Perlin noise
 */
export const skyboxFSText = `
    precision mediump float;
    
    uniform float uTime;
    
    varying vec3 vPosition;
    varying vec2 vUV;
    
    //--------------------------------------------------------------------
    // Noise generation utility functions
    //--------------------------------------------------------------------
    
    // Pseudo-random function
    float random(vec3 p) {
        p = fract(p * vec3(123.34, 234.34, 345.65));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y * p.z);
    }
    
    // 3D gradient function
    vec3 gradientRandom(vec3 p) {
        // Convert p to a pseudo-random vector direction
        float x = random(p);
        float y = random(p + vec3(123.0, 0.0, 0.0));
        float z = random(p + vec3(0.0, 456.0, 0.0));
        
        // Build a gradient
        return normalize(vec3(x, y, z) * 2.0 - 1.0);
    }
    
    // 3D Perlin noise implementation
    float perlinNoise3D(vec3 p) {
        // Cell corners
        vec3 pi = floor(p);
        vec3 pf = fract(p);
        
        // Smoothstep for interpolation
        vec3 s = pf * pf * (3.0 - 2.0 * pf);
        
        // Grid cell corners
        vec3 p000 = pi;
        vec3 p100 = pi + vec3(1.0, 0.0, 0.0);
        vec3 p010 = pi + vec3(0.0, 1.0, 0.0);
        vec3 p110 = pi + vec3(1.0, 1.0, 0.0);
        vec3 p001 = pi + vec3(0.0, 0.0, 1.0);
        vec3 p101 = pi + vec3(1.0, 0.0, 1.0);
        vec3 p011 = pi + vec3(0.0, 1.0, 1.0);
        vec3 p111 = pi + vec3(1.0, 1.0, 1.0);
        
        // Generate gradients
        vec3 g000 = gradientRandom(p000);
        vec3 g100 = gradientRandom(p100);
        vec3 g010 = gradientRandom(p010);
        vec3 g110 = gradientRandom(p110);
        vec3 g001 = gradientRandom(p001);
        vec3 g101 = gradientRandom(p101);
        vec3 g011 = gradientRandom(p011);
        vec3 g111 = gradientRandom(p111);
        
        // Compute dot products
        float v000 = dot(g000, pf - vec3(0.0, 0.0, 0.0));
        float v100 = dot(g100, pf - vec3(1.0, 0.0, 0.0));
        float v010 = dot(g010, pf - vec3(0.0, 1.0, 0.0));
        float v110 = dot(g110, pf - vec3(1.0, 1.0, 0.0));
        float v001 = dot(g001, pf - vec3(0.0, 0.0, 1.0));
        float v101 = dot(g101, pf - vec3(1.0, 0.0, 1.0));
        float v011 = dot(g011, pf - vec3(0.0, 1.0, 1.0));
        float v111 = dot(g111, pf - vec3(1.0, 1.0, 1.0));
        
        // Trilinear interpolation
        float v000v100 = mix(v000, v100, s.x);
        float v010v110 = mix(v010, v110, s.x);
        float v001v101 = mix(v001, v101, s.x);
        float v011v111 = mix(v011, v111, s.x);
        
        float v000v100v010v110 = mix(v000v100, v010v110, s.y);
        float v001v101v011v111 = mix(v001v101, v011v111, s.y);
        
        return mix(v000v100v010v110, v001v101v011v111, s.z) * 0.5 + 0.5;
    }
    
    // Fractal Brownian Motion (fbm) for smoother cloud patterns
    float fbm(vec3 p, int octaves, float persistence) {
        float total = 0.0;
        float frequency = 1.0;
        float amplitude = 1.0;
        float maxValue = 0.0;
        
        for (int i = 0; i < 6; i++) {
            if (i >= octaves) break;
            
            total += perlinNoise3D(p * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2.0;
        }
        
        return total / maxValue;
    }
    
    // Function to create seamless noise across cube faces
    float seamlessNoise(vec3 p, float scale) {
        // Use the normalized position directly
        vec3 scaledPos = p * scale;
        
        // Add time-based animation for cloud movement
        scaledPos.x += uTime * 0.05;
        
        // Use 3D FBM for clouds
        return fbm(scaledPos, 5, 0.5);
    }
    
    void main() {
        // Normalized direction from origin to vertex (for skybox sampling)
        vec3 direction = normalize(vPosition);
        
        // Sky gradient parameters
        vec3 topColor = vec3(0.5, 0.7, 1.0);      // Light blue at top
        vec3 horizonColor = vec3(0.8, 0.9, 1.0);  // White-blue at horizon
        vec3 bottomColor = vec3(0.5, 0.7, 1.0);     // Lighter blue below horizon

        // Cloud parameters
        vec3 cloudColor = vec3(1.0, 1.0, 1.0);   // White clouds
        float cloudDensity = 0.6;                // Cloud density factor
        float cloudSharpness = 2.0;              // Cloud edge sharpness
        
        // Sky gradient based on Y coordinate of direction
        float skyGradient = direction.y * 0.5 + 0.5; // Remap from [-1,1] to [0,1]
        vec3 skyColor;
        
        if (direction.y > 0.0) {
            // Above horizon: blend from horizon to top
            skyColor = mix(horizonColor, topColor, pow(skyGradient, 0.5));
        } else {
            // Below horizon: blend from horizon to bottom
            skyColor = mix(horizonColor, bottomColor, pow(1.0 - skyGradient, 0.5));
        }
        
        // Generate seamless 3D noise for clouds
        float noiseValue = seamlessNoise(direction, 3.0);
        
        // Shape noise into clouds with nice fluffy edges
        float cloudShape = smoothstep(0.4, 0.6, noiseValue);
        
        // Make clouds less dense near the horizon and denser at the top
        float verticalCloudFactor = smoothstep(0.0, 0.4, skyGradient);
        cloudShape *= verticalCloudFactor;
        
        // Add some depth variation to clouds
        float cloudDepth = seamlessNoise(direction * 1.5 + vec3(0.0, 0.0, uTime * 0.02), 5.0);
        cloudShape *= mix(0.7, 1.0, cloudDepth);
        
        // Add clouds to sky
        vec3 finalColor = mix(skyColor, cloudColor, cloudShape * cloudDensity);
        
        // Add a slight sun highlight
        vec3 sunDirection = normalize(vec3(1.0, 0.4, 0.6));
        float sunDot = max(0.0, dot(direction, sunDirection));
        float sunHighlight = pow(sunDot, 32.0);
        finalColor += vec3(1.0, 0.9, 0.7) * sunHighlight * 0.3;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;