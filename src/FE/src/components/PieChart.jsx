import React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';

export default function PieGraph({ statistics }) {
  const data = [
    {
      id: 0,
      value: statistics.processing,
      label: `In Process (${statistics.processing})`,
      color: '#dd6b20',
    },
    {
      id: 1,
      value: statistics.healthyPanels,
      label: `Healthy (${statistics.healthyPanels})`,
      color: '#17a34a',
    },
    {
      id: 2,
      value: statistics.unhealthyPanels,
      label: `Not Healthy (${statistics.unhealthyPanels})`,
      color: '#DC2626',
    },
  ];
  return (
    <PieChart
      style={{ transform: 'translateX(-70px)' }}
      series={[
        {
          data,
          highlightScope: { faded: 'global', highlighted: 'item' },
          faded: { innerRadius: 20, additionalRadius: -20, color: 'gray' },
          innerRadius: 20,
          outerRadius: 45,
          paddingAngle: 10,
          cornerRadius: 5,
          startAngle: -149,
        },
      ]}
      height={150}
      width={400}
      slotProps={{
        legend: {
          position: {
            vertical: 'middle',
            horizontal: 'right',
          },
          labelStyle: {
            fill: 'white',
          },
          itemMarkWidth: 20,
          itemMarkHeight: 5,
          markGap: 5,
          itemGap: 5,
          direction: 'column',
        },
      }}
    />
  );
}
