import { GenerationService } from './generation.service';

describe('GenerationService prompt compilation', () => {
  const service = new GenerationService({} as any, {} as any);

  it('loads the versioned video prompt guide from the repository', () => {
    const guide = (service as any).guideContent as string;
    expect(guide).toContain('Video Prompt Authoring Guide');
    expect(guide.length).toBeGreaterThan(1_000);
  });

  it('substitutes linked entity aliases without mutating canonical story text', () => {
    const canonical =
      '[John Cerna] crosses [Veyra] while the manuscript still names John Cerna.';
    const compiled = (service as any).compilePrompt(
      canonical,
      new Map([
        ['John Cerna', 'jcerna-01a3'],
        ['Veyra', 'veyra-city-vy01'],
      ]),
    );

    expect(compiled).toBe(
      'jcerna-01a3 crosses veyra-city-vy01 while the manuscript still names John Cerna.',
    );
    expect(canonical).toContain('[John Cerna]');
  });

  it('visibly preserves canonical references when no alias exists', () => {
    const compiled = (service as any).compilePrompt(
      '[Unnamed Guide] enters frame.',
      new Map([['Unnamed Guide', null]]),
    );
    expect(compiled).toBe('[Unnamed Guide] enters frame.');
  });
});
