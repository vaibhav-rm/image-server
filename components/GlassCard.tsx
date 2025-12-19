import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = true, onClick }) => {
  return (
    <motion.div
      className={`glass rounded-2xl p-6 ${className} ${hoverEffect ? 'glass-hover transition-all duration-300' : ''}`}
      whileHover={hoverEffect ? { scale: 1.02, y: -5 } : {}}
      onClick={onClick}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
