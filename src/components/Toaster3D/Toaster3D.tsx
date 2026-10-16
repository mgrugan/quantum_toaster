import { Suspense, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ConceptRun } from '../../bridge/types'
import { Effect3D, type Dims } from './effects3d'

const MODEL_URL = `${import.meta.env.BASE_URL}assets/toaster.glb`
/** Extra yaw so the window face points at the camera (found by screenshot). */
const FRONT_YAW = 0
/** Target length of the toaster's long axis, in world units. */
const LONG = 2

function Stage({ run, runKey }: { run: ConceptRun | null; runKey: number }) {
  const { scene } = useGLTF(MODEL_URL)
  const toaster = useRef<THREE.Group>(null)

  const { transform, dims } = useMemo(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const rotationY = (size.z > size.x ? Math.PI / 2 : 0) + FRONT_YAW
    const long = Math.max(size.x, size.z)
    const short = Math.min(size.x, size.z)
    const scale = LONG / long
    const rc = center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY).multiplyScalar(scale)
    const position = new THREE.Vector3(-rc.x, -box.min.y * scale, -rc.z)
    if (import.meta.env.DEV) console.info('[Toaster3D] bbox', size.toArray(), center.toArray())
    const W = LONG
    const H = size.y * scale
    const D = short * scale
    const s = 0.72
    const bh = 1.1 * s
    const d: Dims = { W, H, D, slotZ: [D * 0.16, -D * 0.16], y0: H - bh * 0.55, s, bh }
    return { transform: { scale, position, rotationY }, dims: d }
  }, [scene])

  return (
    <>
      <group ref={toaster}>
        <group scale={transform.scale} position={transform.position} rotation={[0, transform.rotationY, 0]}>
          <primitive object={scene} />
        </group>
        <Effect3D run={run} runKey={runKey} d={dims} toaster={toaster} model={scene} modelTransform={transform} />
      </group>
    </>
  )
}

function Loading() {
  return (
    <Html center>
      <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 300, fontSize: 13, color: '#71717a', whiteSpace: 'nowrap' }}>
        loading 3D toaster…
      </div>
    </Html>
  )
}

export default function Toaster3D({ run, runKey }: { run: ConceptRun | null; runKey: number }) {
  return (
    <Canvas className="h-full w-full" shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [3.3, 2.6, 4.8], fov: 35 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -2]} intensity={0.5} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[5, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, 2, 6]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, 2, -6]} rotation-y={Math.PI} scale={[8, 3, 1]} />
      </Environment>
      <Suspense fallback={<Loading />}>
        <Stage run={run} runKey={runKey} />
      </Suspense>
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={8} blur={2.4} far={2} resolution={512} />
      <OrbitControls
        enablePan={false}
        target={[0, 1.0, 0]}
        minDistance={3}
        maxDistance={7.5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
      />
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
