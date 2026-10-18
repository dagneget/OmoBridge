import React, { useState, useRef } from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  className = '',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    defaultTab || tabs[0]?.id || ''
  );
  const activeTabId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelectTab = (id: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(id);
    }
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledIndices = tabs.map((t, i) => (!t.disabled ? i : -1)).filter((i) => i !== -1);
    const currentEnabledPos = enabledIndices.indexOf(index);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextPos = (currentEnabledPos + 1) % enabledIndices.length;
      const nextIdx = enabledIndices[nextPos];
      tabRefs.current[nextIdx]?.focus();
      handleSelectTab(tabs[nextIdx].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevPos = (currentEnabledPos - 1 + enabledIndices.length) % enabledIndices.length;
      const prevIdx = enabledIndices[prevPos];
      tabRefs.current[prevIdx]?.focus();
      handleSelectTab(tabs[prevIdx].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstIdx = enabledIndices[0];
      tabRefs.current[firstIdx]?.focus();
      handleSelectTab(tabs[firstIdx].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastIdx = enabledIndices[enabledIndices.length - 1];
      tabRefs.current[lastIdx]?.focus();
      handleSelectTab(tabs[lastIdx].id);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex border-b border-border gap-2 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab, idx) => {
          const isSelected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`px-4 py-3 min-h-[44px] text-sm font-medium transition-colors border-b-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          tabIndex={0}
          className="pt-4 focus:outline-none"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
};

export default Tabs;
