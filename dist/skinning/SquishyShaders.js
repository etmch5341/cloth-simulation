// Vertex shader for shaded rendering
export const squishyVSText = `
    precision mediump float;
    
    // Vertex attributes
    attribute vec3 vertPosition;
    attribute vec3 vertNormal;
    attribute vec3 vertColor;
    
    // Transformation matrices
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    
    // Light position
    uniform vec4 lightPosition;
    
    // Output to fragment shader
    varying vec3 fragColor;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec4 lightDir;
    
    void main() {
        // Transform position to world space
        vec4 worldPosition = mWorld * vec4(vertPosition, 1.0);
        
        // Pass position to fragment shader
        fragPosition = worldPosition.xyz;
        
        // Transform to clip space
        gl_Position = mProj * mView * worldPosition;
        
        // Transform normal to world space (assuming uniform scaling for simplicity)
        fragNormal = normalize((mWorld * vec4(vertNormal, 0.0)).xyz);
        
        // Compute light direction (not normalized yet)
        lightDir = lightPosition - worldPosition;
        
        // Pass color to fragment shader
        fragColor = vertColor;
    }
`;
// Fragment shader for shaded rendering
export const squishyFSText = `
    precision mediump float;
    
    // Inputs from vertex shader
    varying vec3 fragColor;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec4 lightDir;
    
    // Lighting parameters
    uniform float ambientIntensity;
    uniform float diffuseIntensity;
    uniform float specularIntensity;
    uniform float shininess;
    
    void main() {
        // Normalize vectors
        vec3 N = normalize(fragNormal);
        vec3 L = normalize(lightDir.xyz);
        
        // Calculate diffuse lighting
        float diffuseFactor = max(dot(N, L), 0.0);
        
        // Calculate specular lighting (Blinn-Phong)
        vec3 viewDir = normalize(-fragPosition); // Assuming camera at origin
        vec3 H = normalize(L + viewDir); // Half vector
        float specularFactor = pow(max(dot(N, H), 0.0), shininess);
        
        // Apply lighting to base color
        vec3 finalColor = fragColor * (ambientIntensity + diffuseIntensity * diffuseFactor) + 
                         vec3(1.0, 1.0, 1.0) * specularIntensity * specularFactor;
        
        // Add a subtle fresnel effect to enhance the squishy look
        float fresnelFactor = 1.0 - max(0.0, dot(N, viewDir));
        fresnelFactor = pow(fresnelFactor, 2.0) * 0.5;
        
        finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), fresnelFactor);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
// Vertex shader for wireframe rendering
export const squishyWireframeVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    
    void main() {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;
// Fragment shader for wireframe rendering
export const squishyWireframeFSText = `
    precision mediump float;
    
    uniform vec3 wireColor;
    
    void main() {
        gl_FragColor = vec4(wireColor, 1.0);
    }
`;
// Vertex shader for point rendering
export const squishyPointsVSText = `
    precision mediump float;
    
    attribute vec3 vertPosition;
    attribute float isFixed;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform float pointSize;
    
    varying float vIsFixed;
    
    void main() {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
        gl_PointSize = pointSize;
        vIsFixed = isFixed;
    }
`;
// Fragment shader for point rendering
export const squishyPointsFSText = `
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
        
        // Add a slight inner highlight
        float highlight = smoothstep(0.5, 0.0, dist);
        color = mix(color, vec3(1.0, 1.0, 1.0), highlight * 0.3);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
//# sourceMappingURL=SquishyShaders.js.map