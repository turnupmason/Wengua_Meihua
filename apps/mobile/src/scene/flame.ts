/**
 * Candle and incense flames: an upright billboard drawn by a shader. The teardrop is narrow at
 * a faint blue base, swells into a white-hot core and tapers to an orange tip; noise makes it
 * lick and sway, and a soft additive halo surrounds it. Works for single meshes and instanced
 * candle racks (each instance gets its own phase from its position).
 */
import * as THREE from 'three';

const vertex = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec3 center = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vSeed = fract(sin(dot(center.xz, vec2(12.9898, 78.233))) * 43758.5453);
    float sx = length(m[0].xyz);
    float sy = length(m[1].xyz);
    // Flicker: height breathes, and the whole flame leans a little.
    float t = uTime * (1.0 + vSeed * 0.4) + vSeed * 20.0;
    float flick = 1.0 + 0.07 * sin(t * 9.3) + 0.05 * sin(t * 15.7) + 0.04 * sin(t * 23.1);
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(camRight - up * dot(camRight, up));
    float lean = 0.12 * sin(t * 2.1) * uv.y * uv.y;
    vec3 p = center + right * (position.x * sx + lean * sx) + up * (position.y * sy * flick);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float t = uTime * (1.0 + vSeed * 0.4) + vSeed * 20.0;
    float y = vUv.y;
    // The tip licks and wavers more than the base.
    float n = noise(vec2(vUv.x * 2.0 + vSeed * 7.0, y * 3.0 - t * 2.6)) - 0.5;
    float x = (vUv.x - 0.5) + n * 0.28 * y * y;
    // Slim teardrop: round foot, widest a third of the way up, long pointed tip.
    float w = 0.46 * (sqrt(max(y, 0.0)) * pow(max(1.0 - y, 0.0), 0.8)) / 0.42;
    float d = abs(x) / max(w, 1e-3);
    float edge = smoothstep(1.0, 0.5, d) * smoothstep(0.0, 0.05, y);
    // Luminous zone, the darker non-luminous core over the wick, and the faint blue foot.
    float lum = smoothstep(0.1, 0.38, y) * (1.0 - smoothstep(0.72, 1.0, y));
    float core = (1.0 - smoothstep(0.02, 0.3, y)) * (1.0 - smoothstep(0.0, 0.55, d));
    float bright = lum * (1.0 - 0.55 * d * d);
    vec3 col = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.76, 0.36), bright);
    col = mix(col, vec3(1.0, 0.95, 0.84), pow(bright, 3.0) * 0.85);
    col = mix(col, vec3(0.9, 0.32, 0.12), smoothstep(0.62, 1.0, y) * 0.7);
    float foot = (1.0 - smoothstep(0.0, 0.2, y)) * smoothstep(1.0, 0.35, d);
    float a = edge * (0.18 + 0.82 * lum) * (1.0 - core * 0.65) * (1.0 - smoothstep(0.8, 1.0, y) * 0.6);
    vec3 outc = col * a + vec3(0.12, 0.22, 0.85) * foot * 0.35 * edge;
    gl_FragColor = vec4(outc * uIntensity, 1.0);
  }
`;

/** A faint warm glow around the flame (drawn on a separate, centred quad). */
const haloFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 q = vUv - 0.5;
    float a = exp(-dot(q, q) * 14.0) * 0.16 + exp(-dot(q, q) * 60.0) * 0.12;
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * a * uIntensity, 1.0);
  }
`;

let halo: THREE.ShaderMaterial | null = null;
export function flameHaloMaterial(): THREE.ShaderMaterial {
  halo ??= new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: vertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return halo;
}
let haloGeo: THREE.PlaneGeometry | null = null;
export function flameHaloGeometry(): THREE.PlaneGeometry {
  haloGeo ??= new THREE.PlaneGeometry(1, 1, 1, 1);
  return haloGeo;
}

let shared: THREE.ShaderMaterial | null = null;

/** One material for every flame (time is advanced once per frame by `tickFlames`). */
export function flameMaterial(): THREE.ShaderMaterial {
  shared ??= new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return shared;
}

let geo: THREE.PlaneGeometry | null = null;
/** Unit quad from y = 0 (wick) to y = 1 (tip), x in −0.5..0.5. */
export function flameGeometry(): THREE.PlaneGeometry {
  if (!geo) {
    geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    geo.translate(0, 0.5, 0);
  }
  return geo;
}

export function tickFlames(time: number) {
  if (shared) shared.uniforms.uTime.value = time;
  if (halo) halo.uniforms.uTime.value = time;
}
