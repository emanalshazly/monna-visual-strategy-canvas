import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import SVGCanvas from '@/components/SVGCanvas';
import { CANVAS_TEMPLATES } from '@/constants';
import { CanvasType } from '@/types';

const data = {
  threatOfNewEntrants: 'New entrants',
  bargainingPowerOfSuppliers: 'Suppliers',
  competitiveRivalry: 'Rivalry',
  bargainingPowerOfBuyers: 'Buyers',
  threatOfSubstituteProducts: 'Substitutes',
};

describe('SVGCanvas Porter decorations', () => {
  it('draws four non-degenerate arrows pointing at the centre block', () => {
    const { container } = render(
      <SVGCanvas
        template={CANVAS_TEMPLATES[CanvasType.PORTERS_FIVE_FORCES]}
        data={data}
        onEditBlock={() => undefined}
      />,
    );
    const lines = Array.from(container.querySelectorAll('line'));
    expect(lines).toHaveLength(4);
    const coords = lines.map((line) => ({
      x1: Number(line.getAttribute('x1')),
      y1: Number(line.getAttribute('y1')),
      x2: Number(line.getAttribute('x2')),
      y2: Number(line.getAttribute('y2')),
    }));
    for (const c of coords) {
      // Rounded so a floating-point hairline cannot pass as a real arrow.
      expect(Math.round(Math.hypot(c.x2 - c.x1, c.y2 - c.y1))).toBeGreaterThan(0);
    }
    // Order in constants: top, left, right, bottom. Top must run down toward
    // the centre (y increases), bottom must run up toward it (y decreases).
    expect(coords[0].y2).toBeGreaterThan(coords[0].y1);
    expect(coords[3].y2).toBeLessThan(coords[3].y1);
  });
});
