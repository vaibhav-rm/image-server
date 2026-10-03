import React from 'react';
import { Card } from './ui';

/**
 * Backwards-compatible wrapper (old GlassCard API).
 * Now renders the warm editorial card — no neon, no motion cost.
 */
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <Card className={className} onClick={onClick}>
      {children}
    </Card>
  );
};

export default GlassCard;
