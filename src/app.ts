import { Scene, Mesh, SRGBColorSpace, OrthographicCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, TextureLoader } from 'three';

const scene = new Scene();
const camera = new OrthographicCamera(0, 1, 1, 0, 1, 1000);
const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new PlaneGeometry();

const textureLoader = new TextureLoader();
const puzzle = textureLoader.load('images/puzzle.jpg');
puzzle.colorSpace = SRGBColorSpace;

const material = new MeshBasicMaterial({ map: puzzle });

const cube = new Mesh(geometry, material);

cube.position.x = 0.5;
cube.position.y = 0.5;
scene.add(cube);

camera.position.z = 5;

window.addEventListener( 'resize', ()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

function animate() {

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
