import { ShapeRenderer } from '../shapes/ShapeRenderer';
import { TextItemRenderer } from './TextItemRenderer';
import type { ItemType, ContentClass, ShapeType, LetterType, NumberType } from '../../types';
import { ALL_SHAPES } from '../../types';

interface ItemRendererProps {
  itemType: ItemType;
  contentClass: ContentClass;
  size: number;
  color?: string;
  outline?: boolean;
  hole?: boolean;
  inactive?: boolean;
  className?: string;
}

export function ItemRenderer({
  itemType,
  contentClass,
  size,
  color,
  outline = false,
  hole = false,
  inactive = false,
  className = '',
}: ItemRendererProps) {
  // For shapes, use the existing ShapeRenderer
  if (contentClass === 'shapes' && ALL_SHAPES.includes(itemType as ShapeType)) {
    return (
      <ShapeRenderer
        shapeType={itemType as ShapeType}
        size={size}
        color={color}
        outline={outline}
        hole={hole}
        inactive={inactive}
        className={className}
      />
    );
  }

  // For letters and numbers, use TextItemRenderer
  if (contentClass === 'letters' || contentClass === 'numbers') {
    return (
      <TextItemRenderer
        itemType={itemType as LetterType | NumberType}
        contentClass={contentClass}
        size={size}
        color={color}
        hole={hole}
        inactive={inactive}
        className={className}
      />
    );
  }

  // Fallback - shouldn't happen
  return null;
}

export default ItemRenderer;
