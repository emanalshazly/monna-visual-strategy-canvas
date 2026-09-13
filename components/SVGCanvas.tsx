

import React from 'react';
import { CanvasTemplate, CanvasData, SVGBlockData } from '../types';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface SVGCanvasProps {
  template: CanvasTemplate;
  data: CanvasData;
  onEditBlock: (id: string, title: string, content: string) => void;
}

const SVGBlock: React.FC<{
    block: SVGBlockData;
    content: string;
    onClick: () => void;
}> = ({ block, content, onClick }) => {
    
    return (
        <g 
            onClick={onClick} 
            className="cursor-pointer group canvas-block" 
            role="button" 
            aria-label={`Edit ${block.title}`}
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        >
            <title>{block.title}</title>
            <rect
                x={`${block.x}%`}
                y={`${block.y}%`}
                width={`${block.width}%`}
                height={`${block.height}%`}
                rx="12"
                className={`fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600 group-hover:stroke-blue-500 group-hover:fill-blue-50 dark:group-hover:fill-slate-700 transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-lg ${block.backgroundColor || ''}`}
                strokeWidth="2"
            />
            <foreignObject
                x={`${block.x}%`}
                y={`${block.y}%`}
                width={`${block.width}%`}
                height={`${block.height}%`}
                className="overflow-hidden p-4"
            >
                {/* FIX: Removed xmlns attribute to resolve TypeScript error. Modern browsers typically handle this correctly without it. */}
                <div className="w-full h-full flex flex-col text-slate-800 dark:text-slate-200">
                    <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-2 ${block.titleFontSize || 'text-lg'}`}>{block.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 italic">{block.description}</p>
                    <div className={`prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 flex-grow overflow-y-auto ${block.contentFontSize || ''}`}>
                        {content ? (
                            content.split('\n').map((line, index) => <p key={index} className="my-1">{line.startsWith('- ') ? `• ${line.substring(2)}` : line}</p>)
                        ) : (
                            <p className="text-slate-400 dark:text-slate-500">Click to add content...</p>
                        )}
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};


const SVGCanvas: React.FC<SVGCanvasProps> = ({ template, data, onEditBlock }) => {
  usePerformanceMonitor('SVGCanvas');
  
  return (
    <svg 
        viewBox={template.viewBox}
        width="100%" 
        height="100%" 
        className="font-sans"
    >
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-slate-400 dark:text-slate-600" />
            </marker>
        </defs>

        {template.decorations?.map((deco, i) => {
            if (deco.type === 'arrow' && deco.from && deco.to) {
                const [viewBoxWidth, viewBoxHeight] = template.viewBox.split(' ').slice(2).map(Number);
                const x1 = (deco.from.x / 100) * viewBoxWidth;
                const y1 = (deco.from.y / 100) * viewBoxHeight;
                const x2 = (deco.to.x / 100) * viewBoxWidth;
                const y2 = (deco.to.y / 100) * viewBoxHeight;
                const y2Adjusted = deco.to.y > deco.from.y ? y2 - (viewBoxHeight * 0.22) : y2; // quick adjustment
                 return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2Adjusted} className="stroke-current text-slate-400 dark:text-slate-600" strokeWidth="2" markerEnd="url(#arrowhead)" />;
            }
             if (deco.type === 'text' && deco.text) {
                 return <text key={i} x={`${deco.x}%`} y={deco.y || 30} textAnchor="middle" className="fill-current text-slate-600 dark:text-slate-400" fontSize={deco.fontSize} fontWeight={deco.fontWeight}>{deco.text}</text>
             }
            // FIX: Added rendering for 'line', 'path', and 'circle' decoration types.
            if (deco.type === 'line' && deco.points) {
                const parts = deco.points.split(/[ ,]/).map(p => p.trim()).filter(Boolean);
                if (parts.length === 4) {
                    const [x1, y1, x2, y2] = parts;
                    return <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} className="stroke-current text-slate-400 dark:text-slate-600" strokeWidth="2" />;
                }
            }
            if (deco.type === 'path' && deco.d) {
                return <path key={i} d={deco.d} fill={deco.fill || 'none'} stroke={deco.stroke || 'currentColor'} strokeWidth={deco.strokeWidth || '2'} />;
            }
            if (deco.type === 'circle' && deco.cx !== undefined && deco.cy !== undefined && deco.r !== undefined) {
                return <circle key={i} cx={`${deco.cx}%`} cy={`${deco.cy}%`} r={`${deco.r}%`} fill={deco.fill || 'none'} stroke={deco.stroke || 'currentColor'} strokeWidth={deco.strokeWidth || '2'} />;
            }
            return null;
        })}

      {template.blocks.map(block => (
        <SVGBlock
          key={block.id}
          block={block}
          content={data[block.id] || ''}
          onClick={() => onEditBlock(block.id, block.title, data[block.id] || '')}
        />
      ))}
    </svg>
  );
};

export default SVGCanvas;
