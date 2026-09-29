import { describe, expect, it } from 'vitest';
import { initialState, reduce } from './state';

describe('app state', () => {
  const start = initialState(7, 'KAZ');

  it('opens in a single life, in micro time', () => {
    expect(start).toEqual({
      mode: 'micro',
      speed: 'micro',
      overlay: 'none',
      world: 'bri',
      country: 'KAZ',
      person: 7,
      tab: 'person',
    });
  });

  it('zooms out to macro at week speed and back in to micro time', () => {
    const macro = reduce(start, { type: 'mode', mode: 'macro' });
    expect(macro).toMatchObject({ mode: 'macro', speed: 'week' });
    expect(reduce(macro, { type: 'mode', mode: 'micro' })).toMatchObject({
      mode: 'micro',
      speed: 'micro',
    });
    const paused = reduce(macro, { type: 'speed', speed: 'paused' });
    expect(reduce(paused, { type: 'mode', mode: 'macro' }).speed).toBe('paused');
  });

  it('changes speed, overlay, world, country, person and tab', () => {
    let state = reduce(start, { type: 'speed', speed: 'year' });
    state = reduce(state, { type: 'overlay', overlay: 'pollution' });
    state = reduce(state, { type: 'world', world: 'shadow' });
    state = reduce(state, { type: 'country', country: 'PAK' });
    expect(state).toMatchObject({
      speed: 'year',
      overlay: 'pollution',
      world: 'shadow',
      country: 'PAK',
      tab: 'country',
    });
    state = reduce(state, { type: 'person', person: 3 });
    expect(state).toMatchObject({ person: 3, tab: 'person' });
    expect(reduce(state, { type: 'tab', tab: 'feed' }).tab).toBe('feed');
  });
});
