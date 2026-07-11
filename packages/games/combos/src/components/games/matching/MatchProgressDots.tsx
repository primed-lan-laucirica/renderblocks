interface MatchProgressDotsProps {
  matchedComponents: {
    shape: boolean;
    color: boolean;
    count: boolean;
  };
  isTwoWord: boolean;
}

export function MatchProgressDots({ matchedComponents, isTwoWord }: MatchProgressDotsProps) {
  const dots = isTwoWord
    ? [matchedComponents.color, matchedComponents.shape]
    : [matchedComponents.count, matchedComponents.color, matchedComponents.shape];

  return (
    <div className="flex items-center justify-center gap-1 mt-0.5">
      {dots.map((matched, i) => (
        <div
          key={i}
          className={`rounded-full ${
            matched ? 'bg-green-500' : 'bg-gray-300'
          }`}
          style={{ width: 6, height: 6 }}
        />
      ))}
    </div>
  );
}
