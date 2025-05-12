"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState, useRef } from "react";
import {
  useGLTF,
  KeyboardControls,
  // RectAreaLight,
  useHelper,
} from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { DirectionalLightHelper } from "three";
import { Physics, RigidBody } from "@react-three/rapier";
import Ecctrl from "ecctrl";
import { EffectComposer, Bloom, Vignette,SSAO,HueSaturation, BrightnessContrast,DepthOfField } from "@react-three/postprocessing";
import { KernelSize, BlendFunction } from "postprocessing";
import { useControls } from 'leva';
// import { DirectionalLightHelper, RectAreaLightUniformsLib } from "three";

RectAreaLightUniformsLib.init();

// Define keyboard control preset
const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["Shift"] },
  // Optional action controls
  { name: "action1", keys: ["1"] },
  { name: "action2", keys: ["2"] },
  { name: "action3", keys: ["3"] },
  { name: "action4", keys: ["KeyF"] },
];

// Main scene component
export default function Scene() {
  const [debugPhysics, setDebugPhysics] = useState(false);
  const [cameraMode, setCameraMode] = useState<'FreeCamera' | 'FirstPerson'>('FreeCamera');


  // Toggle debug physics with "P" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP") {
        setDebugPhysics((prev) => !prev);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Preload model
  useGLTF.preload("/assets/825.glb");

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <div style={{ position: "absolute", top: 10, left: 10, color: "white", zIndex: 100 }}>
        WASD to move, SPACE to jump, SHIFT to run, P to toggle physics debug
      </div>
      {/* <div style={{ position: "absolute", top: 10, left: 10, color: "white", zIndex: 100 }}>
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={() => setCameraMode(prev => prev === 'FreeCamera' ? 'FirstPerson' : 'FreeCamera')}
            style={{
              padding: '5px 10px',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Toggle Camera: {cameraMode}
          </button>
        </div> */}
      {/* </div> */}
      
      <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 8, 10], fov: 45 }} 
      gl={{
        // physicallyCorrectLights: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        toneMappingExposure: 1.1,   // keeps whites soft‑clipped
      }}>
        <Suspense fallback={null}>
          <KeyboardControls map={keyboardMap}>
            {/* <Physics debug={debugPhysics} gravity={[0, -9.81, 0]}> */}
            {<Physics gravity={[0, -9.81, 0]}>

              {/* Scene model */}
              <Model />
              
              {/* Floor */}
              <Floor />
              
              {/* Lighting */}
              <Lighting />
              <PostProcessing />
              
              {/* Character with Ecctrl */}
              <Ecctrl
                // Character dimensions
                capsuleHalfHeight={0.35}
                capsuleRadius={0.3}
                
                // Initial position (elevated to avoid falling through floor)
                position={[4, 7, 0]}
                
                // Physics settings
                floatHeight={0.1}
                autoBalance={true}
                
                // Camera settings for third-person
                camInitDis={-5}
                camMaxDis={-10}
                camMinDis={-1}
                camFollowMult={10}
                
                // Fix camera to always be behind character
                mode="CameraBasedMovement"
                
      
             // Movement settings
             maxVelLimit={5}
             turnVelMultiplier={0.2}
             turnSpeed={10}
             jumpVel={5}
             jumpForceToGroundMult={5}
                
                // Debug mode (optional)
                debug={debugPhysics}
              >
                <SimpleCharacter />
              </Ecctrl>
            </Physics>}
            
            {/* Orbit controls as fallback/alternative (disable when using ecctrl) */}
            {/* <OrbitControls /> */}
          </KeyboardControls>
        </Suspense>
      </Canvas>
    </div>
  );
}

function Model() {
  const { scene } = useGLTF("/assets/825.glb");
  //isme floor wgera bhi daal saale, make sure collision sahi rhe

  // Extract the collision mesh
  const wall = scene.getObjectByName(".collision__001");
  const flooor = scene.getObjectByName(".floor");


  useEffect(() => {
    // Make sure the model is properly aligned with Y-up
    scene.rotation.set(0, 0, 90);
    
    // Set up shadows for all meshes
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <>
      {/* Fixed (immovable) collision body for the walls */}
      {wall && (
        <RigidBody type="fixed" colliders="hull" friction={0.7}>
          <ShadowPrimitive object={wall} />
        </RigidBody>
      )}
      {flooor && (
        <RigidBody type="fixed" colliders="trimesh" friction={0.7}>
          <ShadowPrimitive object={flooor} />
        </RigidBody>
      )}
      {/* If you want furniture to collide too */}
      {scene.children
        .filter(
          (c) =>
            c.name.startsWith("N") ||
            c.name.startsWith("U") ||
            c.name.startsWith("U2") ||
            c.name.startsWith("K")
        )
        .map((obj, i) => (
          <RigidBody key={i} type="fixed" colliders="trimesh">
            <ShadowPrimitive object={obj} />
          </RigidBody>
        ))}

      {/* Other non-collision objects */}
      {/* {scene.children
        .filter((c) => !c.name.startsWith("N") && c !== wall)
        .map((obj, i) => (
          <primitive key={other-${i}} object={obj} />
        ))} */}
    </>
  );
}

// Simple character capsule - replace with your own model if desired
function SimpleCharacter() {
  return (
    <mesh castShadow>
      <capsuleGeometry args={[0.1, 0.2]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}

// Floor component
function Floor() {
  return (
    <RigidBody type="fixed" friction={0.7}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#303030" />
      </mesh>
    </RigidBody>
  );
}

// Environment lighting
function Lighting() {
  return (
    <>
      <hemisphereLight
        args={['#ffffff', '#d3d3d3', 0.8]}  // sky, ground, intensity
      />
      <ambientLight intensity={0.5} />
     
      <directionalLight
        // ref={dirRef}
        position={[5, 10, 5]}           // ≈ 45° pitch from upper‑right
        intensity={3}                  // ≈ 3 lux in physicallyCorrect mode
        color={'#ffffff'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* <rectAreaLight
        position={[0, 20, 0]}
        rotation={[-Math.PI / 2, 0, 0]} // points down
        width={10}
        height={10}
        intensity={10}                 // area lights need high lux
        color={'#ffffff'}
        castShadow={false}
      /> */}

      {/* <Environment preset="city" background={false} /> */}
    </>

  );
}


function PostProcessing() {
  return (
    <EffectComposer>

      <Bloom
    mipmapBlur               // still the softer convolution kernel
    intensity={0.15}         // ↓ from the implicit 1.0 → keeps edges crisp
    luminanceThreshold={1}   // bloom only on >1.0 fragments
    luminanceSmoothing={0.25}/* tighten transition so mids don’t glow */
  />

  {/* CONTRAST – slight S‑curve: lift brights, deepen mids */}
  <BrightnessContrast
    brightness={0.0}   // leave mids where they are
    contrast={0.08}    // +8 % contrast (‑1…1 range) – tweak to taste
  />

  {/* VIGNETTE – lighter & wider */}
  <Vignette
    eskil={false}
    offset={0.3}       // wider fall‑off
    darkness={0.2}     // subtler edge darkening
  />
    </EffectComposer>
  );  
}

function ShadowPrimitive({ object }: { object: THREE.Object3D }) {
  const ref = useRef<THREE.Object3D>(null!)
  useEffect(() => {
    ref.current?.traverse((c: any) => {
      if (c.isMesh) c.castShadow = true
    })
  }, [])
  return <primitive object={object} ref={ref} />
}
