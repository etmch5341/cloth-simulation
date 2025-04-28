import { Mat4, Quat, Vec3, Vec4 } from "../lib/TSM.js";
// Helper function to create a translation matrix
function createTranslationMatrix(x, y, z) {
    const translationMat = new Mat4().setIdentity();
    const translationVec = new Vec3([x, y, z]);
    return translationMat.translate(translationVec);
}
export function computeDualQuat(bone) {
    // Make sure bone has the D and U matrices
    if (!bone.D || !bone.U) {
        console.error("Bone missing required matrices");
        return { real: new Quat().setIdentity(), dual: new Quat([0, 0, 0, 0]) };
    }
    // Use D as the current transform matrix
    const currentTransform = bone.D;
    const bindPose = bone.U;
    // Get inverse of the bind pose matrix
    const invBindPose = bindPose.copy().inverse();
    // Calculate the transformation matrix
    // M = current * inverse(bind)
    const M = new Mat4();
    currentTransform.multiply(invBindPose, M);
    // Extract rotation as quaternion from the transformation matrix
    const rotationQuat = M.toMat3().toQuat().normalize();
    // Extract translation from the transformation matrix
    // Access using at() method instead of array indexing
    const translation = new Vec3([
        M.at(12), // The translation x is at index 12
        M.at(13), // The translation y is at index 13
        M.at(14) // The translation z is at index 14
    ]);
    // Create a quaternion from the translation vector (t, 0)
    const translationQuat = new Quat([translation.x, translation.y, translation.z, 0]);
    // Compute the dual part: 0.5 * translationQuat * rotationQuat
    // This is the correct dual quaternion formulation
    const dualPart = Quat.product(translationQuat, rotationQuat);
    dualPart.x *= 0.5;
    dualPart.y *= 0.5;
    dualPart.z *= 0.5;
    dualPart.w *= 0.5;
    return {
        real: rotationQuat,
        dual: dualPart
    };
}
// Function to generate cylinder geometry for highlighting bones
export function generateCylinderGeometry(bone, radius = 0.05, segments = 8) {
    const start = bone.position;
    const end = bone.endpoint;
    const direction = Vec3.difference(end, start).normalize();
    // Find perpendicular vectors to create cylinder
    let perpA = new Vec3([1, 0, 0]);
    if (Math.abs(Vec3.dot(perpA, direction)) > 0.9) {
        perpA = new Vec3([0, 1, 0]);
    }
    perpA = Vec3.cross(perpA, direction).normalize();
    const perpB = Vec3.cross(direction, perpA).normalize();
    // Add 1 for the center point of the start face
    const vertexCount = segments * 2 + 1;
    const positions = new Float32Array(vertexCount * 3);
    const boneIndices = new Float32Array(vertexCount);
    // Add center point of start face as first vertex
    positions[0] = start.x;
    positions[1] = start.y;
    positions[2] = start.z;
    boneIndices[0] = bone.index;
    // Generate vertices for the cylinder
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        // Vector around the circle
        const circleVec = new Vec3([0, 0, 0]);
        perpA.scale(cos * radius, circleVec);
        const temp = perpB.copy().scale(sin * radius);
        Vec3.sum(circleVec, temp, circleVec);
        // Start vertex (offset by 1 for center point)
        const startPos = Vec3.sum(start, circleVec);
        positions[(i + 1) * 3] = startPos.x;
        positions[(i + 1) * 3 + 1] = startPos.y;
        positions[(i + 1) * 3 + 2] = startPos.z;
        boneIndices[i + 1] = bone.index;
        // End vertex
        const endPos = Vec3.sum(end, circleVec);
        positions[(i + segments + 1) * 3] = endPos.x;
        positions[(i + segments + 1) * 3 + 1] = endPos.y;
        positions[(i + segments + 1) * 3 + 2] = endPos.z;
        boneIndices[i + segments + 1] = bone.index;
    }
    // We'll create indices for:
    // 1. Lines around the start circle (segments lines)
    // 2. Lines connecting start and end circles (segments lines)
    // 3. Lines around the end circle (segments lines)
    const lineIndices = new Uint32Array(segments * 6);
    for (let i = 0; i < segments; i++) {
        const nextI = (i + 1) % segments;
        // Lines around start circle
        lineIndices[i * 6] = i + 1;
        lineIndices[i * 6 + 1] = nextI + 1;
        // Lines connecting start and end circles
        lineIndices[i * 6 + 2] = i + 1;
        lineIndices[i * 6 + 3] = i + segments + 1;
        // Lines around end circle
        lineIndices[i * 6 + 4] = i + segments + 1;
        lineIndices[i * 6 + 5] = nextI + segments + 1;
    }
    return {
        positions,
        indices: lineIndices,
        boneIndices
    };
}
// Class to represent a keyframe in the animation
export class KeyFrame {
    constructor() {
        this.boneRotations = new Map();
    }
    // Store the rotation for a specific bone
    setBoneRotation(boneIndex, rotation) {
        this.boneRotations.set(boneIndex, rotation.copy());
    }
    // Get the rotation for a specific bone
    getBoneRotation(boneIndex) {
        return this.boneRotations.get(boneIndex);
    }
    // Check if this keyframe has a rotation for a specific bone
    hasBoneRotation(boneIndex) {
        return this.boneRotations.has(boneIndex);
    }
    // Get all bone indices with stored rotations
    getBoneIndices() {
        return Array.from(this.boneRotations.keys());
    }
}
//General class for handling GLSL attributes
export class Attribute {
    constructor(attr) {
        this.values = attr.values;
        this.count = attr.count;
        this.itemSize = attr.itemSize;
    }
}
//Class for handling mesh vertices and skin weights
export class MeshGeometry {
    constructor(mesh) {
        this.position = new Attribute(mesh.position);
        this.normal = new Attribute(mesh.normal);
        if (mesh.uv) {
            this.uv = new Attribute(mesh.uv);
        }
        this.skinIndex = new Attribute(mesh.skinIndex);
        this.skinWeight = new Attribute(mesh.skinWeight);
        this.v0 = new Attribute(mesh.v0);
        this.v1 = new Attribute(mesh.v1);
        this.v2 = new Attribute(mesh.v2);
        this.v3 = new Attribute(mesh.v3);
    }
}
//Class for handling bones in the skeleton rig
export class Bone {
    constructor(bone) {
        this.index = -1; // Bone index in the skeleton array
        this.parent = bone.parent;
        this.children = Array.from(bone.children);
        this.position = bone.position.copy();
        this.endpoint = bone.endpoint.copy();
        this.rotation = bone.rotation.copy();
        this.flipForwardAxis = true;
        this.worldTransform = new Mat4().setIdentity(); // Initialize
    }
    getPosition() {
        return this.position;
    }
}
//Class for handling the overall mesh and rig
export class Mesh {
    constructor(mesh) {
        this.geometry = new MeshGeometry(mesh.geometry);
        this.worldMatrix = mesh.worldMatrix.copy();
        this.rotation = mesh.rotation.copy();
        // Initialize bones
        this.bones = [];
        mesh.bones.forEach((bone, index) => {
            const newBone = new Bone(bone);
            // Store index for easier reference
            newBone.index = index;
            this.bones.push(newBone);
        });
        this.materialName = mesh.materialName;
        this.imgSrc = null;
        this.boneIndices = Array.from(mesh.boneIndices);
        this.bonePositions = new Float32Array(mesh.bonePositions);
        this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
        // Initialize the skeleton
        for (let childBone of this.bones) {
            this.initializeMatrices(childBone);
        }
    }
    getBoneDualQuaternions() {
        const dualQuats = new Float32Array(this.bones.length * 8); // 8 floats per bone
        try {
            for (let i = 0; i < this.bones.length; i++) {
                // Compute the dual quaternion for this bone
                const dq = computeDualQuat(this.bones[i]);
                // Store real part (x,y,z,w)
                dualQuats[i * 8] = dq.real.x;
                dualQuats[i * 8 + 1] = dq.real.y;
                dualQuats[i * 8 + 2] = dq.real.z;
                dualQuats[i * 8 + 3] = dq.real.w;
                // Store dual part (x,y,z,w)
                dualQuats[i * 8 + 4] = dq.dual.x;
                dualQuats[i * 8 + 5] = dq.dual.y;
                dualQuats[i * 8 + 6] = dq.dual.z;
                dualQuats[i * 8 + 7] = dq.dual.w;
            }
            return dualQuats;
        }
        catch (error) {
            console.error("Error getting bone dual quaternions", error);
            // Return identity dual quaternions in case of error
            for (let i = 0; i < this.bones.length; i++) {
                dualQuats[i * 8 + 3] = 1; // real part = (0,0,0,1) for identity rotation
            }
            return dualQuats;
        }
    }
    initializeMatrices(bone) {
        if (bone.localPos) {
            return; // already initialized
        }
        const hasParent = bone.parent != -1;
        const parentBone = hasParent ? this.bones[bone.parent] : null;
        // local pos and endpoint according to local bone space
        bone.localPos = new Vec4([0, 0, 0, 1]);
        bone.localEndpoint = new Vec4([
            bone.endpoint.x - bone.position.x,
            bone.endpoint.y - bone.position.y,
            bone.endpoint.z - bone.position.z,
            1
        ]);
        // set remaining matrices
        bone.R = new Mat4().setIdentity(); // Local rotation matrix
        bone.T = new Mat4().setIdentity(); // Local translation matrix
        if (parentBone) {
            this.initializeMatrices(parentBone);
            // Set translation from parent to this bone
            bone.T.translate(bone.position.copy().subtract(parentBone.position.copy()));
            // World transformation = parent transform * local translation * local rotation
            bone.D = parentBone.D.copy().multiply(bone.T.copy()).multiply(bone.R.copy());
            // Check if forward axis flip is necessary
            let displacement = bone.endpoint.copy().subtract(parentBone.endpoint.copy());
            if (displacement.z <= 0) {
                bone.flipForwardAxis = false;
            }
        }
        else {
            // For root bone, world transform is just the local transform
            bone.D = this.compose(new Mat4().setIdentity(), bone.position);
        }
        // Store the undeformed (bind pose) matrix and set worldTransform
        bone.U = bone.D.copy();
        bone.worldTransform = bone.D.copy(); // Set worldTransform to match D initially
    }
    roll(boneIndex, angle, flip) {
        const bone = this.bones[boneIndex];
        // Create a rotation quaternion from the axis and angle
        let hasParent = bone.parent != -1;
        let parentBone = hasParent ? this.bones[bone.parent] : null;
        // Get local axis - the direction from joint to endpoint in local space
        let axis = new Vec3(bone.localEndpoint.copy().subtract(bone.localPos.copy()).normalize().xyz);
        // Flip direction if needed
        if (flip) {
            angle *= -1;
        }
        // Transform local axis to world space if needed
        if (parentBone) {
            axis = parentBone.D.copy().inverse().toMat3().multiply(bone.D.copy().toMat3()).multiplyVec3(axis);
        }
        else {
            axis = bone.D.copy().toMat3().multiplyVec3(axis);
        }
        // Create rotation matrix around this axis
        const rotMatrix = new Mat4().setIdentity();
        rotMatrix.rotate(angle, new Vec3(axis.xyz));
        // Apply the rotation
        this.rotate(boneIndex, rotMatrix, true);
    }
    // public roll(boneIndex: number, angle: number, flip: boolean) {
    //   const bone = this.bones[boneIndex];
    //   // Create a rotation quaternion from the axis and angle
    //   const rotation = new Quat();
    //   let hasParent = bone.parent != -1;
    //   let parentBone = hasParent ? this.bones[bone.parent] : null;
    //   // get local axis
    //   let axis = new Vec3(bone.localEndpoint.copy().subtract(bone.localPos.copy()).normalize().xyz);
    //   if (flip) {
    //     angle *= -1;
    //   }
    //   // transform local axis back to rest axis
    //   //check this bro idk what this is
    //   if (parentBone) {
    //     axis = parentBone.D.copy().inverse().toMat3().multiply(bone.D.copy().toMat3()).multiplyVec3(axis);
    //   }
    //   else{
    //     axis = bone.D.copy().toMat3().multiplyVec3(axis);
    //   }
    //   const rotMatrix = new Mat4().setIdentity();
    //   // create rotation matrix with axis and radians
    //   rotMatrix.rotate(angle, new Vec3(axis.xyz));
    //   // call rotate
    //   this.rotate(boneIndex, rotMatrix, true);
    // }
    rotate(boneIndex, rotMatrix, isParent) {
        const bone = this.bones[boneIndex];
        if (isParent) {
            bone.R = rotMatrix.copy().multiply(bone.R);
        }
        const hasParent = bone.parent != -1;
        const parentBone = hasParent ? this.bones[bone.parent] : null;
        // update world transform according to parent bone
        if (parentBone) {
            bone.D = parentBone.D.copy().multiply(bone.T.copy()).multiply(bone.R.copy());
        }
        else { // else, parent bone's world transform is just updated
            bone.D = this.compose(bone.R, bone.position);
        }
        // Update worldTransform to match D
        bone.worldTransform = bone.D.copy();
        // update local coords
        bone.position = new Vec3([...bone.D.copy().multiplyVec4(bone.localPos.copy()).xyz]);
        bone.endpoint = new Vec3([...bone.D.copy().multiplyVec4(bone.localEndpoint.copy()).xyz]);
        bone.rotation = bone.D.toMat3().toQuat();
        // call on children
        for (let child of bone.children) {
            this.rotate(child, rotMatrix, false);
        }
    }
    // Find the closest bone to a given ray for bone picking
    findClosestBone(rayOrigin, rayDir, radius = 0.1) {
        let closestBone = -1;
        let closestDist = Number.MAX_VALUE;
        this.bones.forEach((bone, index) => {
            // Treat each bone as a cylinder for ray intersection testing
            const boneStart = bone.position;
            const boneEnd = bone.endpoint;
            // Calculate closest approach of ray to bone line segment
            const result = this.rayBoneIntersection(rayOrigin, rayDir, boneStart, boneEnd, radius);
            if (result.intersects && result.distance < closestDist) {
                closestDist = result.distance;
                closestBone = Number(index);
            }
        });
        return closestBone;
    }
    // Helper for ray-bone intersection testing
    rayBoneIntersection(rayOrigin, rayDir, boneStart, boneEnd, radius) {
        // Test multiple points along the bone to improve hit detection
        const numTestPoints = 100;
        let closestDist = Number.MAX_VALUE;
        let intersects = false;
        for (let i = 0; i <= numTestPoints; i++) {
            const t = i / numTestPoints;
            const testPoint = new Vec3([
                boneStart.x + t * (boneEnd.x - boneStart.x),
                boneStart.y + t * (boneEnd.y - boneStart.y),
                boneStart.z + t * (boneEnd.z - boneStart.z)
            ]);
            // Calculate distance from ray to this point
            const toPoint = Vec3.difference(testPoint, rayOrigin);
            const projOnRay = Vec3.dot(toPoint, rayDir) / Vec3.dot(rayDir, rayDir);
            // Skip points behind the ray
            if (projOnRay < 0)
                continue;
            const closestPointOnRay = Vec3.sum(rayOrigin, rayDir.copy().scale(projOnRay));
            const dist = Vec3.distance(closestPointOnRay, testPoint);
            if (dist <= radius) {
                intersects = true;
                if (projOnRay < closestDist) {
                    closestDist = projOnRay;
                }
            }
        }
        return {
            intersects: intersects,
            distance: intersects ? closestDist : Number.MAX_VALUE
        };
    }
    compose(rotateMat, parent) {
        // Combine rotation and position into matrix
        const tMat = new Mat4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            parent.x, parent.y, parent.z, 1,
        ]);
        let matrix = Mat4.product(tMat, rotateMat);
        return matrix;
    }
    getBoneIndices() {
        return new Uint32Array(this.boneIndices);
    }
    getBonePositions() {
        return this.bonePositions;
    }
    getBoneIndexAttribute() {
        return this.boneIndexAttribute;
    }
    getBoneTranslations() {
        let trans = new Float32Array(3 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.position.xyz;
            for (let i = 0; i < res.length; i++) {
                trans[3 * index + i] = res[i];
            }
        });
        return trans;
    }
    getBoneRotations() {
        let trans = new Float32Array(4 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.rotation.xyzw;
            for (let i = 0; i < res.length; i++) {
                trans[4 * index + i] = res[i];
            }
        });
        return trans;
    }
    captureKeyframe() {
        const keyframe = new KeyFrame();
        // Store the rotation for each bone
        this.bones.forEach((bone, index) => {
            keyframe.setBoneRotation(index, bone.rotation.copy());
        });
        return keyframe;
    }
    // Complete replacement for applyKeyframe method
    applyKeyframe(keyframe) {
        const boneIndices = keyframe.getBoneIndices();
        // Apply rotations from keyframe to bones
        for (const boneIndex of boneIndices) {
            const rotation = keyframe.getBoneRotation(boneIndex);
            if (rotation !== undefined) {
                const bone = this.bones[boneIndex];
                // Apply rotation to the bone
                bone.rotation = rotation.copy();
                // Update rotation matrix from quaternion
                bone.R = new Mat4().setIdentity();
                rotation.toMat4(bone.R);
                // Update world transform
                if (bone.parent !== -1) {
                    const parentBone = this.bones[bone.parent];
                    bone.D = parentBone.D.copy().multiply(bone.T.copy()).multiply(bone.R.copy());
                }
                else {
                    bone.D = this.compose(bone.R, bone.position);
                }
                // Update position and endpoint
                bone.position = new Vec3([...bone.D.copy().multiplyVec4(bone.localPos.copy()).xyz]);
                bone.endpoint = new Vec3([...bone.D.copy().multiplyVec4(bone.localEndpoint.copy()).xyz]);
            }
        }
        // Update child bones
        for (let i = 0; i < this.bones.length; i++) {
            if (keyframe.hasBoneRotation(i) && this.bones[i].children.length > 0) {
                for (const childIndex of this.bones[i].children) {
                    this.updateChildTransform(childIndex);
                }
            }
        }
    }
    // Complete replacement for updateChildTransform method
    updateChildTransform(boneIndex) {
        const bone = this.bones[boneIndex];
        const parentBone = this.bones[bone.parent];
        // Update world transform
        bone.D = parentBone.D.copy().multiply(bone.T.copy()).multiply(bone.R.copy());
        // Update position and endpoint
        bone.position = new Vec3([...bone.D.copy().multiplyVec4(bone.localPos.copy()).xyz]);
        bone.endpoint = new Vec3([...bone.D.copy().multiplyVec4(bone.localEndpoint.copy()).xyz]);
        // Update rotation quaternion
        bone.rotation = bone.D.toMat3().toQuat();
        // Recursively update children
        for (const childIndex of bone.children) {
            this.updateChildTransform(childIndex);
        }
    }
    // interpolate between keyframes
    interpolateKeyframes(keyframe1, keyframe2, t) {
        // Get union of bone indices from both keyframes
        const boneIndices = new Set();
        keyframe1.getBoneIndices().forEach(index => boneIndices.add(index));
        keyframe2.getBoneIndices().forEach(index => boneIndices.add(index));
        // Interpolate rotations for each bone
        for (const boneIndex of boneIndices) {
            const rotation1 = keyframe1.getBoneRotation(boneIndex);
            const rotation2 = keyframe2.getBoneRotation(boneIndex);
            if (rotation1 !== undefined && rotation2 !== undefined) {
                // Perform SLERP between the two rotations
                const interpolatedRotation = Quat.slerp(rotation1, rotation2, t);
                // Create rotation matrix from interpolated quaternion
                const rotMatrix = new Mat4().setIdentity();
                interpolatedRotation.toMat4(rotMatrix);
                // Apply interpolated rotation to the bone
                this.bones[boneIndex].rotation = interpolatedRotation.copy();
                // Update bone's R matrix
                this.bones[boneIndex].R = rotMatrix.copy();
                // Update world transform
                if (this.bones[boneIndex].parent !== -1) {
                    const parentBone = this.bones[this.bones[boneIndex].parent];
                    this.bones[boneIndex].D = parentBone.D.copy().multiply(this.bones[boneIndex].T.copy()).multiply(this.bones[boneIndex].R.copy());
                }
                else {
                    this.bones[boneIndex].D = this.compose(this.bones[boneIndex].R, this.bones[boneIndex].position);
                }
                // Update position and endpoint
                this.bones[boneIndex].position = new Vec3([...this.bones[boneIndex].D.copy().multiplyVec4(this.bones[boneIndex].localPos.copy()).xyz]);
                this.bones[boneIndex].endpoint = new Vec3([...this.bones[boneIndex].D.copy().multiplyVec4(this.bones[boneIndex].localEndpoint.copy()).xyz]);
            }
        }
        // Update all bones to ensure proper hierarchy is maintained
        for (let i = 0; i < this.bones.length; i++) {
            if (boneIndices.has(i) && this.bones[i].children.length > 0) {
                for (const childIndex of this.bones[i].children) {
                    this.updateChildTransform(childIndex);
                }
            }
        }
    }
}
//# sourceMappingURL=Scene.js.map