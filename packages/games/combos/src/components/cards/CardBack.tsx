interface CardBackProps {
  width: number;
  height: number;
}

export function CardBack({ width, height }: CardBackProps) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-md"
      style={{ width, height }}
    >
      <img
        src="/games/combos/logo.png"
        alt="RenderCombos"
        className="rounded-md object-contain"
        style={{
          width: width * 0.7,
          height: height * 0.7,
        }}
        draggable={false}
      />
    </div>
  );
}
