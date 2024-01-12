import { Scene, Matrix4, BufferAttribute, InstancedMesh, InstancedBufferGeometry, Vector3, SRGBColorSpace, ShaderMaterial, OrthographicCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, TextureLoader, InstancedBufferAttribute } from 'three';
import Stats from "three/examples/jsm/libs/stats.module.js"
const scene = new Scene();
const camera = new OrthographicCamera(0, 1, 1, 0, 0, 1000);
const renderer = new WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild(renderer.domElement);

const stats = Stats();
document.body.appendChild( stats.dom );

const geometry = new InstancedBufferGeometry();
//geometry.copy(new PlaneGeometry(1, 1));

let zoom = 1024;
let panx = 0.0;
let pany = 0.0;

interface PuzzlePiece {
    x: number;
    y: number;
}

const puzzlePieces: PuzzlePiece[] = [];
const puzzleZOrder: number[] = [];

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

function updateInstances() {
    for (let z = 0; z < puzzlePieces.length; z++) {
        const idx = puzzleZOrder[z];
        const piece = puzzlePieces[idx];
        instancedPositions.setXY(z, piece.x, piece.y);
        instancedIndexes.setX(z, idx);
    }
    instancedPositions.needsUpdate = true;
    instancedIndexes.needsUpdate = true;
}

for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        puzzlePieces.push({
            x: Math.random(),
            y: Math.random()
        });
        puzzleZOrder.push(x + y * 32);
    }
}

updateInstances();

geometry.setAttribute('instancePosition', instancedPositions);
geometry.setAttribute('instanceIndex', instancedIndexes);

const textureLoader = new TextureLoader();
const puzzleTexture = textureLoader.load('images/puzzle.jpg', animate);
const mask = textureLoader.load('images/jigjig.png', animate);

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
        if (mask.r < 0.1) discard;

        vec4 lmask = texture2D(maskTexture, pUv + vUv / 32.0 + vec2(-0.0005, 0.0));
        vec4 rmask = texture2D(maskTexture, pUv + vUv / 32.0 + vec2(0.0005, 0.0));
        vec4 umask = texture2D(maskTexture, pUv + vUv / 32.0 + vec2(0.0, 0.0005));
        vec4 dmask = texture2D(maskTexture, pUv + vUv / 32.0 + vec2(0.0, -0.0005));

        if (rmask.r * dmask.r < 0.5)
            gl_FragColor = vec4(mix(vec3(color1 * mask), vec3(0.0), 0.4), mask.r);
        else if (lmask.r * umask.r < 0.5)
            gl_FragColor = vec4(mix(vec3(color1 * mask), vec3(1.0), 0.4), mask.r);
        else
            gl_FragColor = vec4(vec3(color1 * mask), mask.r);
    }
`;

let trackingIndex = -1;
let trackingDeltaX = 0;
let trackingDeltaY = 0;

document.addEventListener('pointerdown', (e) => {
    document.body.setPointerCapture(e.pointerId);
    e.preventDefault();

    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    const v = new Vector3(x, y, 0).applyMatrix4(camera.projectionMatrixInverse);

    trackingIndex = -1;
    for (let z = 0; z < puzzleZOrder.length; z++) {
        const idx = puzzleZOrder[z];
        const piece = puzzlePieces[idx];
        const x = piece.x;
        const y = piece.y;
        if (Math.abs(v.x - x) < 0.017 && Math.abs(v.y - y) < 0.017) {
            trackingIndex = idx;
            trackingDeltaX = v.x - x;
            trackingDeltaY = v.y - y;
        }
    }

    if (trackingIndex >= 0) {
        const zidx = puzzleZOrder.indexOf(trackingIndex);
        puzzleZOrder.splice(zidx, 1);
        puzzleZOrder.push(trackingIndex);
    }
    animate();

});

document.body.addEventListener('pointermove', (e) => {
    if (e.buttons === 1) {
        if (trackingIndex != -1) {
            const piece = puzzlePieces[trackingIndex];

            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            const v = new Vector3(x, y, 0).applyMatrix4(camera.projectionMatrixInverse);
            piece.x = v.x - trackingDeltaX;
            piece.y = v.y - trackingDeltaY;
            updateInstances();
        } else {
            panx -= e.movementX / zoom;
            pany += e.movementY / zoom;
        }
        animate();
    }
    e.preventDefault();
});

document.body.addEventListener('wheel', (e) => {
    zoom *= Math.pow(1.1, -e.deltaY / 100);
    animate();
    e.preventDefault();
});

document.addEventListener('gesturestart', e=>{
    e.preventDefault();
})

const material = new ShaderMaterial({
    uniforms: {
        puzzleTexture: { type: 't', value: puzzleTexture },
        maskTexture: { type: 't', value: mask }
    },
    vertexShader,
    fragmentShader,
    transparent: true
});

const mesh = new InstancedMesh(geometry, material, 1024);
scene.add(mesh);

window.addEventListener( 'resize', ()=>{
    setTimeout(()=>{
        animate();
    
    }, 0)
}, false );

function animate() {
    renderer.setSize( window.innerWidth, window.innerHeight );
    camera.updateProjectionMatrix();

    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.left = panx;
    camera.right = panx + width / zoom;
    camera.top = height / zoom + pany;
    camera.bottom = pany;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    stats.update();
}

animate();