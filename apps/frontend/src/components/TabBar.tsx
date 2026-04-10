export type TabId = "scan" | "activity" | "admin";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs?: TabId[];
}

const tabLabels: Record<TabId, string> = {
  scan: "Scan",
  activity: "Activity",
  admin: "Admin",
};

export function TabBar({ activeTab, onTabChange, tabs = ["scan", "activity", "admin"] }: TabBarProps) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Primary navigation">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`tab-${tab}`}
          className={activeTab === tab ? "active" : ""}
          aria-selected={activeTab === tab}
          aria-controls={`panel-${tab}`}
          onClick={() => onTabChange(tab)}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </nav>
  );
}
