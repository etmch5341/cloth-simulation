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
        
        // Lighting calculations
        float ambient = 0.2;
        float diffuse = max(dot(normal, lightDir), 0.0) * 0.6;
        float specular = pow(max(dot(normal, halfVector), 0.0), 64.0) * 0.4;
        
        // Apply lighting to color
        vec3 finalColor = sphereColor * (ambient + diffuse) + vec3(1.0) * specular;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
//# sourceMappingURL=ClothShaders.js.map