import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

const CESIUMMAN_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb'

function createGrassTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#3a7a2a'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 5000; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const length = 2 + Math.random() * 5
    const hue = 100 + Math.random() * 30
    ctx.strokeStyle = `hsl(${hue}, 55%, ${25 + Math.random() * 15}%)`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - length)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 8)
  texture.anisotropy = 8
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function Ground() {
  const grassTexture = useMemo(() => createGrassTexture(), [])
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial map={grassTexture} />
    </mesh>
  )
}

function Axe({ position, rotation, swingRef }) {
  const groupRef = useRef(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const swing = swingRef.current
    const target = rotation[0] + swing
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      target,
      0.25
    )
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={0.7}
      castShadow
    >
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#6b4f2a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0.12]} castShadow>
        <boxGeometry args={[0.35, 0.18, 0.05]} />
        <meshStandardMaterial color="#a0a7ad" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Character({ groupRef, walkRef, chopRef, timeRef }) {
  const { scene } = useGLTF(CESIUMMAN_URL)
  const pivotRef = useRef(null)
  const swingRef = useRef(0)
  const axeGroupRef = useRef(null)
  const bonesRef = useRef({
    leftUpper: null,
    leftLower: null,
    rightUpper: null,
    rightLower: null,
    rightHand: null,
  })

  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  useMemo(() => {
    const bones = []
    scene.traverse((child) => {
      if (child.isBone) bones.push(child)
    })

    const byName = (patterns) =>
      bones.find((bone) =>
        patterns.some((pattern) =>
          bone.name.toLowerCase().includes(pattern)
        )
      )

    bonesRef.current.rightHand = byName(['rhand', 'right_hand', 'hand.r', 'r hand', 'right hand'])
    bonesRef.current.rightLower = byName(['rforearm', 'right_forearm', 'forearm.r', 'r lowerarm', 'right lowerarm'])
    bonesRef.current.rightUpper = byName(['rupperarm', 'right_upperarm', 'upperarm.r', 'r arm', 'right arm'])
    bonesRef.current.leftLower = byName(['lforearm', 'left_forearm', 'forearm.l', 'l lowerarm', 'left lowerarm'])
    bonesRef.current.leftUpper = byName(['lupperarm', 'left_upperarm', 'upperarm.l', 'l arm', 'left arm'])
  }, [scene])

  useEffect(() => {
    if (!axeGroupRef.current) return
    const rightHand = bonesRef.current.rightHand
    if (rightHand) {
      rightHand.add(axeGroupRef.current)
      axeGroupRef.current.position.set(0.05, -0.02, 0.02)
      axeGroupRef.current.rotation.set(0.2, 0, Math.PI / 2)
    }
  }, [])

  useFrame(() => {
    if (!pivotRef.current) return
    const t = timeRef.current
    const isWalking = walkRef.current
    const isChopping = chopRef.current
    const walkBob = isWalking ? Math.sin(t * 8) * 0.05 : 0
    swingRef.current =
      bonesRef.current.rightHand ? 0 : isChopping ? Math.sin(t * 20) * 0.6 : 0
    pivotRef.current.position.y = walkBob

    const { leftUpper, leftLower, rightUpper, rightLower } = bonesRef.current
    if (leftUpper) leftUpper.rotation.x = isWalking ? Math.sin(t * 8) * 0.3 : 0
    if (leftLower) leftLower.rotation.x = isWalking ? Math.sin(t * 8 + 0.6) * 0.2 : 0
    if (rightUpper) rightUpper.rotation.x = isChopping ? -0.6 + Math.sin(t * 20) * 0.4 : 0
    if (rightLower) rightLower.rotation.x = isChopping ? -0.8 + Math.sin(t * 20 + 0.4) * 0.3 : 0
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1.1}>
      <group ref={pivotRef}>
        <primitive object={scene} />
        <group ref={axeGroupRef} position={[0.45, 1.1, 0.1]}>
          <Axe position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} swingRef={swingRef} />
        </group>
      </group>
    </group>
  )
}

function Tree({ position = [3, 0, -2], canChop, onChop }) {
  const groupRef = useRef(null)
  const trunkRef = useRef(null)
  const [isFalling, setIsFalling] = useState(false)
  const fallAmount = useRef(0)
  const hitTime = useRef(0)

  useFrame((_, delta) => {
    if (!isFalling || !groupRef.current) return
    fallAmount.current = Math.min(fallAmount.current + delta * 0.8, Math.PI / 2)
    groupRef.current.rotation.z = fallAmount.current
    if (fallAmount.current >= Math.PI / 2) {
      groupRef.current.position.y = -2
    }
  })

  const handleChop = (event) => {
    event.stopPropagation()
    if (isFalling) return
    if (!canChop) return
    const next = onChop()
    hitTime.current = 0
    if (next <= 0) {
      setIsFalling(true)
    }
  }

  useFrame((_, delta) => {
    hitTime.current += delta
    const pulse = Math.max(1 - hitTime.current * 3, 0)
    if (trunkRef.current) {
      if (pulse <= 0) {
        if (trunkRef.current.scale.x !== 1) {
          trunkRef.current.scale.set(1, 1, 1)
        }
        return
      }
      const scale = 1 + pulse * 0.05
      trunkRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group ref={groupRef} position={position} onPointerDown={handleChop}>
      <mesh ref={trunkRef} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 2.2, 8]} />
        <meshStandardMaterial color={canChop ? '#6a4a2f' : '#4f3a26'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[1.2, 2.4, 10]} />
        <meshStandardMaterial color="#2f6f32" roughness={0.9} />
      </mesh>
      {!isFalling && (
        <mesh position={[0, 2.8, 0]} castShadow>
          <sphereGeometry args={[0.6, 10, 10]} />
          <meshStandardMaterial color="#357a3a" roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}

function Scene({ onHint, onTreeHealth }) {
  const { camera } = useThree()
  const [treeHealth, setTreeHealth] = useState(3)
  const playerRef = useRef(new THREE.Vector3(0, 0, 0))
  const characterRef = useRef(null)
  const [keys, setKeys] = useState({})
  const speed = 3
  const treePosition = useMemo(() => new THREE.Vector3(3, 0, -2), [])
  const tempDirection = useRef(new THREE.Vector3())
  const tempCameraTarget = useRef(new THREE.Vector3())
  const tempCameraPos = useRef(new THREE.Vector3())
  const isWalkingRef = useRef(false)
  const isChoppingRef = useRef(false)
  const chopCooldown = useRef(0)
  const clock = useRef(0)

  useEffect(() => {
    const handleDown = (event) => {
      setKeys((prev) => ({ ...prev, [event.code]: true }))
    }
    const handleUp = (event) => {
      setKeys((prev) => ({ ...prev, [event.code]: false }))
    }
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
    }
  }, [])

  useFrame((_, delta) => {
    clock.current += delta
    const direction = tempDirection.current.set(
      (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
      0,
      (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0)
    )
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(speed * delta)
      playerRef.current.add(direction)
      isWalkingRef.current = true
    } else {
      isWalkingRef.current = false
    }

    if (characterRef.current) {
      characterRef.current.position.copy(playerRef.current)
    }

    const cameraTarget = tempCameraTarget.current.set(
      playerRef.current.x,
      1.8,
      playerRef.current.z
    )
    const desiredCameraPos = tempCameraPos.current.set(
      playerRef.current.x + 6,
      6,
      playerRef.current.z + 8
    )
    camera.position.lerp(desiredCameraPos, 0.08)
    camera.lookAt(cameraTarget)

    if (chopCooldown.current > 0) {
      chopCooldown.current = Math.max(chopCooldown.current - delta, 0)
      if (chopCooldown.current === 0) {
        isChoppingRef.current = false
      }
    }
  })

  const distanceToTree = playerRef.current.distanceTo(treePosition)
  const canChop = distanceToTree < 2.5 && treeHealth > 0

  useEffect(() => {
    if (!onTreeHealth) return
    onTreeHealth(treeHealth)
  }, [treeHealth, onTreeHealth])

  useEffect(() => {
    if (!onHint) return
    if (treeHealth <= 0) {
      onHint('Tree chopped down. Explore the map.')
      return
    }
    if (canChop) {
      onHint('Click the tree to chop.')
      return
    }
    onHint('Use WASD to move closer to the tree.')
  }, [canChop, treeHealth, onHint])

  const handleChop = () => {
    if (chopCooldown.current > 0) return treeHealth
    chopCooldown.current = 0.35
    isChoppingRef.current = true
    setTreeHealth((prev) => Math.max(prev - 1, 0))
    return Math.max(treeHealth - 1, 0)
  }

  return (
    <>
      <color attach="background" args={['#8dbbe1']} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Ground />
      <Tree position={treePosition.toArray()} canChop={canChop} onChop={handleChop} />
      <Character
        groupRef={characterRef}
        walkRef={isWalkingRef}
        chopRef={isChoppingRef}
        timeRef={clock}
      />
    </>
  )
}

function App() {
  const [hint, setHint] = useState('Use WASD to move. Click the tree to chop.')
  const [treeHealth, setTreeHealth] = useState(3)

  return (
    <div className="app">
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 45 }}>
        <Scene
          onHint={(text) => setHint(text)}
          onTreeHealth={(value) => setTreeHealth(value)}
        />
      </Canvas>
      <div className="hud">
        <div className="title">Survival Prototype</div>
        <div className="text">{hint}</div>
        <div className="text">Tree health: {treeHealth}</div>
      </div>
    </div>
  )
}

useGLTF.preload(CESIUMMAN_URL)

export default App
