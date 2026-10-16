import { useMemo, type Ref } from 'react'
import * as THREE from 'three'
import { BREAD_GEOMETRY } from './bread'

/** Procedural extruded bread slice; origin at bottom-centre, face in the XY plane. Colour it with `paint()`. */
export default function Bread({
  ref,
  butter = false,
  scale = 1,
  color = '#f3dfb5',
  position,
}: {
  ref?: Ref<THREE.Group>
  butter?: boolean
  scale?: number
  color?: string
  position?: [number, number, number]
}) {
  const mats = useMemo(() => {
    const face = new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true })
    const crust = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), roughness: 0.8, transparent: true })
    return [face, crust]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={BREAD_GEOMETRY} material={mats} castShadow userData={{ bread: true }} />
      {butter && (
        <mesh position={[0, 0.55, 0.075]}>
          <boxGeometry args={[0.36, 0.26, 0.03]} />
          <meshStandardMaterial color="#fde68a" roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}
