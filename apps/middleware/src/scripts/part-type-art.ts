import type { FilamentSeedItem, ResinSeedItem, RobuSeedItem } from "./seed-data.js";

type SeedLike = Pick<RobuSeedItem | FilamentSeedItem | ResinSeedItem, "name" | "category">;

const COLOR_TOKENS = [
  "black",
  "white",
  "grey",
  "gray",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "silver",
  "bronze",
  "violet",
  "clear",
  "natural",
  "burgundy",
  "gold",
  "rainbow",
  "translucent grey",
  "light blue",
  "fire engine red",
] as const;

export function slugifyPartTypeArtValue(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll("&", " and ")
    .replaceAll("+", " plus ")
    .replaceAll("°", " degree ")
    .replaceAll("±", " plus minus ")
    .replace(/[^\x00-\x7F]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildPartTypeArtStem(category: string, canonicalName: string): string {
  return `${slugifyPartTypeArtValue(category)}--${slugifyPartTypeArtValue(canonicalName)}`;
}

export function buildPartTypeArtUrl(category: string, canonicalName: string): string {
  return `/art/part-types/${buildPartTypeArtStem(category, canonicalName)}.webp`;
}

export function describePartTypeArtPrompt(item: SeedLike): {
  readonly prompt: string;
  readonly scene: string;
  readonly subject: string;
  readonly style: string;
  readonly composition: string;
  readonly lighting: string;
  readonly palette: string;
  readonly materials: string;
  readonly constraints: string;
  readonly negative: string;
} {
  const category = item.category;
  const name = item.name;
  const color = inferColor(name);

  const base = {
    prompt: `Create a strict orthographic catalog render for ${name}.`,
    scene: "clean studio plate on a warm cream background with no environment clutter",
    style: "precise product render, consistent catalog art direction, technically accurate and restrained",
    composition: "single object only, centered, full silhouette visible, no perspective distortion, composed for a square inventory tile",
    lighting: "soft even studio lighting with minimal shadow and no dramatic reflections",
    palette: `warm cream background, charcoal shadows, restrained saffron accents, ${color ? `${color} as the dominant product color` : "accurate real-world product colors"}`,
    materials: "authentic materials and surface finish, no packaging, no table clutter",
    constraints: "one item only; orthographic view; no perspective camera angle; no brand logos; no labels; no text; no watermark; no hands; no exploded diagram; no extra accessories unless integral to the product",
    negative: "busy background, multiple products, clutter, stock-photo staging, perspective distortion, isometric angle, dramatic lens flare, oversaturated CGI, harsh bloom",
  } as const;

  if (category.startsWith("Materials/3D Printing Filament/")) {
    const filamentFamily = category.split("/").at(-1) ?? "filament";
    return {
      ...base,
      subject: `single ${color ? `${color} ` : ""}${filamentFamily} 3D printing filament spool, premium spool packshot, filament texture visible along the rim`,
      composition: "single side-on orthographic spool view, centered, full reel visible",
      materials: "matte and semi-gloss polymer spool surfaces, visible filament winding, accurate material finish",
    };
  }

  if (category.startsWith("Materials/SLA Resin/")) {
    const resinFamily = category.split("/").at(-1) ?? "resin";
    return {
      ...base,
      subject: `single ${color ? `${color} ` : ""}${resinFamily.toLowerCase()} photopolymer resin bottle or cartridge, premium lab-material packshot`,
      composition: "single front orthographic bottle or cartridge view, centered, full container visible",
      materials: "semi-translucent or opaque resin packaging with realistic plastic reflections and accurate liquid color cues",
    };
  }

  if (category.startsWith("Compute/")) {
    return {
      ...base,
      subject: `single bare electronic board for ${name}, ports, headers, and chips visible, photographed as a premium maker electronics product`,
      composition: "single top-down orthographic board view, centered, all edges visible, no perspective skew",
      materials: "FR4 PCB, matte solder mask, metal headers, silkscreen detail, realistic connector finishes",
    };
  }

  if (category.startsWith("Motors/Servo Motors")) {
    return {
      ...base,
      subject: `single servo motor for ${name}, compact mechanical housing, output horn visible, premium studio product photo`,
      composition: "single side orthographic servo view, centered, output horn and body fully visible",
      materials: "machined metal and molded polymer, precise shaft and fastener detail",
    };
  }

  if (category.startsWith("Motors/DC Geared Motors")) {
    return {
      ...base,
      subject: `single DC geared motor for ${name}, gearbox and output shaft clearly visible, premium studio product photo`,
      composition: "single side orthographic motor view, centered, shaft fully visible",
      materials: "brushed metal can, gearbox housing, polished shaft, realistic industrial finish",
    };
  }

  if (category.startsWith("Motors/Brushless Motors")) {
    return {
      ...base,
      subject: `single brushless outrunner motor for ${name}, machined bell housing, premium drone hardware product photo`,
      composition: "single side orthographic brushless motor view, centered, full cylindrical body visible",
      materials: "anodized metal, copper windings glimpsed through slots, realistic machined finish",
    };
  }

  if (category.startsWith("Motors/Stepper Motors")) {
    return {
      ...base,
      subject: `single stepper motor for ${name}, square industrial motor body, shaft facing forward, premium studio product photo`,
      composition: "single front orthographic stepper motor view, centered, square body aligned to frame",
      materials: "powder-coated metal body, machined shaft, subtle stamped metal texture",
    };
  }

  if (category.startsWith("Motors/Vibration Motors")) {
    return {
      ...base,
      subject: `single compact vibration motor for ${name}, tiny electromechanical part, macro product photography`,
      composition: "single top orthographic macro view, centered, entire part visible",
      materials: "micro metal shell, leads, realistic compact motor texture",
    };
  }

  if (category.startsWith("Motor Control/")) {
    return {
      ...base,
      subject: `single electronics driver module for ${name}, board and terminals clearly visible, premium maker hardware packshot`,
      composition: "single top-down orthographic module view, centered, all terminals and heatsinks visible",
      materials: "PCB, heat sinks, screw terminals, metal contacts, realistic soldered component detail",
    };
  }

  if (category.startsWith("Sensors/Environmental")) {
    return {
      ...base,
      subject: `single environmental sensor module for ${name}, breakout board and sensing element visible, premium macro product photo`,
      composition: "single top-down orthographic sensor module view, centered, full PCB outline visible",
      materials: "PCB, sensor package, pins, subtle matte electronics finish",
    };
  }

  if (category.startsWith("Sensors/Inertial")) {
    return {
      ...base,
      subject: `single IMU sensor breakout for ${name}, tiny precision board, premium macro product photo`,
      composition: "single top-down orthographic IMU board view, centered, full board visible",
      materials: "miniature PCB, sensor package, gold pads, clean electronics texture",
    };
  }

  if (category.startsWith("Sensors/Encoders")) {
    return {
      ...base,
      subject: `single encoder component for ${name}, shaft or sensor face visible, premium studio product photo`,
      composition: "single front or top orthographic encoder view, centered, key sensing geometry visible",
      materials: "metal axle, molded plastic, PCB or sensor elements, realistic industrial finish",
    };
  }

  if (category.startsWith("Power/")) {
    return {
      ...base,
      subject: `single battery pack for ${name}, premium electronics power product photo, connector visible`,
      composition: "single front orthographic battery pack view, centered, connector visible without perspective distortion",
      materials: "wrapped battery cells, silicone wires, connector plastic, realistic protective casing",
    };
  }

  if (category.startsWith("Cameras/")) {
    return {
      ...base,
      subject: `single camera module for ${name}, lens and board visible, premium studio product photo`,
      composition: "single top-down orthographic camera module view, centered, lens and board fully visible",
      materials: "glass lens, sensor housing, PCB, connector ribbon or mount detail",
    };
  }

  if (category.startsWith("Actuators/Linear Actuators")) {
    return {
      ...base,
      subject: `single linear actuator for ${name}, rod and body clearly visible, premium industrial product photo`,
      composition: "single side orthographic actuator view, centered, full rod travel body visible",
      materials: "brushed metal tube, machined rod, matte motor housing, realistic industrial finish",
    };
  }

  if (category.startsWith("Actuators/Solenoids")) {
    return {
      ...base,
      subject: `single solenoid actuator for ${name}, plunger and housing visible, premium industrial product photo`,
      composition: "single side orthographic solenoid view, centered, plunger and housing fully visible",
      materials: "wound coil, steel plunger, bracketry, realistic industrial textures",
    };
  }

  if (category.startsWith("Actuators/Pumps")) {
    return {
      ...base,
      subject: `single small water pump for ${name}, ports and motor housing visible, premium product photo`,
      composition: "single side orthographic pump view, centered, inlet and outlet geometry visible",
      materials: "plastic impeller housing, metal motor can, realistic molded surfaces",
    };
  }

  if (category.startsWith("Mechanical/")) {
    return {
      ...base,
      subject: `single machined hardware accessory for ${name}, premium macro product photo`,
      composition: "single front orthographic hardware view, centered, silhouette fully visible",
      materials: "anodized aluminum or steel, crisp machined edges, realistic metal reflections",
    };
  }

  return {
    ...base,
    subject: `single product hero image for ${name}, accurate shape and materials, premium catalog photography`,
  };
}

function inferColor(name: string): string | null {
  const normalized = name.toLowerCase();
  for (const token of COLOR_TOKENS) {
    if (normalized.includes(token)) {
      return token;
    }
  }
  return null;
}
