import * as THREE from 'three';

const NOISE = `
  float hashPoint(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float mineralNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec4 a = vec4(hashPoint(i), hashPoint(i + vec3(1,0,0)), hashPoint(i + vec3(0,1,0)), hashPoint(i + vec3(1,1,0)));
    i.z += 1.0;
    vec4 b = vec4(hashPoint(i), hashPoint(i + vec3(1,0,0)), hashPoint(i + vec3(0,1,0)), hashPoint(i + vec3(1,1,0)));
    vec4 q = mix(a, b, f.z);
    return mix(mix(q.x, q.y, f.x), mix(q.z, q.w, f.x), f.y);
  }
`;

const FINISH = { wall: 0, shell: 1, floor: 2, reveal: 3, trim: 4, felt: 5 };

export function mineral(room, color, finish) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.94, side: THREE.DoubleSide });
  const { height, front, left, right, radius, window: slit, desk, bench } = room;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.finish = { value: FINISH[finish] };
    shader.vertexShader = `varying vec3 surfacePoint;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      surfacePoint = (modelMatrix * vec4(position, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      varying vec3 surfacePoint;
      uniform int finish;
      ${NOISE}

      float softEdge(float t, float lo, float hi, float feather) {
        return smoothstep(lo - feather, lo + feather, t) * (1.0 - smoothstep(hi - feather, hi + feather, t));
      }

      // Evaluate the penumbra in the window's own plane. Angular spread grows
      // softer with distance, and the foliage filters the beam near the glass.
      float windowSun(vec3 p, vec3 n) {
        const vec3 heading = vec3(1.0, 0.313, -0.193);
        float distance = ${slit.x} - p.x;
        if (distance <= 0.0) return 0.0;
        vec3 aperture = p + distance * heading;
        float spread = 0.018 + distance * 0.026;
        float open = softEdge(aperture.z, ${slit.from + 0.022}, ${slit.to - 0.018}, spread)
                   * softEdge(aperture.y, 0.035, ${height - 0.025}, spread);
        float leaves = mineralNoise(vec3(p.x * 2.1, p.z * 4.9, aperture.y * 2.4))
                     + 0.43 * mineralNoise(vec3(p.x * 4.2, p.z * 8.0, aperture.y * 5.1));
        float filtered = mix(0.30, 1.0, smoothstep(0.49, 1.02, leaves));
        if (p.z < ${front - 0.025} && p.x < ${right - 0.08}) open = 0.0;
        return open * filtered * max(0.0, dot(n, normalize(heading)));
      }

      // Contact and bounce gradients follow the curved plan and both cutouts.
      float availableBounce(vec3 p, vec3 n) {
        float curve = clamp((${left + radius} - p.x) / ${radius}, 0.0, 1.0);
        float wallZ = ${front} - ${radius} * (1.0 - sqrt(max(0.0, 1.0 - curve * curve)));
        float wallDistance = length(vec2(max(max(${left} - p.x, p.x - ${right}), 0.0), p.z - wallZ));
        float mainWall = exp(-wallDistance * 5.7);
        float floorEdge = exp(-max(0.0, p.y) * 10.0);
        float ceilingEdge = exp(-max(0.0, ${height} - p.y) * 7.5);
        float shell = exp(-abs(p.x + 4.565) * 7.0) + exp(-abs(p.x - ${slit.x}) * 7.0)
                    + exp(-abs(p.z - 5.67) * 7.0) + exp(-abs(p.z + 4.55) * 7.0);
        float bayX = softEdge(p.x, ${bench.left}, ${bench.right}, 0.1);
        float bayZ = 1.0 - smoothstep(${front - 0.17}, ${front + 0.32}, p.z);
        float bay = bayX * bayZ * (1.0 - smoothstep(0.0, ${bench.top + 0.1}, p.y));
        float behindWall = 1.0 - smoothstep(${front - 1.15}, ${front - 0.12}, p.z);
        float sidePassage = 1.0 - smoothstep(${left - 0.14}, ${left + 0.07}, p.x);
        float cove = 1.0 - smoothstep(${desk.back - 0.03}, ${front + 0.07}, p.z);
        if (finish == 2) return max(0.25, 1.0 - 0.38 * mainWall - 0.22 * shell - bay * 0.55 - behindWall * 0.36);
        if (finish == 3) {
          float ends = exp(-abs(p.x - ${desk.right}) * 6.7) + exp(-abs(p.x - ${desk.left}) * 6.7);
          return max(0.35, 1.00 - cove * 0.47 - cove * ends * 0.20 - 0.34 * bay - floorEdge * 0.15);
        }
        if (finish == 1) return max(0.33, 1.0 - 0.30 * (floorEdge + ceilingEdge * 0.8) * (1.0 - abs(n.y)) - 0.24 * mainWall - 0.36 * behindWall * sidePassage);
        return max(0.33, 1.0 - 0.26 * floorEdge - 0.15 * ceilingEdge - 0.31 * bay - 0.29 * behindWall * sidePassage);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 p = surfacePoint;
      vec3 n = inverseTransformDirection(normal, viewMatrix);
      vec3 toLight = normalize(vec3(3.6, 2.24, -1.98) - p);
      vec3 toBounce = normalize(vec3(-1.4, 1.8, 1.8) - p);
      float forward = max(0.0, dot(n, toBounce));
      float windowBand = max(0.0, dot(n, toLight));
      float nearSlit = exp(-distance(p, vec3(4.28, 1.88, -2.29)) * 0.43);
      float windowWash = nearSlit * (0.31 + 0.68 * windowBand);
      float plasterGlow = exp(-dot((p - vec3(-2.31, 2.11, -2.56)) * vec3(1.48, 1.39, 1.2),
                                  (p - vec3(-2.31, 2.11, -2.56)) * vec3(1.48, 1.39, 1.2)));
      float bouncePatch = finish == 0 ? plasterGlow * 0.54 * max(0.0, n.z) : 0.0;
      float ceilingFalloff = 1.0 - 0.24 * max(0.0, -n.y);
      float base = (0.31 + 0.37 * forward + 0.089 * n.y + windowWash + bouncePatch) * ceilingFalloff;
      float broad = mineralNoise(p * vec3(1.4, 2.1, 1.4)) - 0.5;
      float mid = mineralNoise(p * 10.2) - 0.5;
      float fine = mineralNoise(p * 38.0) - 0.5;
      float pixelSize = max(length(dFdx(p)), length(dFdy(p)));
      float grains = (mineralNoise(p * 165.0) - 0.5) * (1.0 - smoothstep(0.002, 0.012, pixelSize));
      float aggregate = broad * 0.103 + mid * 0.079 + fine * 0.061 + grains * 0.17;
      if (finish == 2) aggregate += (mineralNoise(p * vec3(7.5, 6.0, 3.1)) - 0.5) * 0.072;
      if (finish == 5) {
        float weave = sin(p.x * 530.0) * sin((p.y + p.z) * 480.0);
        aggregate += 0.11 * weave * (1.0 - smoothstep(0.001, 0.008, pixelSize));
      }
      float indirect = base * availableBounce(p, n);
      float sun = windowSun(p, n);
      vec3 ambient = vec3(1.0, 0.966, 0.911) * indirect;
      vec3 sunlight = vec3(1.0, 0.861, 0.67) * sun * 5.6;
      outgoingLight = diffuseColor.rgb * (ambient + sunlight) * (1.0 + aggregate);
      #include <opaque_fragment>
    `);
  };
  return material;
}

export function exterior() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 viewUV;
      void main() { viewUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 viewUV;
      ${NOISE}
      void main() {
        vec2 p = viewUV * vec2(12.0, 8.0);
        float branch = sin(p.y * 3.1 + p.x * 1.5) + sin(p.x * 4.0 + p.y * 0.5);
        float twigs = pow(1.0 - abs(sin(p.x * 4.0 + p.y * 0.68 + sin(p.y * 1.2) * 0.4)), 22.0);
        float crown = mineralNoise(vec3(p * 0.97, 4.0));
        float clusters = mineralNoise(vec3(p * 7.5, 3.0));
        float leaves = smoothstep(.35, .68, crown * 0.78 + clusters * .34 + branch * .033);
        vec3 sky = mix(vec3(1.19, 1.08, .85), vec3(1.8, 1.72, 1.51), viewUV.y);
        vec3 canopy = mix(vec3(.32, .35, .15), vec3(1.13, 1.07, .55), clusters);
        canopy *= 1.0 - twigs * 0.42;
        gl_FragColor = vec4(mix(sky, canopy, leaves * 0.87), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
