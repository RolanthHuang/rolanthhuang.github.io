import * as THREE from 'three';
import { WINDOW_MASK_GLSL } from './fx.js';

/* Post pipeline: MSAA scene -> SSAO (depth only) -> moonbeam volume -> bloom -> depth of field -> ACES grade.
   Each stage can be switched off for slower machines; the final pass still runs and simply skips what is missing. */
const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const SS = `float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }`;
const VIEWPOS = `uniform mat4 uProjInv;
  vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 c = vec4(uv*2.-1., d*2.-1., 1.); vec4 v = uProjInv * c; return v.xyz / v.w; }`;

export class Pipeline {
  constructor(renderer, { samples = 4, dofTaps = 32, aoSamples = 12, volSteps = 40 } = {}) {
    this.r = renderer;
    this.samples = samples;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(g, null); this.quad.frustumCulled = false;
    this.fs = new THREE.Scene(); this.fs.add(this.quad);
    this.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); this.white.needsUpdate = true;
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.black.needsUpdate = true;
    const M = (o) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, depthTest: false, depthWrite: false, ...o });
    this.mats = {
      copy: M({ uniforms: { tColor: { value: null } }, fragmentShader: `uniform sampler2D tColor; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tColor, vUv); }` }),
      ao: M({
        defines: { SAMPLES: aoSamples },
        uniforms: { tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uP11: { value: 1 }, uAspect: { value: 1 }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.45 }, uI: { value: 1.0 }, uFar: { value: 50 } },
        fragmentShader: `${SS} uniform sampler2D tDepth; uniform float uP11, uAspect, uRadius, uI, uFar; uniform vec2 uTexel; varying vec2 vUv; ${VIEWPOS}
          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
          void main(){
            vec3 P = viewPos(vUv);
            if(-P.z > uFar*0.98){ gl_FragColor = vec4(1.); return; }
            vec3 pr = viewPos(vUv + vec2(uTexel.x, 0.)), pl = viewPos(vUv - vec2(uTexel.x, 0.));
            vec3 pu = viewPos(vUv + vec2(0., uTexel.y)), pd = viewPos(vUv - vec2(0., uTexel.y));
            vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
            vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
            vec3 N = normalize(cross(dx, dy));
            float rs = uRadius * uP11 / -P.z * 0.5;
            rs = min(rs, 0.12);
            float occ = 0.;
            float jit = hash(gl_FragCoord.xy) * 6.2831;
            for(int i = 0; i < SAMPLES; i++){
              float fi = (float(i) + 0.5) / float(SAMPLES);
              float r = sqrt(fi) * rs; float a = float(i) * 2.39996 + jit;
              vec2 o = vec2(cos(a) / uAspect, sin(a)) * r;
              vec3 S = viewPos(vUv + o);
              vec3 v = S - P; float l = length(v) + 1e-4;
              float c = max(0., dot(N, v / l) - 0.1);
              occ += c * (1. - ss(uRadius * 0.7, uRadius * 1.8, l));
            }
            float ao = clamp(1. - uI * occ / float(SAMPLES) * 1.6, 0., 1.);
            gl_FragColor = vec4(vec3(ao), 1.);
          }`,
      }),
      aoBlur: M({
        uniforms: { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uNear: { value: 0.05 }, uFar: { value: 50 } },
        fragmentShader: `uniform sampler2D tAO, tDepth; uniform vec2 uDir; uniform float uNear, uFar; varying vec2 vUv;
          float linD(float d){ float z = d*2.-1.; return 2.*uNear*uFar/(uFar+uNear - z*(uFar-uNear)); }
          void main(){ float z0 = linD(texture2D(tDepth, vUv).r); float s = 0., w = 0.;
            for(int i=-3;i<=3;i++){ vec2 uv = vUv + uDir*float(i); float z = linD(texture2D(tDepth, uv).r);
              float wt = exp(-float(i*i)/8.) * exp(-abs(z - z0) / (0.03*z0 + 0.01) );
              s += texture2D(tAO, uv).r * wt; w += wt; }
            gl_FragColor = vec4(vec3(s / max(w, 1e-4)), 1.); }`,
      }),
      bright: M({
        uniforms: { tColor: { value: null }, uTexel: { value: new THREE.Vector2() }, uTh: { value: 1.0 } },
        fragmentShader: `${SS} uniform sampler2D tColor; uniform vec2 uTexel; uniform float uTh; varying vec2 vUv;
          void main(){ vec3 c = (texture2D(tColor, vUv + uTexel*vec2(-1,-1)).rgb + texture2D(tColor, vUv + uTexel*vec2(1,-1)).rgb + texture2D(tColor, vUv + uTexel*vec2(-1,1)).rgb + texture2D(tColor, vUv + uTexel*vec2(1,1)).rgb)*0.25;
            float l = max(max(c.r,c.g),c.b); float k = ss(uTh, uTh*2.5, l); gl_FragColor = vec4(min(c*k, vec3(40.)), 1.); }`,
      }),
      blur: M({
        uniforms: { tColor: { value: null }, uDir: { value: new THREE.Vector2() } },
        fragmentShader: `uniform sampler2D tColor; uniform vec2 uDir; varying vec2 vUv;
          void main(){ vec3 c = texture2D(tColor, vUv).rgb*0.2270;
            c += (texture2D(tColor, vUv + uDir*1.3846).rgb + texture2D(tColor, vUv - uDir*1.3846).rgb)*0.3162;
            c += (texture2D(tColor, vUv + uDir*3.2308).rgb + texture2D(tColor, vUv - uDir*3.2308).rgb)*0.0703;
            gl_FragColor = vec4(c, 1.); }`,
      }),
      coc: M({
        uniforms: { tColor: { value: null }, tDepth: { value: null }, tAO: { value: null }, uAOI: { value: 1 }, uNear: { value: 0.05 }, uFar: { value: 80 }, uFocus: { value: 6 }, uAperture: { value: 0.01 }, uH: { value: 1000 }, uTexel: { value: new THREE.Vector2() } },
        fragmentShader: `uniform sampler2D tColor, tDepth, tAO; uniform float uNear, uFar, uFocus, uAperture, uH, uAOI; uniform vec2 uTexel; varying vec2 vUv;
          float linD(float d){ float z = d*2.-1.; return 2.*uNear*uFar/(uFar+uNear - z*(uFar-uNear)); }
          void main(){ vec3 c = (texture2D(tColor, vUv + uTexel*vec2(-.5,-.5)).rgb + texture2D(tColor, vUv + uTexel*vec2(.5,-.5)).rgb + texture2D(tColor, vUv + uTexel*vec2(-.5,.5)).rgb + texture2D(tColor, vUv + uTexel*vec2(.5,.5)).rgb)*0.25;
            c *= mix(1., texture2D(tAO, vUv).r, uAOI);
            float z = linD(texture2D(tDepth, vUv).r); float coc = clamp(uAperture*abs(z-uFocus)/z*uH, 0., 22.);
            gl_FragColor = vec4(c, coc); }`,
      }),
      dof: M({
        defines: { TAPS: dofTaps },
        uniforms: { tHalf: { value: null }, uTexel: { value: new THREE.Vector2() } },
        fragmentShader: `${SS} uniform sampler2D tHalf; uniform vec2 uTexel; varying vec2 vUv;
          void main(){ vec4 c0 = texture2D(tHalf, vUv); float cc = c0.a; if(cc < 0.6){ gl_FragColor = c0; return; }
            vec3 acc = c0.rgb; float ws = 1.;
            float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453)*6.2831;
            for(int i=0;i<TAPS;i++){ float fi = float(i)+0.5; float r = sqrt(fi/float(TAPS))*cc; float a = fi*2.39996 + jit;
              vec4 s = texture2D(tHalf, vUv + vec2(cos(a), sin(a))*r*uTexel);
              float w = ss(r*0.5-0.5, r*0.5+1.0, s.a) + 0.04;
              float lum = dot(s.rgb, vec3(0.3,0.59,0.11));
              w *= 1.0 + ss(1.2, 4.0, lum) * 2.0;
              acc += s.rgb*w; ws += w; }
            gl_FragColor = vec4(acc/ws, cc); }`,
      }),
      vol: M({
        defines: { STEPS: volSteps },
        uniforms: { tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uTime: { value: 0 }, uDensity: { value: 0.35 }, uMoonCol: { value: new THREE.Color(0.55, 0.65, 1.0) },
          uWinO: { value: new THREE.Vector3() }, uWinX: { value: new THREE.Vector3(1, 0, 0) }, uWinNrm: { value: new THREE.Vector3(0, 0, 1) }, uMoon: { value: new THREE.Vector3(0, 1, 0) } },
        fragmentShader: `uniform sampler2D tDepth; uniform mat4 uProjInv, uCamWorld; uniform vec3 uCamPos, uMoonCol; uniform float uTime, uDensity; varying vec2 vUv; ${WINDOW_MASK_GLSL}
          float hsh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
            return mix(mix(mix(hsh(i), hsh(i+vec3(1,0,0)), f.x), mix(hsh(i+vec3(0,1,0)), hsh(i+vec3(1,1,0)), f.x), f.y), mix(mix(hsh(i+vec3(0,0,1)), hsh(i+vec3(1,0,1)), f.x), mix(hsh(i+vec3(0,1,1)), hsh(i+vec3(1,1,1)), f.x), f.y), f.z); }
          void main(){
            float d = texture2D(tDepth, vUv).r;
            vec4 c = vec4(vUv*2.-1., d*2.-1., 1.); vec4 v = uProjInv * c; v /= v.w;
            vec3 hitW = (uCamWorld * vec4(v.xyz, 1.)).xyz;
            vec3 rd = hitW - uCamPos; float L = length(rd); rd /= L; L = min(L, 16.);
            float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            float dt = L / float(STEPS); float acc = 0.;
            for (int i = 0; i < STEPS; i++){ float t = (float(i) + jit) * dt; vec3 p = uCamPos + rd * t; float m = windowMask(p);
              if (m > 0.0) { float n = vn3(p * 1.7 + vec3(0.0, uTime * 0.04, uTime * 0.025)) * 0.65 + vn3(p * 5.3 - uTime * 0.03) * 0.35; acc += m * (0.2 + 1.5 * n * n) * dt; } }
            float g = 0.55, ct = dot(rd, uMoon);
            float hg = (1. - g*g) / (12.566 * pow(1. + g*g - 2.*g*ct, 1.5));
            gl_FragColor = vec4(uMoonCol * acc * uDensity * (0.02 + hg * 4.0), 1.);
          }`,
      }),
      final: M({
        uniforms: {
          tScene: { value: null }, tDof: { value: null }, tB1: { value: null }, tB2: { value: null }, tDepth: { value: null }, tAO: { value: null }, tVol: { value: null }, uVolI: { value: 0 }, uAOI: { value: 1 },
          uNear: { value: 0.05 }, uFar: { value: 80 }, uFocus: { value: 6 }, uAperture: { value: 0.01 }, uH: { value: 1000 },
          uExposure: { value: 1.0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uBloom: { value: 0.5 }, uVig: { value: 1.0 }, uFade: { value: 1 }, uWarm: { value: 1 }, uGrain: { value: 1 }, uSat: { value: 0.92 },
        },
        fragmentShader: `${SS} uniform sampler2D tScene, tDof, tB1, tB2, tDepth, tAO, tVol; uniform float uVolI; uniform float uNear, uFar, uFocus, uAperture, uH, uExposure, uTime, uBloom, uVig, uFade, uWarm, uGrain, uAOI, uSat; uniform vec2 uRes; varying vec2 vUv;
          float linD(float d){ float z = d*2.-1.; return 2.*uNear*uFar/(uFar+uNear - z*(uFar-uNear)); }
          vec3 aces(vec3 x){ const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0., 1.); }
          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
          vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, step(0.0031308, c)); }
          void main(){
            vec2 uv = vUv; vec2 d = uv - 0.5;
            float ca = dot(d,d)*0.004;
            vec3 sharp; sharp.r = texture2D(tScene, uv - d*ca).r; sharp.g = texture2D(tScene, uv).g; sharp.b = texture2D(tScene, uv + d*ca).b;
            sharp *= mix(1., texture2D(tAO, uv).r, uAOI);
            vec3 col = sharp;
            if (uAperture > 0.0) {
              float z = linD(texture2D(tDepth, uv).r); float coc = clamp(uAperture*abs(z-uFocus)/z*uH, 0., 22.);
              col = mix(sharp, texture2D(tDof, uv).rgb, ss(1.0, 3.5, coc));
            }
            vec3 b1 = texture2D(tB1, uv).rgb, b2 = texture2D(tB2, uv).rgb;
            col += (b1*0.6 + b2*0.8)*uBloom;
            col += b2*vec3(1.0, 0.4, 0.14)*0.14*uBloom;
            col += texture2D(tVol, uv).rgb * uVolI;
            col *= uExposure;
            col = aces(col);
            float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
            vec3 sh = vec3(0.95, 1.0, 1.04), hi = vec3(1.05, 1.0, 0.9);
            col *= mix(sh, hi, ss(0.1, 0.8, l) * uWarm);
            col = mix(vec3(l), col, uSat);
            col = col*0.97 + 0.008;
            float vig = 1.0 - ss(0.3, 1.1, length(d*vec2(1.15, 1.0)));
            col *= mix(1.0, vig, 0.6*uVig);
            col = toSRGB(clamp(col, 0., 1.));
            float gr = hash(uv*uRes + fract(uTime*7.13)*100.) - 0.5;
            col += gr*0.028*uGrain;
            col *= uFade;
            gl_FragColor = vec4(col, 1.);
          }`,
      }),
    };
    this.setSize(2, 2);
  }
  rt(w, h, opt = {}) { return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...opt }); }
  setSamples(n) { if (n === this.samples) return; this.samples = n; this.setSize(this.w, this.h, true); }
  setSize(w, h, force = false) {
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    if (!force && w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    [this.rtA, this.rtH, this.rtH2, this.q1, this.q2, this.e1, this.e2, this.ao1, this.ao2, this.v1, this.v2].forEach(t => t && t.dispose());
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
    this.rtA = this.rt(w, h, { depthBuffer: true, depthTexture: dt, samples: this.samples });
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.rtH = this.rt(hw, hh); this.rtH2 = this.rt(hw, hh);
    this.ao1 = this.rt(hw, hh, { type: THREE.UnsignedByteType }); this.ao2 = this.rt(hw, hh, { type: THREE.UnsignedByteType });
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2), ew = Math.max(1, w >> 3), eh = Math.max(1, h >> 3);
    this.q1 = this.rt(qw, qh); this.q2 = this.rt(qw, qh); this.e1 = this.rt(ew, eh); this.e2 = this.rt(ew, eh);
    this.v1 = this.rt(hw, hh); this.v2 = this.rt(hw, hh);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.fs, this.cam); }
  /* P: { focus, aperture, exposure, bloom, bloomTh, time, ao (bool), aoRadius, aoI, aoMix, vol (obj|null), sat, warm, vig, grain, fade } */
  render(scene, camera, P) {
    const r = this.r, m = this.mats;
    r.setRenderTarget(this.rtA); r.clear(true, true, true); r.render(scene, camera);
    let aoTex = this.white;
    if (P.ao) {
      const au = m.ao.uniforms;
      au.tDepth.value = this.rtA.depthTexture; au.uProjInv.value.copy(camera.projectionMatrixInverse); au.uP11.value = camera.projectionMatrix.elements[5];
      au.uAspect.value = this.w / this.h; au.uTexel.value.set(1 / this.w, 1 / this.h); au.uRadius.value = P.aoRadius ?? 0.45; au.uI.value = P.aoI ?? 1.0; au.uFar.value = camera.far;
      this.pass(m.ao, this.ao1);
      const bu = m.aoBlur.uniforms; bu.tDepth.value = this.rtA.depthTexture; bu.uNear.value = camera.near; bu.uFar.value = camera.far;
      bu.tAO.value = this.ao1.texture; bu.uDir.value.set(1 / this.ao1.width, 0); this.pass(m.aoBlur, this.ao2);
      bu.tAO.value = this.ao2.texture; bu.uDir.value.set(0, 1 / this.ao1.height); this.pass(m.aoBlur, this.ao1);
      aoTex = this.ao1.texture;
    }
    let volTex = this.black;
    if (P.vol) {
      const vu = m.vol.uniforms; vu.tDepth.value = this.rtA.depthTexture; vu.uProjInv.value.copy(camera.projectionMatrixInverse); vu.uCamWorld.value.copy(camera.matrixWorld); vu.uCamPos.value.setFromMatrixPosition(camera.matrixWorld); vu.uTime.value = P.time;
      vu.uDensity.value = P.vol.density; vu.uMoonCol.value.copy(P.vol.color); vu.uWinO.value.copy(P.vol.winO); vu.uWinX.value.copy(P.vol.winX); vu.uWinNrm.value.copy(P.vol.winN); vu.uMoon.value.copy(P.vol.moon);
      this.pass(m.vol, this.v1);
      m.blur.uniforms.tColor.value = this.v1.texture; m.blur.uniforms.uDir.value.set(1 / this.v1.width, 0); this.pass(m.blur, this.v2);
      m.blur.uniforms.tColor.value = this.v2.texture; m.blur.uniforms.uDir.value.set(0, 1 / this.v1.height); this.pass(m.blur, this.v1);
      volTex = this.v1.texture;
    }
    // bloom
    m.bright.uniforms.tColor.value = this.rtA.texture; m.bright.uniforms.uTexel.value.set(1 / this.w, 1 / this.h); m.bright.uniforms.uTh.value = P.bloomTh ?? 1;
    this.pass(m.bright, this.q1);
    m.blur.uniforms.tColor.value = this.q1.texture; m.blur.uniforms.uDir.value.set(1 / this.q1.width, 0); this.pass(m.blur, this.q2);
    m.blur.uniforms.tColor.value = this.q2.texture; m.blur.uniforms.uDir.value.set(0, 1 / this.q1.height); this.pass(m.blur, this.q1);
    m.copy.uniforms.tColor.value = this.q1.texture; this.pass(m.copy, this.e1);
    m.blur.uniforms.tColor.value = this.e1.texture; m.blur.uniforms.uDir.value.set(1.5 / this.e1.width, 0); this.pass(m.blur, this.e2);
    m.blur.uniforms.tColor.value = this.e2.texture; m.blur.uniforms.uDir.value.set(0, 1.5 / this.e1.height); this.pass(m.blur, this.e1);
    // depth of field (skipped when the aperture is closed)
    const dof = P.dof && P.aperture > 1e-5;
    if (dof) {
      const cu = m.coc.uniforms; cu.tColor.value = this.rtA.texture; cu.tDepth.value = this.rtA.depthTexture; cu.tAO.value = aoTex; cu.uAOI.value = P.ao ? (P.aoMix ?? 0.85) : 0;
      cu.uNear.value = camera.near; cu.uFar.value = camera.far; cu.uFocus.value = P.focus; cu.uAperture.value = P.aperture; cu.uH.value = this.rtH.height; cu.uTexel.value.set(1 / this.w, 1 / this.h);
      this.pass(m.coc, this.rtH);
      m.dof.uniforms.tHalf.value = this.rtH.texture; m.dof.uniforms.uTexel.value.set(1 / this.rtH.width, 1 / this.rtH.height);
      this.pass(m.dof, this.rtH2);
    }
    const f = m.final.uniforms;
    f.tScene.value = this.rtA.texture; f.tDof.value = this.rtH2.texture; f.tB1.value = this.q1.texture; f.tB2.value = this.e1.texture; f.tDepth.value = this.rtA.depthTexture;
    f.tAO.value = aoTex; f.uAOI.value = P.ao ? (P.aoMix ?? 0.85) : 0; f.tVol.value = volTex; f.uVolI.value = P.vol ? 1 : 0;
    f.uNear.value = camera.near; f.uFar.value = camera.far; f.uFocus.value = P.focus; f.uAperture.value = dof ? P.aperture : 0; f.uH.value = this.rtH.height * 2.0;
    f.uExposure.value = P.exposure; f.uTime.value = P.time; f.uRes.value.set(this.w, this.h); f.uBloom.value = P.bloom; f.uFade.value = P.fade ?? 1; f.uVig.value = P.vig ?? 1; f.uGrain.value = P.grain ?? 1; f.uSat.value = P.sat ?? 0.92; f.uWarm.value = P.warm ?? 1;
    this.pass(m.final, P.target || null);
  }
  dispose() {
    [this.rtA, this.rtH, this.rtH2, this.q1, this.q2, this.e1, this.e2, this.ao1, this.ao2, this.v1, this.v2].forEach(t => t && t.dispose());
    Object.values(this.mats).forEach(m => m.dispose());
  }
}
