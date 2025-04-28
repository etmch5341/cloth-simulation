export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
    }
`;
export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        gl_FragColor = vec4(clamp(dot_nl * color, 0.0, 1.0), 1.0);
    }
`;
// export const sceneVSText = `
//     precision mediump float;
//     // Original vertex attributes
//     attribute vec3 vertPosition;
//     attribute vec2 aUV;
//     attribute vec3 aNorm;
//     // Skinning attributes
//     attribute vec4 skinIndices;  // Indices of bones affecting this vertex (up to 4)
//     attribute vec4 skinWeights;  // Weights of each bone's influence (should sum to 1)
//     // Vertex positions in bone local coordinates
//     attribute vec4 v0;  // Position in the coordinate system of bone skinIndices[0]
//     attribute vec4 v1;  // Position in the coordinate system of bone skinIndices[1]
//     attribute vec4 v2;  // Position in the coordinate system of bone skinIndices[2]
//     attribute vec4 v3;  // Position in the coordinate system of bone skinIndices[3]
//     // Outputs to fragment shader
//     varying vec4 lightDir;
//     varying vec2 uv;
//     varying vec4 normal;
//     // Uniforms
//     uniform vec4 lightPosition;
//     uniform mat4 mWorld;
//     uniform mat4 mView;
//     uniform mat4 mProj;
//     // Bone transformations
//     uniform vec3 jTrans[64];  // Joint translations
//     uniform vec4 jRots[64];   // Joint rotations as quaternions
//     // Quaternion rotation helper function
//     vec3 qtransform(vec4 q, vec3 v) {
//         // Apply quaternion rotation to a vector
//         return v + 2.0 * cross(cross(v, q.xyz) - q.w * v, q.xyz);
//     }
//     void main() {
//         // Get bone indices for this vertex
//         int boneIdx0 = int(skinIndices.x);
//         int boneIdx1 = int(skinIndices.y);
//         int boneIdx2 = int(skinIndices.z);
//         int boneIdx3 = int(skinIndices.w);
//         // Get bone weights
//         float weight0 = skinWeights.x;
//         float weight1 = skinWeights.y;
//         float weight2 = skinWeights.z;
//         float weight3 = skinWeights.w;
//         // Apply linear blend skinning formula
//         // For each bone, transform the vertex from bone local space to world space
//         // First bone contribution
//         vec3 pos0 = jTrans[boneIdx0] + qtransform(jRots[boneIdx0], vec3(v0.xyz));
//         // Second bone contribution
//         vec3 pos1 = jTrans[boneIdx1] + qtransform(jRots[boneIdx1], vec3(v1.xyz));
//         // Third bone contribution
//         vec3 pos2 = jTrans[boneIdx2] + qtransform(jRots[boneIdx2], vec3(v2.xyz));
//         // Fourth bone contribution
//         vec3 pos3 = jTrans[boneIdx3] + qtransform(jRots[boneIdx3], vec3(v3.xyz));
//         // Blend the positions according to weights
//         vec3 blendedPosition = 
//             weight0 * pos0 + 
//             weight1 * pos1 + 
//             weight2 * pos2 + 
//             weight3 * pos3;
//         // Transform to clip space
//         vec4 worldPosition = mWorld * vec4(blendedPosition, 1.0);
//         gl_Position = mProj * mView * worldPosition;
//         // Transform normal - this is a simplified approach; normally you'd want to use bone matrices
//         // In a more complete implementation, normals would be transformed by the inverse transpose
//         // of the bone transformations
//         vec3 blendedNormal = normalize(
//             weight0 * qtransform(jRots[boneIdx0], aNorm) +
//             weight1 * qtransform(jRots[boneIdx1], aNorm) +
//             weight2 * qtransform(jRots[boneIdx2], aNorm) +
//             weight3 * qtransform(jRots[boneIdx3], aNorm)
//         );
//         // Compute light direction and transform to camera coordinates
//         lightDir = lightPosition - worldPosition;
//         // Pass to fragment shader
//         normal = normalize(mWorld * vec4(blendedNormal, 0.0));
//         uv = aUV;
//     }
// `;
//dual quaternion skinning
export const sceneVSText = `
precision mediump float;
precision mediump int;

//
attribute vec3 vertPosition;
attribute vec2 aUV;
attribute vec3 aNorm;
attribute vec4 skinIndices;   
attribute vec4 skinWeights;   

//
varying vec4 lightDir;
varying vec2 uv;
varying vec4 normal;
uniform vec4 lightPosition;
uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

// Dual quaternions per joint 
// for a maximum of 64 joints, each with real and a dual quat
uniform vec4 jDQs[128]; // [r0, d0, r1, d1, ..., r63, d63]

// Rotate vector v by quat q
vec3 quatRotate(vec4 q, vec3 v) {
    vec3 qv = q.xyz;
    float qs = q.w;
    return v + 2.0 * cross(qv, cross(qv, v) + qs * v);
}

// Normalize a dual quaternion
void normalizeDualQuat(inout vec4 real, inout vec4 dual) {
    // Normalize the real part
    float magnitude = length(real);
    real /= magnitude;
    
    // Orthogonalize dual part against real part
    // We want dot(real, dual) = 0
    dual -= real * dot(real, dual);
    dual /= magnitude;
}

// Applies a dual quaternion transformation to a vertex
vec3 applyDualQuaternion(vec4 real, vec4 dual, vec3 v) {
    // First, apply rotation using the real part
    vec3 rotatedV = quatRotate(real, v);
    
    // Extract and apply translation from the dual part
    // The formula for extracting translation from a dual quaternion:
    // t = 2.0 * (dual * conjugate(real))
    vec3 translation = 2.0 * (
        dual.xyz * real.w - 
        real.xyz * dual.w + 
        cross(real.xyz, dual.xyz)
    );
    
    // Apply translation to rotated vertex
    return rotatedV + translation;
}

void main() {
    // Get bone indices
    int i0 = int(skinIndices.x);
    int i1 = int(skinIndices.y);
    int i2 = int(skinIndices.z);
    int i3 = int(skinIndices.w);

    // Get weights
    float w0 = skinWeights.x;
    float w1 = skinWeights.y;
    float w2 = skinWeights.z;
    float w3 = skinWeights.w;
    
    // Get dual quaternions for each influencing bone
    vec4 real0 = jDQs[2 * i0];
    vec4 dual0 = jDQs[2 * i0 + 1];
    
    vec4 real1 = jDQs[2 * i1];
    vec4 dual1 = jDQs[2 * i1 + 1];
    
    vec4 real2 = jDQs[2 * i2];
    vec4 dual2 = jDQs[2 * i2 + 1];
    
    vec4 real3 = jDQs[2 * i3];
    vec4 dual3 = jDQs[2 * i3 + 1];
    
    // Antipodality handling - make sure quaternions are in the same hemisphere
    // This is important for blending dual quaternions with SLERP
    if (dot(real0, real1) < 0.0) { real1 *= -1.0; dual1 *= -1.0; }
    if (dot(real0, real2) < 0.0) { real2 *= -1.0; dual2 *= -1.0; }
    if (dot(real0, real3) < 0.0) { real3 *= -1.0; dual3 *= -1.0; }

    // Blend the dual quaternions based on weights
    vec4 blendedReal = 
        w0 * real0 +
        w1 * real1 +
        w2 * real2 +
        w3 * real3;
        
    vec4 blendedDual = 
        w0 * dual0 +
        w1 * dual1 +
        w2 * dual2 +
        w3 * dual3;

    // Normalize the resulting dual quaternion
    normalizeDualQuat(blendedReal, blendedDual);
    
    // Apply the dual quaternion transformation to the vertex
    vec3 skinnedPosition = applyDualQuaternion(blendedReal, blendedDual, vertPosition);
    
    // Transform the skinned vertex to clip space
    vec4 worldPosition = mWorld * vec4(skinnedPosition, 1.0);
    gl_Position = mProj * mView * worldPosition;
    
    // Calculate lighting and normals
    lightDir = lightPosition - worldPosition;
    
    // Transform normal using the rotation part of the dual quaternion
    vec3 skinnedNormal = quatRotate(blendedReal, aNorm);
    normal = normalize(mWorld * vec4(skinnedNormal, 0.0));
    
    // Pass UV to fragment shader
    uv = aUV;
}
`;
export const sceneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;

    void main () {
        gl_FragColor = vec4((normal.x + 1.0)/2.0, (normal.y + 1.0)/2.0, (normal.z + 1.0)/2.0,1.0);
    }
`;
export const skeletonVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute float boneIndex;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 bTrans[64];
    uniform vec4 bRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        int index = int(boneIndex);
        gl_Position = mProj * mView * mWorld * vec4(bTrans[index] + qtrans(bRots[index], vertPosition), 1.0);
    }
`;
export const skeletonFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;
export const highlightBoneVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;
export const highlightBoneFSText = `
    precision mediump float;

    void main () {
        // Bright yellow for highlighted bone
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
`;
export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;
export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;
export const previewVSText = `
    precision mediump float;
    
    attribute vec2 vertPosition;
    attribute vec2 texCoord;
    
    varying vec2 vTexCoord;
    
    uniform mat4 mProj;
    uniform mat4 mWorld;
    
    void main() {
        gl_Position = mProj * mWorld * vec4(vertPosition, 0.0, 1.0);
        vTexCoord = texCoord;
    }
`;
// Fragment shader for rendering keyframe previews
export const previewFSText = `
    precision mediump float;
    
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    
    void main() {
        gl_FragColor = texture2D(uTexture, vTexCoord);
    }
`;
//# sourceMappingURL=Shaders.js.map