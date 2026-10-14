"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Backpack,
  BookOpen,
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Feather,
  Hammer,
  Heart,
  Menu,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Sun,
  Sword,
  Trophy,
  X,
} from "lucide-react";
type Block =
  | "grass"
  | "dirt"
  | "stone"
  | "wood"
  | "leaves"
  | "coal"
  | "plank"
  | "table"
  | "torch";
type Item = Block | "stick" | "pickaxe" | "sword";
type Inv = Record<Item, number>;
type NPC = {
  group: THREE.Group;
  kind: "shadow" | "afflicted";
  saved?: boolean;
};
const names: Record<Item, string> = {
    grass: "Grass",
    dirt: "Dirt",
    stone: "Stone",
    wood: "Wood",
    leaves: "Leaves",
    coal: "Coal",
    plank: "Planks",
    table: "Crafting Table",
    torch: "Torch",
    stick: "Stick",
    pickaxe: "Stone Pickaxe",
    sword: "Sword of Truth",
  },
  colors: Record<Block, number> = {
    grass: 0x5d9139,
    dirt: 0x78512d,
    stone: 0x7b7b72,
    wood: 0x805029,
    leaves: 0x376b31,
    coal: 0x292b2d,
    plank: 0xb77b3f,
    table: 0x915828,
    torch: 0xe9b733,
  };
const start = (): Inv => ({
  grass: 0,
  dirt: 8,
  stone: 0,
  wood: 0,
  leaves: 0,
  coal: 0,
  plank: 0,
  table: 0,
  torch: 1,
  stick: 0,
  pickaxe: 0,
  sword: 0,
});
const SAVE_KEY = "kingdom-craft-survival-v1";
const recipes: { a: Item; b: Item; out: Item; n: number; table?: boolean }[] = [
  { a: "wood", b: "wood", out: "plank", n: 4 },
  { a: "plank", b: "plank", out: "table", n: 1 },
  { a: "wood", b: "plank", out: "stick", n: 4 },
  { a: "coal", b: "stick", out: "torch", n: 4 },
  { a: "stone", b: "stick", out: "pickaxe", n: 1, table: true },
  { a: "plank", b: "stick", out: "sword", n: 1, table: true },
];
const canPlace = (i: Item): i is Block =>
  [
    "grass",
    "dirt",
    "stone",
    "wood",
    "leaves",
    "coal",
    "plank",
    "table",
    "torch",
  ].includes(i);
function tex(type: Block) {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d")!;
  g.fillStyle = `#${colors[type].toString(16).padStart(6, "0")}`;
  g.fillRect(0, 0, 16, 16);
  let s = type.length * 17;
  for (let i = 0; i < 38; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = s % 16;
    s = (s * 9301 + 49297) % 233280;
    g.fillStyle = i % 2 ? "#ffffff18" : "#00000020";
    g.fillRect(x, s % 16, i % 3 ? 1 : 2, 1);
  }
  if (type === "grass") {
    g.fillStyle = "#8fbd4a";
    g.fillRect(0, 0, 16, 3);
  }
  if (type === "wood") {
    g.fillStyle = "#4f301d";
    for (let x = 2; x < 16; x += 5) g.fillRect(x, 0, 1, 16);
  }
  if (type === "plank" || type === "table") {
    g.strokeStyle = "#5f381f";
    g.strokeRect(0.5, 0.5, 15, 7);
    g.strokeRect(0.5, 8.5, 15, 7);
  }
  if (type === "coal") {
    g.fillStyle = "#111";
    for (let i = 0; i < 7; i++) g.fillRect((i * 7) % 15, (i * 11) % 15, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export default function Home() {
  const mount = useRef<HTMLDivElement>(null),
    act = useRef({
      mine: () => {},
      place: () => {},
      help: () => {},
      view: () => {},
    }),
    keys = useRef<Record<string, boolean>>({}),
    selRef = useRef<Item>("dirt"),
    creativeRef = useRef(false);
  const [inv, setInv] = useState<Inv>(start),
    [selected, setSelected] = useState<Item>("dirt"),
    [health, setHealth] = useState(10),
    [light, setLight] = useState(4),
    [rescued, setRescued] = useState(0),
    [shadowsDefeated, setShadowsDefeated] = useState(0),
    [night, setNight] = useState(false),
    [message, setMessage] = useState(
      "Gather wood, craft tools, and bring light to the afflicted.",
    ),
    [craft, setCraft] = useState(false),
    [backpack, setBackpack] = useState(false),
    [guide, setGuide] = useState(true),
    [gameMenu, setGameMenu] = useState(false),
    [creative, setCreative] = useState(false),
    [slotA, setSlotA] = useState<Item>("wood"),
    [slotB, setSlotB] = useState<Item>("wood"),
    [fp, setFp] = useState(false),
    [gfxError, setGfxError] = useState(false),
    [tableMade, setTableMade] = useState(false),
    [hydrated, setHydrated] = useState(false),
    [victory, setVictory] = useState(false);
  const invRef = useRef(inv);
  useEffect(() => {
    invRef.current = inv;
  }, [inv]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (saved?.inv) setInv({ ...start(), ...saved.inv });
      if (Number.isFinite(saved?.health)) setHealth(Math.max(1, saved.health));
      if (Number.isFinite(saved?.light)) setLight(saved.light);
      if (Number.isFinite(saved?.rescued)) setRescued(saved.rescued);
      if (Number.isFinite(saved?.shadowsDefeated)) setShadowsDefeated(saved.shadowsDefeated);
      if (typeof saved?.tableMade === "boolean") setTableMade(saved.tableMade);
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ inv, health, light, rescued, shadowsDefeated, tableMade }));
  }, [hydrated, inv, health, light, rescued, shadowsDefeated, tableMade]);
  useEffect(() => {
    if (rescued >= 2 && shadowsDefeated >= 1 && light >= 10) setVictory(true);
  }, [rescued, shadowsDefeated, light]);
  useEffect(() => {
    selRef.current = selected;
  }, [selected]);
  useEffect(() => {
    creativeRef.current = creative;
    setMessage(
      creative
        ? "Creative mode: fly freely and build without limits."
        : "Survival mode: gather, craft, and carry the light.",
    );
  }, [creative]);
  const add = useCallback(
    (i: Item, n: number) =>
      setInv((v) => ({ ...v, [i]: Math.max(0, v[i] + n) })),
    [],
  );
  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current,
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setGfxError(true);
      return;
    }
    scene.background = new THREE.Color(0x83c8ec);
    scene.fog = new THREE.Fog(0x83c8ec, 18, 48);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xcde9ff, 0x45532c, 1.25),
      sun = new THREE.DirectionalLight(0xfff0c2, 1.5);
    sun.position.set(-12, 22, -8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(hemi, sun);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshPhongMaterial({ color: 0x2b7fa1, transparent: true, opacity: 0.72, shininess: 90 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.48;
    scene.add(water);
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdf70 }),
    );
    sunDisc.position.set(-22, 19, -34);
    scene.add(sunDisc);
    const mats = {} as Record<Block, THREE.MeshLambertMaterial>;
    Object.keys(colors).forEach(
      (k) =>
        (mats[k as Block] = new THREE.MeshLambertMaterial({
          map: tex(k as Block),
          transparent: k === "leaves",
          opacity: k === "leaves" ? 0.92 : 1,
        })),
    );
    const geo = new THREE.BoxGeometry(1, 1, 1),
      blocks = new Map<string, THREE.Mesh>(),
      K = (x: number, y: number, z: number) => `${x},${y},${z}`,
      height = (x: number, z: number) =>
        Math.max(
          0,
          Math.floor(
            1.25 + Math.sin(x * 0.42) * 0.85 + Math.cos(z * 0.36) * 0.7,
          ),
        );
    function put(x: number, y: number, z: number, type: Block) {
      if (blocks.has(K(x, y, z))) return;
      const m = new THREE.Mesh(geo, mats[type]);
      m.position.set(x, y, z);
      m.userData = { block: true, type, x, y, z };
      m.castShadow = !["grass", "dirt"].includes(type);
      m.receiveShadow = true;
      scene.add(m);
      blocks.set(K(x, y, z), m);
    }
    function remove(m: THREE.Mesh) {
      scene.remove(m);
      blocks.delete(K(m.userData.x, m.userData.y, m.userData.z));
    }
    for (let x = -11; x <= 11; x++)
      for (let z = -11; z <= 11; z++) {
        const h = height(x, z);
        for (let y = -1; y <= h; y++)
          put(x, y, z, y === h ? "grass" : y < h - 1 ? "stone" : "dirt");
        if ((x * 17 + z * 31) % 23 === 0 && Math.hypot(x, z) > 7) {
          for (let y = h + 1; y <= h + 3; y++) put(x, y, z, "wood");
          for (let dx = -1; dx <= 1; dx++)
            for (let dz = -1; dz <= 1; dz++)
              for (let dy = 3; dy <= 4; dy++)
                if (Math.abs(dx) + Math.abs(dz) < 3)
                  put(x + dx, h + dy, z + dz, "leaves");
        }
      }
    [
      [5, -5],
      [-6, 5],
      [8, 7],
      [-7, -6],
    ].forEach(([x, z]) => put(x, height(x, z) + 1, z, "coal"));
    const player = new THREE.Group(),
      skin = new THREE.MeshLambertMaterial({ color: 0xc98c62 }),
      robe = new THREE.MeshLambertMaterial({ color: 0xd7c69b }),
      boot = new THREE.MeshLambertMaterial({ color: 0x54351f });
    function limb(
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      player.add(m);
    }
    limb(0.72, 0.75, 0.55, robe, 0, 1.15, 0);
    limb(0.58, 0.58, 0.58, skin, 0, 1.82, 0);
    limb(0.22, 0.72, 0.22, robe, -0.48, 1.16, 0);
    limb(0.22, 0.72, 0.22, robe, 0.48, 1.16, 0);
    limb(0.25, 0.72, 0.25, boot, -0.2, 0.42, 0);
    limb(0.25, 0.72, 0.25, boot, 0.2, 0.42, 0);
    player.position.set(0, height(0, 0) + 0.52, 0);
    scene.add(player);
    const npcs: NPC[] = [];
    function npc(x: number, z: number, kind: NPC["kind"]) {
      const g = new THREE.Group(),
        body = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.95, 0.48),
          new THREE.MeshLambertMaterial({
            color: kind === "shadow" ? 0x261f35 : 0x77655b,
          }),
        ),
        head = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.55, 0.55),
          new THREE.MeshLambertMaterial({
            color: kind === "shadow" ? 0x15111c : 0x9b725d,
          }),
        ),
        legMaterial = new THREE.MeshLambertMaterial({
          color: kind === "shadow" ? 0x17131f : 0x443a31,
        }),
        leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.72, 0.3), legMaterial),
        rightLeg = leftLeg.clone();
      body.position.y = 1.12;
      head.position.y = 1.88;
      leftLeg.position.set(-0.2, 0.36, 0);
      rightLeg.position.set(0.2, 0.36, 0);
      g.add(body, head, leftLeg, rightLeg);
      g.position.set(x, height(x, z) + 0.52, z);
      scene.add(g);
      npcs.push({ group: g, kind });
    }
    npc(-5, -5, "afflicted");
    npc(7, 6, "afflicted");
    npc(8, -7, "shadow");
    npc(-9, 7, "shadow");
    const ray = new THREE.Raycaster();
    function target() {
      ray.setFromCamera(new THREE.Vector2(), camera);
      return ray.intersectObjects([...blocks.values()])[0];
    }
    const withinReach = (hit: THREE.Intersection) =>
      creativeRef.current || hit.point.distanceTo(player.position) <= 7.5;
    act.current.mine = () => {
      const hit = target();
      if (!hit || !withinReach(hit)) {
        setMessage("Move closer and aim at a block.");
        return;
      }
      const m = hit.object as THREE.Mesh;
      if (!creativeRef.current && m.userData.y <= -1) {
        setMessage("The foundation is too deep to break.");
        return;
      }
      const type = m.userData.type as Block;
      remove(m);
      if (!creativeRef.current) add(type, 1);
      setMessage(`Gathered ${names[type].toLowerCase()}.`);
    };
    act.current.place = () => {
      const item = selRef.current;
      if (!canPlace(item) || (!creativeRef.current && !invRef.current[item])) {
        setMessage("Select a placeable block in your hotbar.");
        return;
      }
      const hit = target();
      if (!hit || !withinReach(hit) || !hit.face) {
        setMessage("Move closer and aim at the face of a block.");
        return;
      }
      const p = (hit.object as THREE.Mesh).position
        .clone()
        .add(hit.face.normal)
        .round();
      if (p.distanceTo(player.position) < 1.4) {
        setMessage("You cannot place a block inside yourself.");
        return;
      }
      put(p.x, p.y, p.z, item);
      if (!creativeRef.current) add(item, -1);
      setMessage(`Placed ${names[item].toLowerCase()}.`);
    };
    act.current.help = () => {
      const n = npcs.find(
        (n) => !n.saved && n.group.position.distanceTo(player.position) < 3,
      );
      if (!n) {
        setMessage("No one is close enough to help.");
        return;
      }
      if (n.kind === "shadow") {
        if (!invRef.current.sword) {
          setMessage(
            "Craft the Sword of Truth before confronting this shadow.",
          );
          return;
        }
        scene.remove(n.group);
        n.saved = true;
        setShadowsDefeated((v) => v + 1);
        setLight((v) => v + 2);
        setMessage("The Sword of Truth broke the shadow. Keep carrying the light!");
        return;
      }
      if (!invRef.current.torch) {
        setMessage("The afflicted need light, not violence. Bring a torch.");
        return;
      }
      add("torch", -1);
      n.saved = true;
      (n.group.children[0] as THREE.Mesh).material =
        new THREE.MeshLambertMaterial({ color: 0xd1b06d });
      setRescued((v) => v + 1);
      setLight((v) => v + 3);
      setMessage("A captive has been restored and follows the light.");
    };
    let first = false;
    act.current.view = () => {
      first = !first;
      setFp(first);
      player.visible = !first;
    };
    let yaw = Math.PI * 0.75,
      pitch = 0.32,
      cameraDistance = 6.6,
      drag = false,
      lx = 0,
      ly = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    const canvas = renderer.domElement;
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) {
        const [a, b] = [...pointers.values()];
        const next = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance)
          cameraDistance = THREE.MathUtils.clamp(
            cameraDistance + (pinchDistance - next) * 0.018,
            2.5,
            10,
          );
        pinchDistance = next;
        return;
      }
      yaw -= (e.clientX - lx) * 0.007;
      pitch = THREE.MathUtils.clamp(
        pitch + (e.clientY - ly) * 0.006,
        -1.38,
        1.38,
      );
      lx = e.clientX;
      ly = e.clientY;
    });
    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      drag = pointers.size > 0;
      const remaining = [...pointers.values()][0];
      if (remaining) {
        lx = remaining.x;
        ly = remaining.y;
      }
    };
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        cameraDistance = THREE.MathUtils.clamp(
          cameraDistance + e.deltaY * 0.008,
          2.5,
          10,
        );
      },
      { passive: false },
    );
    canvas.addEventListener("dblclick", () => act.current.mine());
    const down = (e: KeyboardEvent) => {
        keys.current[e.code] = true;
        if (e.code === "Space") e.preventDefault();
        if (e.code === "KeyF") act.current.help();
        if (e.code === "KeyV") act.current.view();
        if (e.code === "KeyE") setCraft(true);
        if (e.code === "KeyI") setBackpack((v) => !v);
      },
      up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    let vy = 0,
      last = performance.now(),
      clock = 0,
      lastDamage = 0,
      raf = 0;
    function top(x: number, z: number) {
      let y = -1;
      for (const m of blocks.values())
        if (
          m.userData.x === x &&
          m.userData.z === z &&
          m.userData.y > y &&
          m.userData.type !== "leaves"
        )
          y = m.userData.y;
      return y;
    }
    function loop(now: number) {
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;
      clock += dt;
      const isNight = Math.sin(clock * 0.055) < -0.35;
      setNight((o) => (o === isNight ? o : isNight));
      const sky = isNight ? 0x11162e : 0x83c8ec;
      (scene.background as THREE.Color).lerp(new THREE.Color(sky), 0.02);
      scene.fog!.color.lerp(new THREE.Color(sky), 0.02);
      sun.intensity = isNight ? 0.18 : 1.5;
      hemi.intensity = isNight ? 0.42 : 1.25;
      const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
        r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)),
        d = new THREE.Vector3();
      if (keys.current.KeyW || keys.current.ArrowUp) d.add(f);
      if (keys.current.KeyS || keys.current.ArrowDown) d.sub(f);
      if (keys.current.KeyD || keys.current.ArrowRight) d.add(r);
      if (keys.current.KeyA || keys.current.ArrowLeft) d.sub(r);
      if (d.lengthSq()) {
        d.normalize();
        const nx = player.position.x + d.x * dt * 6.2,
          nz = player.position.z + d.z * dt * 6.2,
          g = top(Math.round(nx), Math.round(nz));
        if (creativeRef.current || g <= player.position.y + 0.48) {
          player.position.x = nx;
          player.position.z = nz;
          player.rotation.y = Math.atan2(d.x, d.z);
        }
      }
      const gy =
        top(Math.round(player.position.x), Math.round(player.position.z)) +
        0.52;
      if (creativeRef.current) {
        vy = 0;
        if (keys.current.Space) player.position.y += dt * 6.2;
        if (keys.current.ShiftLeft || keys.current.ShiftRight || keys.current.ControlLeft)
          player.position.y -= dt * 6.2;
        player.position.y = Math.max(-0.2, player.position.y);
      } else if (player.position.y <= gy + 0.03) {
        player.position.y = gy;
        vy = 0;
        if (keys.current.Space) vy = 6.8;
      }
      if (!creativeRef.current) {
        vy -= 15 * dt;
        player.position.y += vy * dt;
        if (player.position.y < gy) {
          player.position.y = gy;
          vy = 0;
        }
      }
      const look = player.position.clone().add(new THREE.Vector3(0, 1.35, 0)),
        viewDir = new THREE.Vector3(
          f.x * Math.cos(pitch),
          -Math.sin(pitch),
          f.z * Math.cos(pitch),
        ).normalize(),
        aim = look.clone().add(viewDir.clone().multiplyScalar(12));
      if (first) {
        camera.position.copy(look).add(viewDir.clone().multiplyScalar(0.18));
        camera.lookAt(aim);
      } else {
        let cp = look
            .clone()
            .sub(viewDir.clone().multiplyScalar(cameraDistance))
            .add(new THREE.Vector3(0, 0.65, 0)),
          back = cp.clone().sub(look),
          dist = back.length();
        ray.set(look, back.normalize());
        const wall = ray.intersectObjects([...blocks.values()])[0];
        if (wall && wall.distance < dist)
          cp = look
            .clone()
            .add(back.multiplyScalar(Math.max(1.1, wall.distance - 0.25)));
        camera.position.lerp(cp, 0.22);
        camera.lookAt(aim);
      }
      npcs.forEach((n) => {
        if (n.kind === "shadow" && !n.saved) {
          n.group.rotation.y += dt * 0.7;
          const distance = n.group.position.distanceTo(player.position);
          if (isNight && distance < 9) {
            const chase = player.position.clone().sub(n.group.position);
            chase.y = 0;
            if (chase.lengthSq() > 0.01) n.group.position.add(chase.normalize().multiplyScalar(dt * 1.65));
          }
          if (!creativeRef.current && distance < 1.35 && now - lastDamage > 900) {
            lastDamage = now;
            setHealth((value) => {
              const next = value - 1;
              if (next <= 0) {
                player.position.set(0, height(0, 0) + 0.52, 0);
                setLight((amount) => Math.max(0, amount - 2));
                setMessage("The darkness overwhelmed you—but the light has not gone out. You returned to the refuge.");
                return 10;
              }
              setMessage("A shadow struck you. Move away or wield the Sword of Truth!");
              return next;
            });
          }
        }
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    function resize() {
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      renderer.dispose();
      host.removeChild(canvas);
    };
  }, [add]);
  function make() {
    const r = recipes.find(
      (r) =>
        (r.a === slotA && r.b === slotB) || (r.a === slotB && r.b === slotA),
    );
    if (!r) {
      setMessage("Those materials do not make a recipe.");
      return;
    }
    const same = r.a === r.b,
      need = same ? 2 : 1;
    if (inv[r.a] < need || (!same && !inv[r.b])) {
      setMessage("You do not have both ingredients.");
      return;
    }
    if (r.table && !tableMade) {
      setMessage("Craft a crafting table for advanced tools.");
      return;
    }
    setInv((v) => {
      const n = { ...v };
      n[r.a] -= need;
      if (!same) n[r.b] -= 1;
      n[r.out] += r.n;
      return n;
    });
    if (r.out === "table") setTableMade(true);
    setSelected(r.out);
    setMessage(`Crafted ${r.n > 1 ? r.n + " " : ""}${names[r.out]}.`);
  }
  if (gfxError)
    return (
      <main className="gfxError">
        <Box />
        <h1>Kingdom Craft</h1>
        <h2>3D graphics are unavailable in this browser.</h2>
        <p>
          This game needs WebGL. Try Chrome, Edge, Firefox, or Safari with
          hardware acceleration enabled.
        </p>
      </main>
    );
  const bar: Item[] = [
      "dirt",
      "wood",
      "stone",
      "coal",
      "plank",
      "table",
      "torch",
      "pickaxe",
      "sword",
    ],
    amount = (i: Item) => (creative && canPlace(i) ? "∞" : inv[i]),
    hold = (code: string, label: string) => (
      <button
        aria-label={label}
        onPointerDown={() => (keys.current[code] = true)}
        onPointerUp={() => (keys.current[code] = false)}
        onPointerLeave={() => (keys.current[code] = false)}
        onClick={() => {
          keys.current[code] = true;
          setTimeout(() => (keys.current[code] = false), 140);
        }}
      >
        {label}
      </button>
    );
  return (
    <main className="voxelGame">
      <div ref={mount} className="viewport" />
      <header className="gameTop">
        <div className="logo">
          <i>✦</i>
          <div>
            <h1>KINGDOM CRAFT</h1>
            <small>LIGHT OF THE WORLD · {creative ? "CREATIVE" : "SURVIVAL"} UPDATE</small>
          </div>
        </div>
        <div className="meters">
          <span>
            <Heart /> {health}/10
          </span>
          <span>
            <Sun /> Light {light}
          </span>
          <span>{night ? "NIGHT" : "DAY"}</span>
          <button className="modeButton" onClick={() => setCreative((v) => !v)}>
            <Feather /> {creative ? "Creative" : "Survival"}
          </button>
          <button onClick={() => setGuide(true)}>
            <BookOpen />
          </button>
          <button className="menuButton" onClick={() => setGameMenu(true)} aria-label="Open game menu">
            <Menu />
          </button>
        </div>
      </header>
      <div className="quest">
        <b>THE LIGHT SHINES IN THE DARKNESS</b>
        <span>
          {rescued}/2 restored · {shadowsDefeated}/1 shadow defeated · {light}/10 Light
        </span>
      </div>
      <div className="crosshair">+</div>
      <div className="notice">{message}</div>
      <div className="desktopHints">
        <span>WASD Move</span>
        <span>Space Jump</span>
        <span>Drag Look · Wheel Zoom</span>
        <span>Double-click Mine</span>
        <span>F Help</span>
        <button onClick={() => act.current.view()}>
          V {fp ? "Third" : "First"} Person
        </button>
        <button onClick={() => setBackpack(true)}>I Backpack</button>
      </div>
      <div className="mobileMove">
        {hold("KeyW", "▲")}
        <div>
          {hold("KeyA", "◀")}
          {hold("KeyS", "▼")}
          {hold("KeyD", "▶")}
        </div>
      </div>
      <div className="mobileActions">
        {hold("Space", creative ? "Up" : "Jump")}
        <button onClick={() => act.current.mine()}>
          <Minus /> Mine
        </button>
        <button onClick={() => act.current.place()}>
          <Plus /> Place
        </button>
        <button onClick={() => act.current.help()}>
          {selected === "sword" ? <Sword /> : <Sun />} {selected === "sword" ? "Strike" : "Help"}
        </button>
        {creative && hold("ShiftLeft", "Down")}
      </div>
      <div className="rightActions">
        {hold("Space", "Jump")}
        <button onClick={() => act.current.mine()}>
          <Hammer /> Mine block
        </button>
        <button onClick={() => act.current.place()}>
          <Box /> Place block
        </button>
        <button onClick={() => act.current.help()}>
          <Shield /> Help nearby
        </button>
        <button onClick={() => setCraft(true)}>
          <Hammer /> Craft
        </button>
        <button onClick={() => act.current.view()}>
          <Camera /> {fp ? "Third person" : "First person"}
        </button>
        <button onClick={() => setBackpack(true)}>
          <Backpack /> Backpack
        </button>
      </div>
      <nav className="voxelBar">
        {bar.map((i, n) => (
          <button
            key={i}
            className={selected === i ? "active" : ""}
            onClick={() => setSelected(i)}
          >
            <em>{n + 1}</em>
            <span className={`cubeIcon ${i}`}>
              {i === "pickaxe" ? (
                <Hammer />
              ) : i === "sword" ? (
                <Sword />
              ) : i === "torch" ? (
                "†"
              ) : (
                ""
              )}
            </span>
            <b>{amount(i)}</b>
            <small>{names[i]}</small>
          </button>
        ))}
      </nav>
      {backpack && (
        <div className="panelShade" onClick={() => setBackpack(false)}>
          <section
            className="backpackPanel"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setBackpack(false)}>
              <X />
            </button>
            <h2>Backpack</h2>
            <p>Select an item to place it in your active hand.</p>
            <div className="inventoryGrid">
              {(Object.keys(names) as Item[]).map((i) => (
                <button
                  key={i}
                  className={selected === i ? "active" : ""}
                  onClick={() => setSelected(i)}
                >
                  <span className={`cubeIcon ${i}`}>
                    {i === "pickaxe" ? (
                      <Hammer />
                    ) : i === "sword" ? (
                      <Sword />
                    ) : i === "torch" ? (
                      "†"
                    ) : (
                      ""
                    )}
                  </span>
                  <b>{names[i]}</b>
                  <strong>× {amount(i)}</strong>
                </button>
              ))}
            </div>
            <div className="packActions">
              <button
                onClick={() => {
                  setBackpack(false);
                  setCraft(true);
                }}
              >
                <Hammer /> Open crafting
              </button>
              <button onClick={() => setBackpack(false)}>
                Return to world
              </button>
            </div>
          </section>
        </div>
      )}
      {craft && (
        <div className="panelShade" onClick={() => setCraft(false)}>
          <section className="craftPanel" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setCraft(false)}>
              <X />
            </button>
            <h2>Crafting</h2>
            <p>
              Combine two materials. Advanced tools require a crafting table.
            </p>
            <div className="slots">
              <select
                value={slotA}
                onChange={(e) => setSlotA(e.target.value as Item)}
              >
                {Object.keys(names).map((i) => (
                  <option key={i} value={i}>
                    {names[i as Item]} × {inv[i as Item]}
                  </option>
                ))}
              </select>
              <Plus />
              <select
                value={slotB}
                onChange={(e) => setSlotB(e.target.value as Item)}
              >
                {Object.keys(names).map((i) => (
                  <option key={i} value={i}>
                    {names[i as Item]} × {inv[i as Item]}
                  </option>
                ))}
              </select>
              <button onClick={make}>CRAFT</button>
            </div>
            <div className="recipeGrid">
              {recipes.map((r) => (
                <button
                  key={r.out}
                  onClick={() => {
                    setSlotA(r.a);
                    setSlotB(r.b);
                  }}
                >
                  <b>
                    {names[r.a]} + {names[r.b]}
                  </b>
                  <span>
                    {names[r.out]} × {r.n}
                    {r.table && " · Table"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {guide && (
        <div className="panelShade">
          <section className="guide">
            <small>TRUE 3D VOXEL SURVIVAL · LIGHTBRINGER UPDATE</small>
            <h2>Bring light to a living world.</h2>
            <p>
              You are a traveler building refuge in a land touched by darkness.
              Gather individual blocks, craft tools, build freely, resist
              shadows, and restore afflicted people—they are never your enemy.
            </p>
            <div className="guideCards">
              <div>
                <b>EXPLORE</b>
                <span>
                  Walk, jump, turn the camera, climb hills and find resources.
                </span>
              </div>
              <div>
                <b>BUILD</b>
                <span>
                  Aim with the crosshair. Mine blocks, select them, and place
                  them.
                </span>
              </div>
              <div>
                <b>RESTORE</b>
                <span>
                  Carry torches to the afflicted. Carry truth against shadows.
                </span>
              </div>
            </div>
            <blockquote>
              “The light shines in the darkness, and the darkness has not
              overcome it.”<cite>John 1:5</cite>
            </blockquote>
            <div className="enterChoices">
              <button onClick={() => { setCreative(false); setGuide(false); }}>Play survival</button>
              <button onClick={() => { setCreative(true); setGuide(false); }}><Feather /> Explore in creative</button>
            </div>
          </section>
        </div>
      )}
      {gameMenu && (
        <div className="panelShade mobileMenuShade" onClick={() => setGameMenu(false)}>
          <section className="gameMenu" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setGameMenu(false)}><X /></button>
            <h2>Game menu</h2>
            <button className="modeChoice" onClick={() => setCreative((v) => !v)}>
              <Feather />
              <span><b>{creative ? "Creative mode on" : "Survival mode on"}</b><small>{creative ? "Fly and build with unlimited blocks" : "Gather resources and craft what you need"}</small></span>
            </button>
            <div className="menuGrid">
              <button onClick={() => { act.current.view(); setGameMenu(false); }}><Camera /> {fp ? "Third person" : "First person"}</button>
              <button onClick={() => { setBackpack(true); setGameMenu(false); }}><Backpack /> Backpack</button>
              <button onClick={() => { setCraft(true); setGameMenu(false); }}><Hammer /> Crafting</button>
              <button onClick={() => { setGuide(true); setGameMenu(false); }}><BookOpen /> How to play</button>
            </div>
            {creative && <p className="flightTip"><ChevronUp /> Hold <b>Up</b> to rise · hold <b>Down</b> to descend <ChevronDown /></p>}
            <button className="returnButton" onClick={() => setGameMenu(false)}>Return to world</button>
          </section>
        </div>
      )}
      {victory && (
        <div className="panelShade victoryShade">
          <section className="victoryPanel">
            <Sparkles className="victoryGlow" />
            <Trophy />
            <small>REFUGE RESTORED</small>
            <h2>The light overcame the darkness.</h2>
            <p>You gathered, crafted, defended the refuge, and restored every captive. Your world remains open—keep building the kingdom.</p>
            <blockquote>“You are the light of the world.”<cite>Matthew 5:14</cite></blockquote>
            <button onClick={() => setVictory(false)}>Keep building</button>
          </section>
        </div>
      )}
    </main>
  );
}
