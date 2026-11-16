import { beforeEach, describe, expect, it } from 'vitest';
import { getAnalyticsService, resetAnalyticsService } from '@/services/analyticsService';

function seedEvents(events: unknown[]) {
  localStorage.setItem('abtest_events', JSON.stringify(events));
}

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventType: 'button_click',
    timestamp: new Date('2026-11-01T10:00:00.000Z').toISOString(),
    userId: 'user-1',
    properties: {
      action: 'generate-canvas',
      canvasType: 'BUSINESS_MODEL_CANVAS',
      hasFile: false,
    },
    metadata: {
      sessionId: 'sess-1',
      userAgent: 'test-agent',
      screenSize: '800x600',
    },
    ...overrides,
  };
}

// Minimal RFC 4180 row parser: splits one CSV line honouring
// double-quoted fields and doubled quotes.
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

beforeEach(() => {
  resetAnalyticsService();
  localStorage.clear();
});

describe('exportEventsAsCSV', () => {
  it('returns an empty string when the store is empty', () => {
    expect(getAnalyticsService().exportEventsAsCSV()).toBe('');
  });
  it('keeps one event on one row with 7 fields and round-trips properties JSON', () => {
    const event = validEvent();
    seedEvents([event]);
    const csv = getAnalyticsService().exportEventsAsCSV();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('timestamp,eventType,userId,experimentId,variantId,sessionId,properties');
    const fields = parseCsvRow(lines[1]);
    expect(fields).toHaveLength(7);
    expect(fields[0]).toBe('2026-11-01T10:00:00.000Z');
    expect(fields[1]).toBe('button_click');
    expect(fields[2]).toBe('user-1');
    expect(fields[5]).toBe('sess-1');
    expect(JSON.parse(fields[6])).toEqual(event.properties);
  });
  it('escapes double quotes in property values and round-trips them', () => {
    const event = validEvent({ properties: { note: 'say "hi" to the canvas' } });
    seedEvents([event]);
    const csv = getAnalyticsService().exportEventsAsCSV();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    const fields = parseCsvRow(lines[1]);
    expect(fields).toHaveLength(7);
    expect(JSON.parse(fields[6])).toEqual({ note: 'say "hi" to the canvas' });
  });
  it('leaves simple fields unquoted', () => {
    const event = validEvent({ properties: {} });
    seedEvents([event]);
    const csv = getAnalyticsService().exportEventsAsCSV();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).not.toContain('"');
    expect(parseCsvRow(lines[1])[6]).toBe('{}');
  });
  it('exports an empty timestamp for an unparseable timestamp and still exports the other events', () => {
    seedEvents([validEvent({ timestamp: 'not-a-date' }), validEvent()]);
    const csv = getAnalyticsService().exportEventsAsCSV();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(parseCsvRow(lines[1])[0]).toBe('');
    expect(parseCsvRow(lines[2])[0]).toBe('2026-11-01T10:00:00.000Z');
  });
});
