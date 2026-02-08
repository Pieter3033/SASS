import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'
import { GameProvider, useGame } from './context/GameContext'
import MainMenu from './components/MainMenu'
import Inventory from './components/Inventory'

const CHARACTER_URL = '/models/Character_1.glb'
const AXE_URL = '/models/Axe.glb'

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

function AxeModel({ position, rotation }) {
  const { scene } = useGLTF(AXE_URL)
  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])
  return (
    <group position={position} rotation={rotation} scale={0.08} castShadow>
      <primitive object={scene} />
    </group>
  )
}

function Character({ groupRef, walkRef, chopRef, timeRef, axeTuning }) {
  const { scene, animations } = useGLTF(CHARACTER_URL)
  const { actions } = useAnimations(animations, scene)
  const pivotRef = useRef(null)
  const axeGroupRef = useRef(null)
  const axeBaseRotX = useRef(0.2)
  const axeAttachRef = useRef(null)
  const bonesRef = useRef({
    rightHand: null,
    rightLower: null,
    rightUpper: null,
  })

  const currentAction = useRef(null)
  const actionCache = useRef({ idle: null, walk: null, chop: null })

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

    const byExact = (name) => bones.find((bone) => bone.name === name)
    const byName = (patterns) =>
      bones.find((bone) =>
        patterns.some((pattern) =>
          bone.name.toLowerCase().includes(pattern)
        )
      )

    bonesRef.current.rightHand = byExact('WristR') || byName(['wristr', 'wrist.r', 'right_wrist', 'rhand', 'right_hand'])
    bonesRef.current.rightLower = byExact('LowerArmR') || byName(['lowerarmr', 'forearm', 'r lowerarm'])
    bonesRef.current.rightUpper = byExact('UpperArmR') || byName(['upperarmr', 'r upperarm'])
  }, [scene])

  useEffect(() => {
    if (!axeGroupRef.current) return
    const { rightHand, rightLower, rightUpper } = bonesRef.current
    const attachBone = rightHand || rightLower || rightUpper
    if (attachBone) {
      axeAttachRef.current = attachBone
      attachBone.add(axeGroupRef.current)
      axeGroupRef.current.scale.setScalar(0.08)
      if (attachBone === rightHand) {
        axeBaseRotX.current = 0.2
        axeGroupRef.current.position.set(0.015, -0.015, 0.02)
        axeGroupRef.current.rotation.set(axeBaseRotX.current, 0.2, Math.PI / 2)
      } else if (attachBone === rightLower) {
        axeBaseRotX.current = 0.1
        axeGroupRef.current.position.set(0.02, -0.03, 0.015)
        axeGroupRef.current.rotation.set(axeBaseRotX.current, 0.2, Math.PI / 2)
      } else {
        axeBaseRotX.current = 0.05
        axeGroupRef.current.position.set(0.04, -0.03, 0.015)
        axeGroupRef.current.rotation.set(axeBaseRotX.current, 0.2, Math.PI / 2)
      }
    }
  }, [])

  useEffect(() => {
    if (!axeGroupRef.current) return
    const { position, rotation, scale } = axeTuning
    axeGroupRef.current.position.set(position.x, position.y, position.z)
    axeGroupRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
    axeGroupRef.current.scale.setScalar(scale)
  }, [axeTuning])

  useEffect(() => {
    if (!actions) return
    const lower = (name) => name.toLowerCase()
    const findClip = (patterns) =>
      Object.keys(actions).find((name) =>
        patterns.some((pattern) => lower(name).includes(pattern))
      )

    const idleName = findClip(['idle_neutral', 'idle'])
    const walkName = findClip(['walk'])
    const chopName = findClip(['sword_slash', 'attack', 'swing'])

    actionCache.current.idle = idleName ? actions[idleName] : null
    actionCache.current.walk = walkName ? actions[walkName] : null
    actionCache.current.chop = chopName ? actions[chopName] : null

    if (actionCache.current.chop) {
      actionCache.current.chop.setLoop(THREE.LoopOnce, 1)
      actionCache.current.chop.clampWhenFinished = true
    }

    if (actionCache.current.idle) {
      actionCache.current.idle.play()
      currentAction.current = actionCache.current.idle
    }
  }, [actions])

  useFrame(() => {
    if (!pivotRef.current) return
    const t = timeRef.current
    const isWalking = walkRef.current
    const isChopping = chopRef.current

    const { idle, walk, chop } = actionCache.current

    if (isChopping && chop) {
      if (currentAction.current !== chop) {
        currentAction.current?.fadeOut(0.15)
        chop.reset().fadeIn(0.1).play()
        currentAction.current = chop
      }
    } else if (isWalking && walk) {
      if (currentAction.current !== walk) {
        currentAction.current?.fadeOut(0.15)
        walk.reset().fadeIn(0.1).play()
        currentAction.current = walk
      }
    } else if (idle && currentAction.current !== idle && !isChopping) {
      currentAction.current?.fadeOut(0.15)
      idle.reset().fadeIn(0.1).play()
      currentAction.current = idle
    }

    const walkActive = isWalking && !isChopping
    const walkBob = walkActive ? Math.sin(t * 8) * 0.02 : 0
    pivotRef.current.position.y = walkBob

    if (axeAttachRef.current && axeGroupRef.current) {
      const swing = isChopping ? Math.sin(t * 20) * 0.6 : 0
      axeGroupRef.current.rotation.x = axeBaseRotX.current + swing
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1.1}>
      <group ref={pivotRef}>
        <primitive object={scene} />
        <group ref={axeGroupRef} position={[0.45, 1.1, 0.1]}>
          <AxeModel position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
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

function Scene({ onHint, onTreeHealth, axeTuning, isPlaying }) {
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
  const tempQuat = useRef(new THREE.Quaternion())
  const tempVec = useRef(new THREE.Vector3())
  const lastMoveDir = useRef(new THREE.Vector3(0, 0, 1))
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

  const triggerSwing = () => {
    if (chopCooldown.current > 0) return
    chopCooldown.current = 0.35
    isChoppingRef.current = true
  }

  useEffect(() => {
    const handleClick = () => {
      if (isPlaying) triggerSwing()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [isPlaying])

  useFrame((_, delta) => {
    if (!isPlaying) return

    clock.current += delta
    const direction = tempDirection.current.set(
      (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
      0,
      (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0)
    )
    if (direction.lengthSq() > 0) {
      direction.normalize()
      lastMoveDir.current.copy(direction)
      direction.multiplyScalar(speed * delta)
      playerRef.current.add(direction)
      isWalkingRef.current = true
    } else {
      isWalkingRef.current = false
    }

    if (characterRef.current) {
      characterRef.current.position.copy(playerRef.current)
      if (isWalkingRef.current) {
        const yaw = Math.atan2(lastMoveDir.current.x, lastMoveDir.current.z)
        tempVec.current.set(0, 1, 0)
        tempQuat.current.setFromAxisAngle(tempVec.current, yaw)
        characterRef.current.quaternion.slerp(tempQuat.current, 0.2)
      }
    }

    const cameraTarget = tempCameraTarget.current.set(
      playerRef.current.x,
      1.8,
      playerRef.current.z
    )
    const scaledOffset = tempVec.current.set(6, 6, 8)
    const desiredCameraPos = tempCameraPos.current.set(
      playerRef.current.x + scaledOffset.x,
      scaledOffset.y,
      playerRef.current.z + scaledOffset.z
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
    if (!isPlaying) return treeHealth;
    triggerSwing()
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
        axeTuning={axeTuning}
      />
    </>
  )
}

function Game() {
  const { gameState, inventoryOpen, toggleInventory, openMenu, setSelectedHotbarSlot, selectedHotbarSlot, gameKey } = useGame();
  const [hint, setHint] = useState('Use WASD to move. Click the tree to chop.')
  const [treeHealth, setTreeHealth] = useState(3)
  const [axePos, setAxePos] = useState({ x: -0.00175, y: 0.001, z: -0.0001 })
  const [axeRot, setAxeRot] = useState({ x: 2, y: 0, z: 0.25 })
  const [axeScale, setAxeScale] = useState(0.08)

  const isPlaying = gameState === 'playing';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Escape') {
        openMenu();
      } else if (e.code === 'Tab' || e.code === 'KeyI') {
        toggleInventory();
      } else if (e.code.startsWith('Digit') && parseInt(e.key) >= 1 && parseInt(e.key) <= 5) {
        setSelectedHotbarSlot(parseInt(e.key) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory, openMenu, setSelectedHotbarSlot]);

  return (
    <div className="app">
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 45 }}>
        <Scene
          key={gameKey}
          onHint={(text) => setHint(text)}
          onTreeHealth={(value) => setTreeHealth(value)}
          axeTuning={{ position: axePos, rotation: axeRot, scale: axeScale }}
          isPlaying={isPlaying}
        />
      </Canvas>

      {gameState === 'playing' && (
        <div className="hud">
          <div className="title">Survival Prototype</div>
          <div className="text">{hint}</div>
          <div className="text">Tree health: {treeHealth}</div>
          <div className="hotbar-overlay">
            <div className="hud-hotbar">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`hud-slot ${selectedHotbarSlot === n - 1 ? 'active' : ''}`}>{n}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === 'menu' && <MainMenu />}
      {(gameState === 'inventory' || inventoryOpen) && <Inventory />}
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  )
}
