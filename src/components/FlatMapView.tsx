import React, { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { MarketData } from '../data/mockData';
import { OsintAlert } from './OsintPanel';

const geoUrl = "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";

interface FlatMapViewProps {
  data: MarketData[];
  onMarkerClick: (market: MarketData) => void;
  osintAlerts?: OsintAlert[];
}

export default function FlatMapView({ data: _data, onMarkerClick: _onMarkerClick, osintAlerts: _osintAlerts }: FlatMapViewProps) {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#050505]">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />

      {/* Dither-style headline */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none select-none">
        <p className="text-green-400 font-mono font-bold tracking-wider text-center px-8"
          style={{ fontSize: 'clamp(2rem, 8vw, 9rem)', lineHeight: 1.1 }}>
          Home of Prediction Markets Research
        </p>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 210, center: [0, 15] }}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* ASCII dot-matrix fill pattern */}
          <pattern id="ascii-dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="1" cy="1" r="0.8" fill="#00ff0022" />
          </pattern>
          {/* Slightly brighter fill for hover */}
          <pattern id="ascii-dots-hover" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="1" cy="1" r="0.8" fill="#00ff0044" />
          </pattern>
        </defs>

        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="url(#ascii-dots)"
                stroke="#00ff0066"
                strokeWidth={0.6}
                style={{
                  default: { outline: 'none' },
                  hover: { fill: 'url(#ascii-dots-hover)', stroke: '#00ff00aa', outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
