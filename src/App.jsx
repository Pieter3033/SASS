import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

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
  const geometry = useMemo(() => new THREE.PlaneGeometry(20, 20), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: grassTexture }),
    [grassTexture]
  )
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow geometry={geometry} material={material}>
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
      <primitive object={scene} frustumCulled />
    </group>
  )
}

function Character({ groupRef, walkRef, chopRef, timeRef, axeTuning, swingValueRef, swingDirRef, firstPersonRef }) {
  const { scene, animations } = useGLTF(CHARACTER_URL)
  const { actions } = useAnimations(animations, scene)
  const pivotRef = useRef(null)
  const axeGroupRef = useRef(null)
  const axeBaseRotX = useRef(0.2)
  const axeAttachRef = useRef(null)
  const axeBaseScaleRef = useRef(0.08)
  const skinnedMeshesRef = useRef([])
  const bonesRef = useRef({
    leftUpper: null,
    leftLower: null,
    rightUpper: null,
    rightLower: null,
    rightHand: null,
    leftUpperLeg: null,
    leftLowerLeg: null,
    rightUpperLeg: null,
    rightLowerLeg: null,
  })

  const currentAction = useRef(null)
  const actionCache = useRef({ idle: null, walk: null, chop: null })

  useMemo(() => {
    skinnedMeshesRef.current = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.isSkinnedMesh) {
          skinnedMeshesRef.current.push(child)
        }
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
    bonesRef.current.leftLower = byExact('LowerArmL') || byName(['lowerarml', 'forearm', 'l lowerarm'])
    bonesRef.current.leftUpper = byExact('UpperArmL') || byName(['upperarml', 'l upperarm'])
    bonesRef.current.leftUpperLeg = byExact('UpperLegL') || byName(['upperlegl', 'thigh'])
    bonesRef.current.leftLowerLeg = byExact('LowerLegL') || byName(['lowerlegl', 'calf'])
    bonesRef.current.rightUpperLeg = byExact('UpperLegR') || byName(['upperlegr', 'thigh'])
    bonesRef.current.rightLowerLeg = byExact('LowerLegR') || byName(['lowerlegr', 'calf'])
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
    axeBaseScaleRef.current = scale
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
    } else if (actionCache.current.walk) {
      actionCache.current.walk.play()
      currentAction.current = actionCache.current.walk
    }
  }, [actions])

  useFrame(() => {
    if (!pivotRef.current) return
    const t = timeRef.current
    const isWalking = walkRef.current
    const isChopping = chopRef.current
    const walkActive = isWalking && !isChopping
    const walkBob = walkActive ? Math.sin(t * 8) * 0.02 : 0
    pivotRef.current.position.y = walkBob

    if (axeAttachRef.current && axeGroupRef.current) {
      const swing = isChopping ? swingValueRef.current : 0
      const baseX = axeTuning.rotation.x
      const baseY = axeTuning.rotation.y
      const baseZ = axeTuning.rotation.z
      axeGroupRef.current.rotation.x = baseX
      axeGroupRef.current.rotation.y = baseY
      axeGroupRef.current.rotation.z = baseZ + swing
      axeGroupRef.current.scale.set(
        axeBaseScaleRef.current * swingDirRef.current,
        axeBaseScaleRef.current,
        axeBaseScaleRef.current
      )
    }

    if (firstPersonRef?.current) {
      skinnedMeshesRef.current.forEach((mesh) => {
        if (mesh.visible) mesh.visible = false
      })
    } else {
      skinnedMeshesRef.current.forEach((mesh) => {
        if (!mesh.visible) mesh.visible = true
      })
    }

    const { idle, walk, chop } = actionCache.current
    if (isChopping && chop) {
      if (currentAction.current !== chop) {
        currentAction.current?.fadeOut(0.15)
        chop.reset().fadeIn(0.1).play()
        currentAction.current = chop
      }
      return
    }
    if (isWalking && walk) {
      if (currentAction.current !== walk) {
        currentAction.current?.fadeOut(0.15)
        walk.reset().fadeIn(0.1).play()
        currentAction.current = walk
      }
      return
    }
    if (idle && currentAction.current !== idle) {
      currentAction.current?.fadeOut(0.15)
      idle.reset().fadeIn(0.1).play()
      currentAction.current = idle
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
  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8), [])
  const leafGeometry = useMemo(() => new THREE.ConeGeometry(1.2, 2.4, 10), [])
  const topGeometry = useMemo(() => new THREE.SphereGeometry(0.6, 10, 10), [])
  const trunkMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6a4a2f', roughness: 0.9 }),
    []
  )
  const trunkMaterialInactive = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4f3a26', roughness: 0.9 }),
    []
  )
  const leafMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f6f32', roughness: 0.9 }),
    []
  )
  const topMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#357a3a', roughness: 0.9 }),
    []
  )

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
      <mesh
        ref={trunkRef}
        castShadow
        geometry={trunkGeometry}
        material={canChop ? trunkMaterial : trunkMaterialInactive}
      />
      <mesh position={[0, 1.6, 0]} castShadow geometry={leafGeometry} material={leafMaterial} />
      {!isFalling && (
        <mesh position={[0, 2.8, 0]} castShadow geometry={topGeometry} material={topMaterial} />
      )}
    </group>
  )
}

function Scene({ onHint, onTreeHealth, axeTuning, onSwingDebug, fpConfig, onFirstPersonChange, pointerLocked }) {
  const { camera } = useThree()
  const [treeHealth, setTreeHealth] = useState(3)
  const playerRef = useRef(new THREE.Vector3(0, 0, 0))
  const characterRef = useRef(null)
  const keysRef = useRef({})
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
  const swingDirRef = useRef(1)
  const swingValueRef = useRef(0)
  const swingProgressRef = useRef(0)
  const swingActiveRef = useRef(false)
  const chopCooldown = useRef(0)
  const clock = useRef(0)
  const firstPersonRef = useRef(false)
  const zoomFactorRef = useRef(1)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const targetYawRef = useRef(0)
  const targetPitchRef = useRef(0)
  const moveVelRef = useRef(new THREE.Vector3())
  const forwardRef = useRef(new THREE.Vector3())
  const rightRef = useRef(new THREE.Vector3())

  useEffect(() => {
    const handleDown = (event) => {
      keysRef.current[event.code] = true
      if (event.code === 'KeyF') {
        firstPersonRef.current = !firstPersonRef.current
        if (onFirstPersonChange) {
          onFirstPersonChange(firstPersonRef.current)
        }
      }
    }
    const handleUp = (event) => {
      keysRef.current[event.code] = false
    }
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
    }
  }, [])

  useEffect(() => {
    const handleWheel = (event) => {
      if (firstPersonRef.current) return
      const next = Math.min(Math.max(zoomFactorRef.current + event.deltaY * 0.001, 0.4), 2.5)
      zoomFactorRef.current = next
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!firstPersonRef.current) return
      if (!pointerLocked) return
      targetYawRef.current -= event.movementX * 0.002
      targetPitchRef.current += event.movementY * 0.002
      targetPitchRef.current = Math.max(-1.2, Math.min(1.2, targetPitchRef.current))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [pointerLocked])

  const triggerSwing = () => {
    if (chopCooldown.current > 0) return
    swingDirRef.current *= -1
    swingProgressRef.current = 0
    swingActiveRef.current = true
    chopCooldown.current = 0.35
    isChoppingRef.current = true
  }

  useEffect(() => {
    const handleClick = () => {
      triggerSwing()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  useFrame((_, delta) => {
    clock.current += delta
    const inputX = (keysRef.current.KeyD ? 1 : 0) - (keysRef.current.KeyA ? 1 : 0)
    const inputZ = (keysRef.current.KeyS ? 1 : 0) - (keysRef.current.KeyW ? 1 : 0)
    const direction = tempDirection.current.set(inputX, 0, inputZ)
    const moveVel = moveVelRef.current
    if (direction.lengthSq() > 0) {
      direction.normalize()
      if (firstPersonRef.current) {
        const forward = forwardRef.current.set(
          Math.sin(yawRef.current),
          0,
          Math.cos(yawRef.current)
        )
        const right = rightRef.current.set(-forward.z, 0, forward.x)
        const moveDir = tempVec.current
          .set(0, 0, 0)
          .addScaledVector(right, inputX)
          .addScaledVector(forward, -inputZ)
        if (moveDir.lengthSq() > 0) moveDir.normalize()
        lastMoveDir.current.copy(moveDir)
        moveDir.multiplyScalar(speed)
        moveVel.lerp(moveDir, 0.15)
      } else {
        lastMoveDir.current.copy(direction)
        direction.multiplyScalar(speed)
        moveVel.lerp(direction, 0.15)
      }
      isWalkingRef.current = true
    } else {
      moveVel.lerp(tempVec.current.set(0, 0, 0), 0.2)
      isWalkingRef.current = false
    }
    playerRef.current.addScaledVector(moveVel, delta)

    if (characterRef.current) {
      characterRef.current.position.copy(playerRef.current)
      if (!firstPersonRef.current && isWalkingRef.current) {
        const yaw = Math.atan2(lastMoveDir.current.x, lastMoveDir.current.z)
        tempVec.current.set(0, 1, 0)
        tempQuat.current.setFromAxisAngle(tempVec.current, yaw)
        characterRef.current.quaternion.slerp(tempQuat.current, 0.2)
      }
    }

    if (firstPersonRef.current && characterRef.current) {
      yawRef.current = THREE.MathUtils.lerp(yawRef.current, targetYawRef.current, 0.06)
      pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitchRef.current, 0.06)
      characterRef.current.rotation.y = yawRef.current
      const headPos = tempCameraPos.current.set(
        characterRef.current.position.x + fpConfig.offset.x,
        characterRef.current.position.y + fpConfig.offset.y,
        characterRef.current.position.z + fpConfig.offset.z
      )
      const forward = tempCameraTarget.current
        .set(Math.sin(yawRef.current), 0, Math.cos(yawRef.current))
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), pitchRef.current)
        .multiplyScalar(fpConfig.lookDistance)
        .add(headPos)
      camera.position.lerp(headPos, 0.12)
      camera.lookAt(forward)
      camera.fov = fpConfig.fov
      camera.updateProjectionMatrix()
    } else {
      const cameraTarget = tempCameraTarget.current.set(
        playerRef.current.x,
        1.8,
        playerRef.current.z
      )
      const scaledOffset = tempVec.current.set(6, 6, 8).multiplyScalar(zoomFactorRef.current)
      const desiredCameraPos = tempCameraPos.current.set(
        playerRef.current.x + scaledOffset.x,
        scaledOffset.y,
        playerRef.current.z + scaledOffset.z
      )
      camera.position.lerp(desiredCameraPos, 0.08)
      camera.lookAt(cameraTarget)
      camera.fov = 45
      camera.updateProjectionMatrix()
    }

    if (chopCooldown.current > 0) {
      chopCooldown.current = Math.max(chopCooldown.current - delta, 0)
      if (chopCooldown.current === 0) {
        isChoppingRef.current = false
      }
    }

    if (swingActiveRef.current) {
      swingProgressRef.current = Math.min(swingProgressRef.current + delta * 3.5, 1)
      const phase = Math.sin(Math.PI * swingProgressRef.current)
      swingValueRef.current = phase * 0.8 * swingDirRef.current
      if (swingProgressRef.current >= 1) {
        swingActiveRef.current = false
        swingValueRef.current = 0
      }
    }

    if (onSwingDebug) {
      onSwingDebug({
        dir: swingDirRef.current,
        value: swingValueRef.current,
        active: swingActiveRef.current ? 1 : 0,
        progress: swingProgressRef.current,
      })
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
        swingValueRef={swingValueRef}
        swingDirRef={swingDirRef}
        firstPersonRef={firstPersonRef}
      />
    </>
  )
}

function App() {
  const [hint, setHint] = useState('Use WASD to move. Click the tree to chop.')
  const [treeHealth, setTreeHealth] = useState(3)
  const [cursorLocked, setCursorLocked] = useState(false)
  const [firstPerson, setFirstPerson] = useState(false)
  const canvasRef = useRef(null)
  const [fpOffset] = useState({ x: 0, y: 1.6, z: 0 })
  const [fpLook] = useState({ x: 0, y: 0, z: 1 })
  const [fpLookDistance] = useState(2)
  const [fpFov] = useState(45)
  const axeTuning = useMemo(
    () => ({
      position: { x: -0.00175, y: 0.001, z: -0.0001 },
      rotation: { x: 2, y: 0, z: 0.25 },
      scale: 0.08,
    }),
    []
  )

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current
      setCursorLocked(locked)
    }
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [])

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.code !== 'Escape') return
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    if (firstPerson) return
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [firstPerson])

  const handleCanvasPointerDown = () => {
    if (!firstPerson) return
    if (!canvasRef.current) return
    if (document.pointerLockElement === canvasRef.current) return
    canvasRef.current.requestPointerLock()
  }

  return (
    <div className={`app ${cursorLocked ? 'locked' : ''}`}>
      <Canvas
        shadows
        camera={{ position: [6, 6, 8], fov: 45 }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
        }}
        onPointerDown={handleCanvasPointerDown}
      >
        <Scene
          onHint={(text) => setHint(text)}
          onTreeHealth={(value) => setTreeHealth(value)}
          onSwingDebug={null}
          onFirstPersonChange={(value) => setFirstPerson(value)}
          axeTuning={axeTuning}
          pointerLocked={cursorLocked}
          fpConfig={{
            offset: fpOffset,
            look: fpLook,
            lookDistance: fpLookDistance,
            fov: fpFov,
          }}
        />
      </Canvas>
      <div className={`crosshair ${cursorLocked ? 'show' : ''}`} />
      <div className="hud">
        <div className="title">Survival Prototype</div>
        <div className="text">{hint}</div>
        <div className="text">Tree health: {treeHealth}</div>
        <div className="text">Scroll to zoom. Press F for first person.</div>
      </div>
    </div>
  )
}

useGLTF.preload(CHARACTER_URL)
useGLTF.preload(AXE_URL)

export default App
