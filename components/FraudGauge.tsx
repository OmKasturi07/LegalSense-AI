import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface FraudGaugeProps {
  score: number;
}

const FraudGauge: React.FC<FraudGaugeProps> = ({ score }) => {
  // Determine color based on score
  let color = '#22c55e'; // Green
  let label = 'Low Risk';
  let description = 'Likely Safe';

  if (score > 40) {
    color = '#eab308'; // Yellow
    label = 'Caution';
    description = 'Review Carefully';
  }
  if (score > 70) {
    color = '#ef4444'; // Red
    label = 'High Risk';
    description = 'Potential Scam';
  }

  const data = [
    { name: 'Fraud Score', value: score, fill: color }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="60%" 
          outerRadius="80%" 
          barSize={20} 
          data={data} 
          startAngle={180} 
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 text-center w-full px-4">
        <p className="text-5xl font-serif font-bold text-slate-800 tracking-tight">{score}</p>
        <p className="text-sm font-bold uppercase tracking-wider mt-1" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
      </div>
    </div>
  );
};

export default FraudGauge;