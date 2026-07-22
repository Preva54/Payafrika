"use client"

import { useRef, useMemo, useEffect, Suspense } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

const AFRICAN_CITIES = [
  { name: "Johannesburg", lat: -26.2041, lon: 28.0473 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Accra", lat: 5.6037, lon: -0.187 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357 },
  { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { name: "Addis Ababa", lat: 9.032, lon: 38.7469 },
  { name: "Casablanca", lat: 33.5731, lon: -7.5898 },
  { name: "Dakar", lat: 14.7167, lon: -17.4677 },
  { name: "Kinshasa", lat: -4.325, lon: 15.3222 },
  { name: "Lusaka", lat: -15.3875, lon: 28.3228 },
  { name: "Harare", lat: -17.8252, lon: 31.0335 },
]

function latLonToPosition(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null)

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGlowColor: { value: new THREE.Color("#0057FF") },
        uSkyColor: { value: new THREE.Color("#4CC9FF") },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform vec3 uSkyColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diff = max(dot(vNormal, lightDir), 0.0);
          float glow = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0) * 0.6;

          float lat = vUv.y;
          float africaMask = smoothstep(0.2, 0.45, vUv.x) * smoothstep(0.65, 0.45, vUv.x);
          africaMask *= smoothstep(0.25, 0.35, lat) * smoothstep(0.8, 0.6, lat);

          vec3 baseColor = mix(
            vec3(0.05, 0.1, 0.2),
            vec3(0.02, 0.05, 0.12),
            diff
          );

          float pulse = sin(uTime * 0.5) * 0.3 + 0.7;
          vec3 africaColor = uGlowColor * africaMask * pulse * 0.8;

          vec3 finalColor = baseColor + africaColor + glow * uSkyColor * 0.3;
          finalColor += vec3(0.0, 0.1, 0.2) * glow * 0.5;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: true,
    })
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[2, 64, 64]} />
    </mesh>
  )
}

function CityParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const pos: number[] = []
    AFRICAN_CITIES.forEach((city) => {
      const p = latLonToPosition(city.lat, city.lon, 2.05)
      pos.push(p.x, p.y, p.z)
    })
    return new Float32Array(pos)
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#4CC9FF"
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  )
}

function TradeRoutes() {
  const lineRef = useRef<THREE.Group>(null)

  const routes = useMemo(() => {
    const routeData: THREE.Vector3[][] = []
    const numRoutes = 8

    for (let i = 0; i < numRoutes; i++) {
      const startIdx = Math.floor(Math.random() * AFRICAN_CITIES.length)
      let endIdx = Math.floor(Math.random() * AFRICAN_CITIES.length)
      while (endIdx === startIdx) {
        endIdx = Math.floor(Math.random() * AFRICAN_CITIES.length)
      }

      const start = AFRICAN_CITIES[startIdx]
      const end = AFRICAN_CITIES[endIdx]

      const startPos = latLonToPosition(start.lat, start.lon, 2.0)
      const endPos = latLonToPosition(end.lat, end.lon, 2.0)

      const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5)
      const height = 1.5 + Math.random() * 2
      mid.normalize().multiplyScalar(height + 2.0)

      const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos)
      const points = curve.getPoints(30)
      routeData.push(points)
    }
    return routeData
  }, [])

  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <group ref={lineRef}>
      {routes.map((points, idx) => {
        const positions = points.flatMap((p) => [p.x, p.y, p.z])
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))

        return (
          <line key={idx} geometry={geometry}>
            <lineBasicMaterial
              color={`hsl(${200 + idx * 20}, 80%, ${60 + idx * 5}%)`}
              transparent
              opacity={0.3 + Math.random() * 0.2}
            />
          </line>
        )
      })}
    </group>
  )
}

function FloatingParticles({ count = 500 }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, sizes] = useMemo(() => {
    const pos: number[] = []
    const size: number[] = []
    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      size.push(Math.random() * 0.03 + 0.01)
    }
    return [new Float32Array(pos), new Float32Array(size)]
  }, [count])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#4CC9FF"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function MouseTracker() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2
      const y = (event.clientY / window.innerHeight - 0.5) * 2

      const targetX = x * 0.3
      const targetY = -y * 0.2

      camera.position.x += (targetX - camera.position.x) * 0.02
      camera.position.y += (targetY - camera.position.y) * 0.02
      camera.lookAt(0, 0, 0)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [camera])

  return null
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color="#4CC9FF" />

      <MouseTracker />

      <group rotation={[0.3, 0, 0]}>
        <GlobeMesh />
        <CityParticles />
        <TradeRoutes />
        <FloatingParticles count={400} />
      </group>
    </>
  )
}

export function ThreeGlobe() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45, near: 0.1, far: 20 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
