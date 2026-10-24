import { useEffect, useState } from "react";

export type EntityKind = "Character" | "Location" | "Episode" | "Scene" | "Clip" | "Artifact" | "Organization" | "Timeline Event" | "Asset";

export type Entity = {
  id: string;
  kind: EntityKind;
  title: string;
  subtitle: string;
  description: string;
  status: string;
  episode?: string;
  duration?: string;
  progress?: number;
  tags?: string[];
  color?: string;
  createdAt: string;
};

export type ProjectData = {
  seriesName: string;
  premise: string;
  bible: Record<string, string>;
  entities: Entity[];
};

const now = "2026-10-24T18:00:00.000Z";
const entity = (id: string, kind: EntityKind, title: string, subtitle: string, description: string, status: string, extra: Partial<Entity> = {}): Entity => ({
  id, kind, title, subtitle, description, status, createdAt: now, ...extra,
});

export const initialData: ProjectData = {
  seriesName: "Children of Glass",
  premise: "A city built on borrowed light",
  bible: {
    Premise: "In the vertical city of Veyra, memory is both currency and law. Every citizen’s past is held inside the great Archive—safe, ordered, and owned by the Council.\n\nWhen signal runner Mara Vey intercepts a transmission from beyond the city’s sealed horizon, she discovers that their world is neither alone nor what its rulers claim. The message carries a memory that belongs to her: a childhood she never lived, a brother no record remembers, and a sky full of stars.\n\nMara must choose between exposing a truth that could collapse the last functioning society, or preserving the beautiful lie that keeps millions alive.",
    Themes: "Identity — Who are we without the memories that shaped us?\n\nFreedom — Can freedom exist without truth?\n\nMemory — Remembering is both an act of love and rebellion.\n\nJustice — A stable society built on injustice cannot remain stable forever.",
    "Canon rules": "1. Memories can be copied, transferred, and suppressed, but never created from nothing.\n\n2. The veil cannot be crossed without permanent neurological cost.\n\n3. The Council has controlled the Archive for 147 years.\n\n4. No living citizen remembers seeing a natural star.",
    Lore: "The Fracture divided the old world and made the sky uninhabitable. Veyra was raised above the veil by seven founding houses. Official history says no other settlements survived.",
    Timeline: "Year 0 — The Fracture\nYear 12 — Construction of Veyra begins\nYear 31 — The Archive comes online\nYear 147 — Mara receives the signal",
  },
  entities: [
    entity("char-mara", "Character", "Mara Vey", "Protagonist · Signal Runner", "The city remembers what we choose to forget.", "Alive", { color: "#745c45", tags: ["protagonist"] }),
    entity("char-cael", "Character", "Cael Orin", "Council Heir · Archivist", "Truth has always had a cost.", "Alive", { color: "#445f63" }),
    entity("char-regent", "Character", "The Regent", "Antagonist · First Voice", "Order is the only mercy left to us.", "Unknown", { color: "#59535d" }),
    entity("char-ilyan", "Character", "Ilyan Sable", "Guide · Former Cartographer", "Every border begins as a lie.", "Alive", { color: "#8a6c3f" }),
    entity("loc-veyra", "Location", "Veyra", "Vertical City · Primary Setting", "A city of seven rings, suspended above the veil.", "Active", { color: "#6d6a5c" }),
    entity("loc-observatory", "Location", "The Observatory", "Outer Ring · Abandoned", "A forgotten tower built to look at a missing sky.", "Active", { color: "#4d6570" }),
    entity("loc-archive", "Location", "The Glass Archive", "Crown Ring · Restricted", "The living memory of every citizen in Veyra.", "Active", { color: "#756456" }),
    entity("loc-warrens", "Location", "The Lower Warrens", "Seventh Ring · Residential", "Where the city’s foundations begin to fracture.", "Active", { color: "#5f564d" }),
    entity("ep-01", "Episode", "The Signal Beneath", "Episode 01 · Season One", "A forbidden transmission draws Mara back to the city she escaped.", "Production", { progress: 68, duration: "42 min" }),
    entity("ep-02", "Episode", "Glass Memory", "Episode 02 · Season One", "An archived memory reveals a fracture in the Council's origin story.", "Review", { progress: 43, duration: "38 min" }),
    entity("ep-03", "Episode", "The Hollow Crown", "Episode 03 · Season One", "Two heirs meet in secret while the lower rings prepare to revolt.", "Draft", { progress: 22 }),
    entity("ep-04", "Episode", "A Sky Without Stars", "Episode 04 · Season One", "Mara crosses the veil and discovers what the city was built to hide.", "Outline", { progress: 9 }),
    entity("scene-01", "Scene", "The Relay Room", "Scene 01 · Interior · Night", "Mara intercepts a transmission hidden beneath the civic frequency.", "Approved", { episode: "ep-01", duration: "02:40" }),
    entity("scene-02", "Scene", "The Observatory", "Scene 08 · Interior · Dusk", "Mara decodes the first fragment of the signal.", "Production", { episode: "ep-01", duration: "04:15" }),
    entity("scene-03", "Scene", "Council Chamber", "Scene 11 · Interior · Day", "Cael learns that the Regent erased an entire bloodline.", "Draft", { episode: "ep-02", duration: "03:20" }),
    entity("clip-01", "Clip", "Signal wakes", "Clip 01.01.01 · Wide establishing", "Dust lifts as the dead relay begins to pulse.", "Final", { episode: "ep-01", duration: "7 sec", tags: ["volumetric light", "35mm"] }),
    entity("clip-02", "Clip", "Mara turns", "Clip 01.01.02 · Medium close-up", "Mara turns toward the sound, fear becoming recognition.", "Ready", { episode: "ep-01", duration: "7 sec", tags: ["slow dolly", "85mm"] }),
    entity("clip-03", "Clip", "Unknown voice", "Clip 01.01.03 · Insert", "The waveform resolves into a human voice.", "Generated", { episode: "ep-01", duration: "6 sec", tags: ["macro", "blue light"] }),
    entity("artifact-archive", "Artifact", "The Archive", "Memory engine · Council controlled", "A crystalline system containing every registered memory in Veyra.", "Active"),
    entity("artifact-key", "Artifact", "Veil Key", "Navigation instrument · Forbidden", "A brass and glass device that points through the veil.", "Missing"),
    entity("org-council", "Organization", "The Council of Seven", "Government · Crown Ring", "The ruling body controlling the Archive and all civic memory.", "Active"),
    entity("org-runners", "Organization", "Signal Runners", "Independent network", "Couriers who maintain the city's forgotten communication relays.", "Active"),
    entity("time-fracture", "Timeline Event", "The Fracture", "Year 0 · World event", "The old world falls and the veil covers the horizon.", "Canon"),
    entity("time-archive", "Timeline Event", "The Archive comes online", "Year 31 · Veyra", "The Council centralizes all civic memory.", "Canon"),
  ],
};

const STORAGE_KEY = "lorelight-project-v2";

export function useProjectStore() {
  const [data, setData] = useState<ProjectData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : initialData;
    } catch {
      return initialData;
    }
  });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const saveEntity = (input: Omit<Entity, "id" | "createdAt"> & { id?: string }) => {
    const id = input.id || `${input.kind.toLowerCase().replace(/\s/g, "-")}-${Date.now()}`;
    const next: Entity = { ...input, id, createdAt: new Date().toISOString() };
    setData(current => ({
      ...current,
      entities: input.id ? current.entities.map(item => item.id === id ? { ...item, ...next } : item) : [next, ...current.entities],
    }));
    return next;
  };

  const deleteEntity = (id: string) => setData(current => ({ ...current, entities: current.entities.filter(item => item.id !== id) }));
  const saveBible = (tab: string, value: string) => setData(current => ({ ...current, bible: { ...current.bible, [tab]: value } }));
  const updateSettings = (seriesName: string, premise: string) => setData(current => ({ ...current, seriesName, premise }));
  const reset = () => setData(initialData);

  return { data, saveEntity, deleteEntity, saveBible, updateSettings, reset };
}
