export default function LinesHeroPage({
  width = '365',
  height = '82',
  className,
}) {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 365 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.195312"
        y="0.09375"
        width="363.941"
        height="14.9822"
        rx="5.36134"
        fill="url(#paint0_linear_108_412)"
        fillOpacity="0.4"
      />
      <rect
        x="0.195312"
        y="33.5"
        width="238.388"
        height="14.9823"
        rx="5.36134"
        fill="#3E3D58"
      />
      <rect
        x="0.195312"
        y="66.8984"
        width="170.148"
        height="14.9823"
        rx="5.36134"
        fill="#3E3D58"
      />
      <rect
        x="261.605"
        y="33.5"
        width="102.824"
        height="14.9823"
        rx="5.36134"
        fill="#3E3D58"
      />
      <defs>
        <linearGradient
          id="paint0_linear_108_412"
          x1="0.195312"
          y1="7.58487"
          x2="364.136"
          y2="7.58487"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FC620A" />
          <stop offset="1" stopColor="#7501FA" />
        </linearGradient>
      </defs>
    </svg>
  );
}
