import { Scene, Matrix4, BufferAttribute, InstancedMesh, InstancedBufferGeometry, Vector3, SRGBColorSpace, ShaderMaterial, OrthographicCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, TextureLoader, InstancedBufferAttribute } from 'three';
import Stats from "three/examples/jsm/libs/stats.module.js"
const scene = new Scene();
const camera = new OrthographicCamera(0, 1, 1, 0, 0, 1000);
const renderer = new WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = Stats();
document.body.appendChild( stats.dom );

const geometry = new InstancedBufferGeometry();
//geometry.copy(new PlaneGeometry(1, 1));

const vertices = new Float32Array( [
    -0.5,  -0.5,  0.0, // v0
    0.5,  -0.5,  0.0, // v1
    0.5,  0.5,  0.0, // v2

    0.5,  0.5,  0.0, // v3
    -0.5,  0.5,  0.0, // v4
    -0.5,  -0.5,  0.0  // v5
] );

const uvs = new Float32Array( [
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,

    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
] );
geometry.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );
geometry.setAttribute( 'uv', new BufferAttribute( uvs, 2 ) );

const instancedPositions = new InstancedBufferAttribute(new Float32Array(1024 * 2), 2);
const instancedIndexes = new InstancedBufferAttribute(new Float32Array(1024), 1);

for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
//        instancedPositions.setXY(x + y * 32, x / 32, y / 32);
        instancedPositions.setXY(x + y * 32, Math.random(), Math.random());
//        instancedIndexes.setX(x + y * 32, x + y * 32);
        instancedIndexes.setX(x + y * 32, x + y * 32);
    }
}

geometry.setAttribute('instancePosition', instancedPositions);
geometry.setAttribute('instanceIndex', instancedIndexes);

const textureLoader = new TextureLoader();
const puzzleTexture = textureLoader.load('images/puzzle.jpg');
const mask = textureLoader.load('images/jigjig.png');

const vertexShader = `
    varying vec2 vUv;
    varying vec2 pUv;
    varying vec2 mUv;
    attribute vec2 instancePosition;
    attribute float instanceIndex;

    void main() {
        float x = mod(float(instanceIndex), 32.0);
        float y = floor(float(instanceIndex) / 32.0);
        vUv = uv;
        pUv = vec2(x / 32.0, y / 32.0);
        gl_Position = projectionMatrix * (modelViewMatrix * vec4(position / 16.0, 1.0) + vec4(instancePosition, 0.0, 0.0));
    }
`;

const fragmentShader = `
    uniform sampler2D puzzleTexture;
    uniform sampler2D maskTexture;
    varying vec2 vUv;
    varying vec2 pUv;
    varying vec2 mUv;

    void main() {
        vec4 color1 = texture2D(puzzleTexture, pUv + (vUv * 2.0 - 0.5) / 32.0);
        vec4 mask = texture2D(maskTexture, pUv + vUv / 32.0);
        if (mask.r < 0.5) discard;
        gl_FragColor = vec4(vec3(color1 * mask), mask.r);
    }
`;

//puzzle.colorSpace = SRGBColorSpace;

const material = new ShaderMaterial({
    uniforms: {
        puzzleTexture: { type: 't', value: puzzleTexture },
        maskTexture: { type: 't', value: mask }
    },
    vertexShader,
    fragmentShader,
//    depthTest: false,
    transparent: true
});

const mesh = new InstancedMesh(geometry, material, 1024);
scene.add(mesh);

window.addEventListener( 'resize', ()=>{
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

function animate() {
    requestAnimationFrame(animate);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
//            instancedPositions.setXY(x + y * 32, x / 32 + 1 / 64, y / 32 + 1 / 64);
            instancedPositions.setXY(x + y * 32, Math.random(), Math.random());
        }
    }
    instancedPositions.needsUpdate = true;

    renderer.render(scene, camera);
    stats.update();
}

animate();