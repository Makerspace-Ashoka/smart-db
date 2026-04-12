export type TabId = "scan" | "inventory" | "activity" | "admin";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs?: TabId[];
}

const tabLabels: Record<TabId, string> = {
  scan: "Scan",
  inventory: "Stock",
  activity: "Activity",
  admin: "Admin",
};

export function TabBar({ activeTab, onTabChange, tabs = ["scan", "inventory", "activity", "admin"] }: TabBarProps) {
  function handleKeyDown(event: React.KeyboardEvent, index: number): void {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      onTabChange(tabs[nextIndex]!);
      const el = document.getElementById(`tab-${tabs[nextIndex]!}`);
      el?.focus();
    }
  }

  return (
    <nav className="tab-bar" role="tablist" aria-label="Primary navigation">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`tab-${tab}`}
          className={activeTab === tab ? "active" : ""}
          aria-selected={activeTab === tab}
          aria-controls={`panel-${tab}`}
          tabIndex={activeTab === tab ? 0 : -1}
          onClick={() => onTabChange(tab)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </nav>
  );
}
