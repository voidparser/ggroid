'use client';

import React, { forwardRef } from 'react';

interface VisualizerCanvasProps {
  className?: string;
}

const VisualizerCanvas = forwardRef<HTMLCanvasElement, VisualizerCanvasProps>(
  ({ className = '' }, ref) => {
    return (
      <canvas
        ref={ref}
        className={className}
        width={600}
        height={200}
      />
    );
  }
);

VisualizerCanvas.displayName = 'VisualizerCanvas';

export default VisualizerCanvas;