export default function Shadow({ style }) {
  const customCircle = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    boxShadow: '0 0 150px rgba(240, 240, 240, 1)',
    borderRadius: '40%',
  };

  return (
    <div className="relative z-10 lg:flex">
      <div
        className="absolute left-1/2 -translate-x-1/2 w-28 h-40 lg:w-6/12 lg:h-80"
        style={{ ...customCircle }}
      ></div>
    </div>
  );
}
