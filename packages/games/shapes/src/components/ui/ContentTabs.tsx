import { motion } from 'framer-motion';
import type { ContentClass } from '../../types';

interface ContentTabsProps {
  activeTab: ContentClass;
  onTabChange: (tab: ContentClass) => void;
  disabled?: boolean;
}

interface TabConfig {
  id: ContentClass;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  {
    id: 'shapes',
    label: 'Shapes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19h20L12 2z" />
      </svg>
    ),
  },
  {
    id: 'letters',
    label: 'Letters',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="bold">A</text>
      </svg>
    ),
  },
  {
    id: 'numbers',
    label: 'Numbers',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="bold">1</text>
      </svg>
    ),
  },
];

export function ContentTabs({ activeTab, onTabChange, disabled = false }: ContentTabsProps) {
  return (
    <div className="flex justify-center gap-2 py-2 pointer-events-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => !disabled && onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm
              transition-colors duration-200
              ${isActive
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            disabled={disabled}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default ContentTabs;
