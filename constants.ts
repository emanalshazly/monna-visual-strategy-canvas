
import { CanvasType, CanvasTemplate } from './types.js';

export const CANVAS_TEMPLATES: Record<string, CanvasTemplate> = {
  [CanvasType.BUSINESS_MODEL_CANVAS]: {
    name: 'Business Model Canvas',
    description: 'A strategic tool to define and communicate a business idea, detailing key elements like value proposition, customers, and finances.',
    viewBox: '0 0 1200 780',
    blocks: [
      { id: 'keyPartners', title: 'Key Partners', description: 'Who are our key partners and suppliers?', x: 1, y: 1, width: 23, height: 48 },
      { id: 'keyActivities', title: 'Key Activities', description: 'What key activities do our value propositions require?', x: 25, y: 1, width: 23, height: 23 },
      { id: 'valuePropositions', title: 'Value Propositions', description: 'What value do we deliver to the customer?', x: 49, y: 1, width: 23, height: 98 },
      { id: 'customerRelationships', title: 'Customer Relationships', description: 'What type of relationship does each customer segment expect?', x: 73, y: 1, width: 26, height: 23 },
      { id: 'customerSegments', title: 'Customer Segments', description: 'For whom are we creating value?', x: 73, y: 25, width: 26, height: 23 },
      { id: 'keyResources', title: 'Key Resources', description: 'What key resources do our value propositions require?', x: 25, y: 25, width: 23, height: 23 },
      { id: 'channels', title: 'Channels', description: 'Through which channels do our customer segments want to be reached?', x: 73, y: 50, width: 26, height: 48 },
      { id: 'costStructure', title: 'Cost Structure', description: 'What are the most important costs inherent in our business model?', x: 1, y: 50, width: 47, height: 48 },
      // FIX: Removed duplicate `revenueStreams` blocks and corrected the single entry.
      { id: 'revenueStreams', title: 'Revenue Streams', description: 'For what value are our customers willing to pay?', x: 49, y: 50, width: 50, height: 48 },
    ],
  },
  [CanvasType.PORTERS_FIVE_FORCES]: {
    name: "Porter's Five Forces",
    description: 'An analytical framework to assess the competitive intensity and attractiveness of an industry based on five key forces.',
    viewBox: '0 0 1000 700',
    blocks: [
      { id: 'threatOfNewEntrants', title: 'Threat of New Entrants', description: 'How easy is it for new competitors to enter the market?', x: 35, y: 1, width: 30, height: 20 },
      { id: 'bargainingPowerOfSuppliers', title: 'Bargaining Power of Suppliers', description: 'How much power do suppliers have over prices?', x: 1, y: 35, width: 30, height: 30 },
      { id: 'competitiveRivalry', title: 'Competitive Rivalry', description: 'What is the intensity of competition in the industry?', x: 35, y: 35, width: 30, height: 30, backgroundColor: 'bg-blue-100 dark:bg-blue-900/50' },
      { id: 'bargainingPowerOfBuyers', title: 'Bargaining Power of Buyers', description: 'How much power do customers have to drive down prices?', x: 69, y: 35, width: 30, height: 30 },
      { id: 'threatOfSubstituteProducts', title: 'Threat of Substitute Products', description: 'How likely are customers to switch to an alternative?', x: 35, y: 70, width: 30, height: 20 },
    ],
    decorations: [
        { type: 'arrow', from: { x: 50, y: 22 }, to: { x: 50, y: 34 } }, // Top to Center
        { type: 'arrow', from: { x: 32, y: 50 }, to: { x: 34, y: 50 } }, // Left to Center
        { type: 'arrow', from: { x: 68, y: 50 }, to: { x: 66, y: 50 } }, // Right to Center
        { type: 'arrow', from: { x: 50, y: 69 }, to: { x: 50, y: 91 } }  // Bottom to Center
    ]
  },
  [CanvasType.SWOT_ANALYSIS]: {
    name: 'SWOT Analysis',
    description: "A framework for identifying an organization's internal Strengths and Weaknesses, and external Opportunities and Threats.",
    viewBox: '0 0 800 600',
    blocks: [
      { id: 'strengths', title: 'Strengths', description: 'What does your organization do well?', x: 1, y: 1, width: 48, height: 48 },
      { id: 'weaknesses', title: 'Weaknesses', description: 'What could you improve?', x: 51, y: 1, width: 48, height: 48 },
      { id: 'opportunities', title: 'Opportunities', description: 'What opportunities are open to you?', x: 1, y: 51, width: 48, height: 48 },
      { id: 'threats', title: 'Threats', description: 'What threats could harm you?', x: 51, y: 51, width: 48, height: 48 },
    ],
  },
  [CanvasType.VALUE_PROPOSITION_CANVAS]: {
    name: 'Value Proposition Canvas',
    description: 'A tool to ensure a product or service is positioned around what the customer values and needs, detailing gains, pains, and jobs.',
    viewBox: '0 0 1200 600',
    blocks: [
      // Value Proposition Square
      { id: 'productsServices', title: 'Products & Services', description: 'What products and services create gain and relieve pain?', x: 1, y: 25, width: 23, height: 50, label: 'Value Map'},
      { id: 'gainCreators', title: 'Gain Creators', description: 'How do they create customer gains?', x: 25, y: 1, width: 23, height: 48, label: 'Value Map'},
      { id: 'painRelievers', title: 'Pain Relievers', description: 'How do they alleviate customer pains?', x: 25, y: 51, width: 23, height: 48, label: 'Value Map'},
      // Customer Profile Circle
      { id: 'customerJobs', title: 'Customer Jobs', description: 'What are customers trying to get done?', x: 76, y: 25, width: 23, height: 50, shape: 'circle', label: 'Customer Profile'},
      { id: 'gains', title: 'Gains', description: 'What outcomes and benefits do they want?', x: 52, y: 1, width: 23, height: 48, shape: 'circle', label: 'Customer Profile'},
      { id: 'pains', title: 'Pains', description: 'What annoys them or prevents them from getting a job done?', x: 52, y: 51, width: 23, height: 48, shape: 'circle', label: 'Customer Profile'},
    ],
    decorations: [
        { type: 'text', text: 'Value Proposition', x: 25, y: 0, fontSize: '24px', fontWeight: 'bold' },
        { type: 'text', text: 'Customer Segment', x: 75, y: 0, fontSize: '24px', fontWeight: 'bold' },
        { type: 'line', points: "50,1 50,99" }, // Vertical divider
        // Decorative shapes
        // FIX: Changed `points` to `d` for path element to be SVG compliant. This requires a change in types.ts and SVGCanvas.tsx.
        { type: 'path', d: "M 624 150 L 900 150 L 900 450 L 624 450 Z", fill: "none", stroke: "currentColor", strokeWidth: "2" }, // Square
        { type: 'circle', cx: 75, cy: 50, r: 25, fill: "none", stroke: "currentColor", strokeWidth: "2" } // Circle
    ]
  },
};
