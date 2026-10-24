import { PrismaClient, SeriesRole, BibleEntryType, WorldEntityType, WorldEntityStatus, EpisodeStatus, SceneStatus, ClipStatus, ScriptBlockType, LlmProvider, AssetType, AssetStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@lorelight.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME ?? 'Administrator';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await argon2.hash(adminPassword);
  const admin = await prisma.user.create({
    data: { email: adminEmail, name: adminName, password: hashedPassword, isAdmin: true, isActive: true },
  });
  console.log(`Created admin: ${admin.email}`);

  // ── Demo series ─────────────────────────────────────────────────────────────
  const series = await prisma.series.create({
    data: {
      slug: 'children-of-glass',
      name: 'Children of Glass',
      premise: 'In the vertical city of Veyra, memory is both currency and law.',
      memberships: { create: { userId: admin.id, role: SeriesRole.OWNER } },
    },
  });
  console.log(`Created series: ${series.name}`);

  // ── Bible ───────────────────────────────────────────────────────────────────
  const bibleEntries = [
    { type: BibleEntryType.PREMISE, title: 'Premise', position: 0, content: 'In the vertical city of Veyra, memory is both currency and law. Every citizen\'s past is held inside the great Archive—safe, ordered, and owned by the Council.\n\nWhen signal runner Mara Vey intercepts a transmission from beyond the city\'s sealed horizon, she discovers that their world is neither alone nor what its rulers claim.' },
    { type: BibleEntryType.THEMES, title: 'Themes', position: 1, content: 'Identity — Who are we without the memories that shaped us?\n\nFreedom — Can freedom exist without truth?\n\nMemory — Remembering is both an act of love and rebellion.\n\nJustice — A stable society built on injustice cannot remain stable forever.' },
    { type: BibleEntryType.CANON_RULES, title: 'Canon Rules', position: 2, content: '1. Memories can be copied, transferred, and suppressed, but never created from nothing.\n\n2. The veil cannot be crossed without permanent neurological cost.\n\n3. The Council has controlled the Archive for 147 years.\n\n4. No living citizen remembers seeing a natural star.' },
    { type: BibleEntryType.LORE, title: 'Lore', position: 3, content: 'The Fracture divided the old world and made the sky uninhabitable. Veyra was raised above the veil by seven founding houses. Official history says no other settlements survived.' },
    { type: BibleEntryType.TIMELINE, title: 'Timeline', position: 4, content: 'Year 0 — The Fracture\nYear 12 — Construction of Veyra begins\nYear 31 — The Archive comes online\nYear 147 — Mara receives the signal' },
  ];

  for (const entry of bibleEntries) {
    await prisma.bibleEntry.create({ data: { seriesId: series.id, ...entry } });
  }
  console.log('Created bible entries');

  // ── World entities ──────────────────────────────────────────────────────────
  const mara = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.CHARACTER, displayName: 'Mara Vey', externalId: 'mara-vey-mv01', subtitle: 'Protagonist · Signal Runner', description: 'The city remembers what we choose to forget.', status: WorldEntityStatus.ACTIVE, color: '#745c45', tags: ['protagonist', 'signal-runner'], visualDescription: 'Early 30s, angular face, close-cropped dark hair, worn signal runner jacket with copper patch insignia.', costumeDescription: 'Signal runner jacket, layered undershirt, worn utility pants, soft-soled boots.' } });
  const cael = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.CHARACTER, displayName: 'Cael Orin', externalId: 'cael-orin-co01', subtitle: 'Council Heir · Archivist', description: 'Truth has always had a cost.', status: WorldEntityStatus.ACTIVE, color: '#445f63', tags: ['council', 'archivist'] } });
  const regent = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.CHARACTER, displayName: 'The Regent', externalId: 'regent-tr01', subtitle: 'Antagonist · First Voice', description: 'Order is the only mercy left to us.', status: WorldEntityStatus.UNKNOWN, color: '#59535d', tags: ['antagonist', 'council'] } });
  const ilyan = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.CHARACTER, displayName: 'Ilyan Sable', externalId: 'ilyan-sable-is01', subtitle: 'Guide · Former Cartographer', description: 'Every border begins as a lie.', status: WorldEntityStatus.ACTIVE, color: '#8a6c3f', tags: ['guide'] } });

  const veyra = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.LOCATION, displayName: 'Veyra', externalId: 'veyra-city-vy01', subtitle: 'Vertical City · Primary Setting', description: 'A city of seven rings, suspended above the veil.', status: WorldEntityStatus.ACTIVE, color: '#6d6a5c', architectureNotes: 'Seven concentric rings of increasing wealth ascending from ground level. Brutalist lower rings, ornate crown ring.', moodNotes: 'Oppressive, ordered, beautiful at a distance.' } });
  const observatory = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.LOCATION, displayName: 'The Observatory', externalId: 'observatory-ob01', subtitle: 'Outer Ring · Abandoned', description: 'A forgotten tower built to look at a missing sky.', status: WorldEntityStatus.ACTIVE, color: '#4d6570' } });
  const archive = await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.ARTIFACT, displayName: 'The Archive', externalId: 'archive-ga01', subtitle: 'Memory engine · Council controlled', description: 'A crystalline system containing every registered memory in Veyra.', status: WorldEntityStatus.ACTIVE } });
  await prisma.worldEntity.create({ data: { seriesId: series.id, type: WorldEntityType.ARTIFACT, displayName: 'Veil Key', externalId: 'veil-key-vk01', subtitle: 'Navigation instrument · Forbidden', description: 'A brass and glass device that points through the veil.', status: WorldEntityStatus.MISSING } });

  console.log('Created world entities');

  // ── Season 1 ─────────────────────────────────────────────────────────────────
  const season = await prisma.season.create({ data: { seriesId: series.id, number: 1, title: 'Season One', synopsis: 'Mara discovers the signal and the truth beneath Veyra.', position: 0 } });

  // Episode 01
  const ep01 = await prisma.episode.create({ data: { seasonId: season.id, number: 1, title: 'The Signal Beneath', synopsis: 'A forbidden transmission draws Mara back to the city she escaped.', status: EpisodeStatus.PRODUCTION, progress: 68, position: 0 } });
  const act01 = await prisma.act.create({ data: { episodeId: ep01.id, number: 1, title: 'Act I · The ordinary lie', summary: 'Mara\'s daily routine in the Seventh Ring.', position: 0 } });
  const act02 = await prisma.act.create({ data: { episodeId: ep01.id, number: 2, title: 'Act II · The signal', summary: 'Mara intercepts the forbidden transmission.', position: 1 } });

  const scene01 = await prisma.scene.create({ data: { actId: act01.id, episodeId: ep01.id, number: 1, title: 'The Relay Room', summary: 'Mara intercepts a transmission hidden beneath the civic frequency.', interior: true, timeOfDay: 'Night', status: SceneStatus.APPROVED, duration: '02:40', position: 0, locationId: veyra.id, characters: { create: [{ entityId: mara.id }] } } });

  await prisma.scriptBlock.createMany({ data: [
    { sceneId: scene01.id, type: ScriptBlockType.HEADING, content: 'INT. RELAY ROOM — NIGHT', position: 0 },
    { sceneId: scene01.id, type: ScriptBlockType.ACTION, content: 'Dust settles on the console. A forgotten amber light blinks once, then holds.', position: 1 },
    { sceneId: scene01.id, type: ScriptBlockType.ACTION, content: 'MARA crouches over the relay terminal, headset on, fingers moving carefully.', position: 2 },
    { sceneId: scene01.id, type: ScriptBlockType.DIALOGUE, content: 'There you are.', characterId: mara.id, position: 3 },
    { sceneId: scene01.id, type: ScriptBlockType.ACTION, content: 'Static resolves into something impossible — a voice she has never heard, carrying a memory she has never lived.', position: 4 },
  ]});

  await prisma.clip.createMany({ data: [
    { sceneId: scene01.id, number: 1, title: 'Signal wakes', storyBeat: 'The relay powers on for the first time in forty years.', action: 'Dust lifts from the console as amber light bleeds through the grating.', emotion: 'Dread, wonder', targetDurationSec: 7, cameraShot: 'Wide establishing', cameraAngle: 'Low angle', cameraMovement: 'Slow push in', lens: '35mm anamorphic', lighting: 'Practicals only, amber, volumetric dust', status: ClipStatus.FINAL, position: 0, locationId: veyra.id },
    { sceneId: scene01.id, number: 2, title: 'Mara turns', storyBeat: 'Mara hears the transmission and turns toward it.', action: 'Mara turns her head slowly toward the relay console. Fear becoming recognition.', emotion: 'Fear, dawning recognition', targetDurationSec: 7, cameraShot: 'Medium close-up', cameraAngle: 'Eye level', cameraMovement: 'Slow dolly toward', lens: '85mm', lighting: 'Amber practicals, deep shadow left', status: ClipStatus.READY, position: 1, locationId: veyra.id },
    { sceneId: scene01.id, number: 3, title: 'Unknown voice', storyBeat: 'The waveform resolves into a human voice.', action: 'Waveform on screen resolves — a human voice pattern, unmistakably alive.', emotion: 'Shock', targetDurationSec: 6, cameraShot: 'Insert', cameraAngle: 'High angle', cameraMovement: 'Static locked-off', lens: 'Macro', lighting: 'Blue accent, screen glow', status: ClipStatus.GENERATED, position: 2, locationId: veyra.id },
  ]});

  const scene02 = await prisma.scene.create({ data: { actId: act02.id, episodeId: ep01.id, number: 8, title: 'The Observatory', summary: 'Mara decodes the first fragment of the signal.', interior: true, timeOfDay: 'Dusk', status: SceneStatus.PRODUCTION, duration: '04:15', position: 0, locationId: observatory.id, characters: { create: [{ entityId: mara.id }] } } });
  await prisma.scriptBlock.createMany({ data: [
    { sceneId: scene02.id, type: ScriptBlockType.HEADING, content: 'INT. THE OBSERVATORY — DUSK', position: 0 },
    { sceneId: scene02.id, type: ScriptBlockType.ACTION, content: 'Mara spreads the decoded fragments across a cracked glass table. A map begins to emerge — but the geography is wrong.', position: 1 },
    { sceneId: scene02.id, type: ScriptBlockType.DIALOGUE, content: "This city isn't where they told us it was.", characterId: mara.id, position: 2 },
  ]});

  // Episode 02
  const ep02 = await prisma.episode.create({ data: { seasonId: season.id, number: 2, title: 'Glass Memory', synopsis: 'An archived memory reveals a fracture in the Council\'s origin story.', status: EpisodeStatus.REVIEW, progress: 43, position: 1 } });
  const act03 = await prisma.act.create({ data: { episodeId: ep02.id, number: 1, title: 'Act I · The archive', summary: 'Cael discovers an anomaly in the Archive.', position: 0 } });
  const scene03 = await prisma.scene.create({ data: { actId: act03.id, episodeId: ep02.id, number: 11, title: 'Council Chamber', summary: 'Cael learns that the Regent erased an entire bloodline.', interior: true, timeOfDay: 'Day', status: SceneStatus.DRAFT, duration: '03:20', position: 0, characters: { create: [{ entityId: cael.id }, { entityId: regent.id }] } } });
  await prisma.scriptBlock.createMany({ data: [
    { sceneId: scene03.id, type: ScriptBlockType.HEADING, content: 'INT. COUNCIL CHAMBER — DAY', position: 0 },
    { sceneId: scene03.id, type: ScriptBlockType.ACTION, content: 'Cael stands before a wall of memory vessels. One is missing. The slot is clean, as if it was never there.', position: 1 },
    { sceneId: scene03.id, type: ScriptBlockType.DIALOGUE, content: 'There were eight founding houses. The records show seven. Someone removed an entire family from history.', characterId: cael.id, position: 2 },
  ]});

  // Episode 03 & 04 (outline only)
  await prisma.episode.create({ data: { seasonId: season.id, number: 3, title: 'The Hollow Crown', synopsis: 'Two heirs meet in secret while the lower rings prepare to revolt.', status: EpisodeStatus.DRAFT, progress: 22, position: 2 } });
  await prisma.episode.create({ data: { seasonId: season.id, number: 4, title: 'A Sky Without Stars', synopsis: 'Mara crosses the veil and discovers what the city was built to hide.', status: EpisodeStatus.OUTLINE, progress: 9, position: 3 } });

  console.log('Created manuscript hierarchy');
  console.log('\nSeed complete.');
  console.log(`\nLogin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
