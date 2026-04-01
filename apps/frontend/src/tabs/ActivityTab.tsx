import type { DashboardSummary, PartDbConnectionStatus } from "@smart-db/contracts";
import { PanelTitle } from "../components/PanelTitle";
import { Metric } from "../components/Metric";

export interface ScanHistoryEntry {
  code: string;
  mode: string;
  timestamp: string;
}

interface ActivityTabProps {
  dashboard: DashboardSummary | null;
  partDbStatus: PartDbConnectionStatus | null;
  scanHistory: ScanHistoryEntry[];
}

export function ActivityTab(props: ActivityTabProps) {
  return (
    <section className="panel">
      <PanelTitle
        title="Recent events"
        copy="Counts are derived from event-backed state, not from hand-edited integers."
      />
      <div className="event-list">
        {props.dashboard?.recentEvents.map((stockEvent) => (
          <article key={stockEvent.id}>
            <strong>{stockEvent.event}</strong>
            <span>
              {stockEvent.targetType} · {stockEvent.actor}
            </span>
            <small>
              {stockEvent.fromState ?? "none"} → {stockEvent.toState ?? "none"}
            </small>
          </article>
        )) ?? <p>No events yet.</p>}
      </div>

      {props.scanHistory.length > 0 && (
        <div className="event-list">
          <h3>Recent Scans</h3>
          {props.scanHistory.map((entry, index) => (
            <article key={`${entry.code}-${index}`}>
              <strong>{entry.code}</strong>
              <span>{entry.mode}</span>
              <small>{entry.timestamp}</small>
            </article>
          ))}
        </div>
      )}

      <div className="resource-list">
        <h3>Discovered Part-DB resources</h3>
        <ul>
          <li>Parts: {props.partDbStatus?.discoveredResources.partsPath ?? "not discovered"}</li>
          <li>Part lots: {props.partDbStatus?.discoveredResources.partLotsPath ?? "not discovered"}</li>
          <li>
            Storage locations:{" "}
            {props.partDbStatus?.discoveredResources.storageLocationsPath ?? "not discovered"}
          </li>
        </ul>
      </div>
    </section>
  );
}
