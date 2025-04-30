import { Vec3, Vec4 } from "../lib/TSM.js";
/**
 * Skybox class
 * Creates and manages a skybox cube for rendering the sky
 */
export class Skybox {
    constructor() {
        if (!Skybox.positionsF32) {
            this.initializeGeometry();
        }
    }
    /**
     * Initialize the skybox geometry
     * We use a cube with vertices at distance 1 from the origin
     */
    initializeGeometry() {
        // Create a cube centered at the origin with unit size
        const positions = [
            // Front face
            new Vec4([-1.0, -1.0, 1.0, 1.0]),
            new Vec4([1.0, -1.0, 1.0, 1.0]),
            new Vec4([1.0, 1.0, 1.0, 1.0]),
            new Vec4([-1.0, 1.0, 1.0, 1.0]),
            // Back face
            new Vec4([-1.0, -1.0, -1.0, 1.0]),
            new Vec4([-1.0, 1.0, -1.0, 1.0]),
            new Vec4([1.0, 1.0, -1.0, 1.0]),
            new Vec4([1.0, -1.0, -1.0, 1.0]),
            // Top face
            new Vec4([-1.0, 1.0, -1.0, 1.0]),
            new Vec4([-1.0, 1.0, 1.0, 1.0]),
            new Vec4([1.0, 1.0, 1.0, 1.0]),
            new Vec4([1.0, 1.0, -1.0, 1.0]),
            // Bottom face
            new Vec4([-1.0, -1.0, -1.0, 1.0]),
            new Vec4([1.0, -1.0, -1.0, 1.0]),
            new Vec4([1.0, -1.0, 1.0, 1.0]),
            new Vec4([-1.0, -1.0, 1.0, 1.0]),
            // Right face
            new Vec4([1.0, -1.0, -1.0, 1.0]),
            new Vec4([1.0, 1.0, -1.0, 1.0]),
            new Vec4([1.0, 1.0, 1.0, 1.0]),
            new Vec4([1.0, -1.0, 1.0, 1.0]),
            // Left face
            new Vec4([-1.0, -1.0, -1.0, 1.0]),
            new Vec4([-1.0, -1.0, 1.0, 1.0]),
            new Vec4([-1.0, 1.0, 1.0, 1.0]),
            new Vec4([-1.0, 1.0, -1.0, 1.0])
        ];
        // Convert to Float32Array
        Skybox.positionsF32 = new Float32Array(positions.length * 4);
        positions.forEach((v, i) => {
            Skybox.positionsF32.set(v.xyzw, i * 4);
        });
        // Create indices for each face (2 triangles per face)
        const indices = [
            // Front face
            new Vec3([0, 1, 2]),
            new Vec3([0, 2, 3]),
            // Back face
            new Vec3([4, 5, 6]),
            new Vec3([4, 6, 7]),
            // Top face
            new Vec3([8, 9, 10]),
            new Vec3([8, 10, 11]),
            // Bottom face
            new Vec3([12, 13, 14]),
            new Vec3([12, 14, 15]),
            // Right face
            new Vec3([16, 17, 18]),
            new Vec3([16, 18, 19]),
            // Left face
            new Vec3([20, 21, 22]),
            new Vec3([20, 22, 23])
        ];
        // Convert to Uint32Array
        Skybox.indicesU32 = new Uint32Array(indices.length * 3);
        indices.forEach((v, i) => {
            Skybox.indicesU32.set(v.xyz, i * 3);
        });
        // Create normals (pointing inward for skybox)
        const normals = [
            // Front face - negative z normals
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            new Vec4([0.0, 0.0, -1.0, 0.0]),
            // Back face - positive z normals
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            new Vec4([0.0, 0.0, 1.0, 0.0]),
            // Top face - negative y normals
            new Vec4([0.0, -1.0, 0.0, 0.0]),
            new Vec4([0.0, -1.0, 0.0, 0.0]),
            new Vec4([0.0, -1.0, 0.0, 0.0]),
            new Vec4([0.0, -1.0, 0.0, 0.0]),
            // Bottom face - positive y normals
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            new Vec4([0.0, 1.0, 0.0, 0.0]),
            // Right face - negative x normals
            new Vec4([-1.0, 0.0, 0.0, 0.0]),
            new Vec4([-1.0, 0.0, 0.0, 0.0]),
            new Vec4([-1.0, 0.0, 0.0, 0.0]),
            new Vec4([-1.0, 0.0, 0.0, 0.0]),
            // Left face - positive x normals
            new Vec4([1.0, 0.0, 0.0, 0.0]),
            new Vec4([1.0, 0.0, 0.0, 0.0]),
            new Vec4([1.0, 0.0, 0.0, 0.0]),
            new Vec4([1.0, 0.0, 0.0, 0.0])
        ];
        // Convert to Float32Array
        Skybox.normalsF32 = new Float32Array(normals.length * 4);
        normals.forEach((v, i) => {
            Skybox.normalsF32.set(v.xyzw, i * 4);
        });
        // Create texture coordinates (for 3D noise sampling)
        // For a skybox, these are actually the 3D positions normalized to [0, 1] range
        const uvs = [];
        for (let i = 0; i < positions.length; i++) {
            // Convert from [-1, 1] to [0, 1] range for 3D texture sampling
            const pos = positions[i];
            uvs.push([
                (pos.x + 1.0) * 0.5,
                (pos.y + 1.0) * 0.5,
                (pos.z + 1.0) * 0.5
            ]);
        }
        // Convert to Float32Array (3 components per vertex for 3D texture coords)
        Skybox.uvF32 = new Float32Array(uvs.length * 3);
        uvs.forEach((v, i) => {
            Skybox.uvF32.set(v, i * 3);
        });
    }
    /**
     * Get geometry data for rendering
     */
    static positionsFlat() {
        return Skybox.positionsF32;
    }
    static indicesFlat() {
        return Skybox.indicesU32;
    }
    static normalsFlat() {
        return Skybox.normalsF32;
    }
    static uvFlat() {
        return Skybox.uvF32;
    }
}
//# sourceMappingURL=Skybox.js.map