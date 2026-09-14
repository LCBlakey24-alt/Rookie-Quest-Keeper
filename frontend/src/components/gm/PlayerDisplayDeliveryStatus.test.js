import { derivePlayerDisplayDeliveryStatus } from './PlayerDisplayDeliveryStatus';

const NOW = Date.parse('2026-09-14T12:00:20.000Z');

describe('derivePlayerDisplayDeliveryStatus', () => {
  test('reports received only when the current sync was acknowledged after the latest update', () => {
    const status = derivePlayerDisplayDeliveryStatus({
      sync_id: 'sync-current',
      updated_at: '2026-09-14T12:00:10.000Z',
      delivery_ack: {
        sync_id: 'sync-current',
        acknowledged_at: '2026-09-14T12:00:15.000Z',
        display_target: 'standing-tv',
      },
    }, NOW);

    expect(status.state).toBe('received');
    expect(status.label).toMatch(/latest update received/i);
  });

  test('reports pending when the display is alive but acknowledged the previous reveal', () => {
    const status = derivePlayerDisplayDeliveryStatus({
      sync_id: 'sync-new',
      updated_at: '2026-09-14T12:00:18.000Z',
      delivery_ack: {
        sync_id: 'sync-old',
        acknowledged_at: '2026-09-14T12:00:19.000Z',
      },
    }, NOW);

    expect(status.state).toBe('pending');
    expect(status.detail).toMatch(/previous reveal/i);
  });

  test('reports pending when the same screen has not acknowledged a newer mutation yet', () => {
    const status = derivePlayerDisplayDeliveryStatus({
      sync_id: 'sync-current',
      updated_at: '2026-09-14T12:00:19.000Z',
      delivery_ack: {
        sync_id: 'sync-current',
        acknowledged_at: '2026-09-14T12:00:18.000Z',
      },
    }, NOW);

    expect(status.state).toBe('pending');
    expect(status.detail).toMatch(/newest change/i);
  });

  test('reports stale when a matching display has stopped checking in', () => {
    const status = derivePlayerDisplayDeliveryStatus({
      sync_id: 'sync-current',
      updated_at: '2026-09-14T11:59:00.000Z',
      delivery_ack: {
        sync_id: 'sync-current',
        acknowledged_at: '2026-09-14T11:59:30.000Z',
      },
    }, NOW);

    expect(status.state).toBe('stale');
    expect(status.detail).toMatch(/50s ago/i);
  });

  test('reports unacknowledged when no player display has checked in', () => {
    const status = derivePlayerDisplayDeliveryStatus({
      sync_id: 'sync-current',
      updated_at: '2026-09-14T12:00:10.000Z',
      delivery_ack: {},
    }, NOW);

    expect(status.state).toBe('unacknowledged');
  });
});
