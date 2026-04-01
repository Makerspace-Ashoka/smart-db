import { useState } from "react";
import type { FormEvent } from "react";
import type {
  AssignQrRequest,
  BulkLevel,
  InstanceStatus,
  PartType,
  ScanResponse,
  StockEventKind,
} from "@smart-db/contracts";
import { bulkLevels, instanceStatuses } from "@smart-db/contracts";
import { PanelTitle } from "../components/PanelTitle";
import { QRScanner } from "../components/QRScanner";
import type { AssignFormState, EventFormState } from "../SmartApp.helpers";

type SearchState = {
  query: string;
  results: PartType[];
  status: "idle" | "loading" | "error";
  error: string | null;
};

export interface LastAssignment {
  partTypeName: string;
  partTypeId: string;
  location: string;
}

interface ScanTabProps {
  scanCode: string;
  onScanCodeChange: (value: string) => void;
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  scanResult: ScanResponse | null;
  pendingAction: string | null;
  onScan: (event: FormEvent<HTMLFormElement>) => void;
  onCameraScan: (code: string) => void;
  // Label
  labelSearch: SearchState;
  labelOptions: PartType[];
  assignForm: AssignFormState;
  onAssignFormChange: (updater: (current: AssignFormState) => AssignFormState) => void;
  onLabelSearch: (query: string) => void;
  onAssign: (event: FormEvent<HTMLFormElement>) => void;
  sessionUsername: string;
  lastAssignment: LastAssignment | null;
  onAssignSame: () => void;
  // Interact
  eventForm: EventFormState;
  onEventFormChange: (updater: (current: EventFormState) => EventFormState) => void;
  onRecordEvent: (event: FormEvent<HTMLFormElement>) => void;
}

export function ScanTab(props: ScanTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="panel">
      <PanelTitle
        title="Scan"
        copy="A registered but unassigned QR opens intake. An assigned QR opens lifecycle actions."
      />
      <QRScanner onScan={props.onCameraScan} enabled />
      <form className="scan-form" onSubmit={props.onScan}>
        <input
          ref={props.scanInputRef}
          placeholder="Scan or type a QR / barcode"
          value={props.scanCode}
          onChange={(event) => props.onScanCodeChange(event.target.value)}
        />
        <button type="submit" disabled={props.pendingAction !== null}>
          {props.pendingAction === "scan" ? "Opening..." : "Open"}
        </button>
      </form>

      <div aria-live="polite">
      {props.scanResult?.mode === "unknown" ? (
        <div className="result-card">
          <h3>{props.scanResult.code} is unknown to Smart DB</h3>
          <p>
            That usually means this is a manufacturer barcode or a QR that
            has not been pre-registered yet.
          </p>
          <small>{props.scanResult.partDb.message}</small>
        </div>
      ) : null}

      {props.scanResult?.mode === "label" ? (
        <div className="result-card">
          <h3>Assign {props.scanResult.qrCode.code}</h3>
          {props.lastAssignment && (
            <div className="assign-same-bar">
              <button
                type="button"
                onClick={props.onAssignSame}
                disabled={props.pendingAction !== null}
              >
                Assign Same ({props.lastAssignment.partTypeName} · {props.lastAssignment.location})
              </button>
            </div>
          )}
          <form className="form-grid" onSubmit={props.onAssign}>
            <label className="wide">
              Search existing part types
              <input
                value={props.labelSearch.query}
                onChange={(event) => props.onLabelSearch(event.target.value)}
                placeholder="Arduino, JST, PLA, cotton..."
              />
            </label>
            {props.labelSearch.error ? <p className="banner error wide">{props.labelSearch.error}</p> : null}
            <div className="wide picker">
              {props.labelOptions.map((partType) => (
                <button
                  key={partType.id}
                  type="button"
                  className={
                    props.assignForm.partTypeMode === "existing" &&
                    props.assignForm.existingPartTypeId === partType.id
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    props.onAssignFormChange((current) => ({
                      ...current,
                      entityKind: partType.countable ? "instance" : "bulk",
                      partTypeMode: "existing",
                      existingPartTypeId: partType.id,
                      canonicalName: "",
                      category: partType.category,
                      countable: partType.countable,
                      initialStatus: "available",
                      initialLevel: "good",
                    }))
                  }
                >
                  <strong>{partType.canonicalName}</strong>
                  <span>{partType.category}</span>
                </button>
              ))}
            </div>
            <label>
              Location
              <input
                value={props.assignForm.location}
                onChange={(event) =>
                  props.onAssignFormChange((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </label>
            <button
              type="button"
              className="disclosure"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? "Fewer options" : "More options"}
            </button>
            {showAdvanced && (
              <>
                <label>
                  Kind
                  <select
                    value={props.assignForm.entityKind}
                    onChange={(event) =>
                      props.onAssignFormChange((current) => ({
                        ...current,
                        entityKind: event.target.value as AssignQrRequest["entityKind"],
                      }))
                    }
                  >
                    <option value="instance">Physical instance</option>
                    <option value="bulk">Bulk bin</option>
                  </select>
                </label>
                {props.assignForm.entityKind === "instance" ? (
                  <label>
                    Initial status
                    <select
                      value={props.assignForm.initialStatus}
                      onChange={(event) =>
                        props.onAssignFormChange((current) => ({
                          ...current,
                          initialStatus: event.target.value as InstanceStatus,
                        }))
                      }
                    >
                      {instanceStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Initial level
                    <select
                      value={props.assignForm.initialLevel}
                      onChange={(event) =>
                        props.onAssignFormChange((current) => ({
                          ...current,
                          initialLevel: event.target.value as BulkLevel,
                        }))
                      }
                    >
                      {bulkLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="wide">
                  New canonical name
                  <input
                    value={props.assignForm.canonicalName}
                    placeholder="Leave blank when reusing an existing part type"
                    onChange={(event) =>
                      props.onAssignFormChange((current) => ({
                        ...current,
                        partTypeMode: "new",
                        existingPartTypeId: "",
                        canonicalName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Category
                  <input
                    value={props.assignForm.category}
                    onChange={(event) =>
                      props.onAssignFormChange((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Countable
                  <select
                    value={String(props.assignForm.countable)}
                    onChange={(event) =>
                      props.onAssignFormChange((current) => ({
                        ...current,
                        partTypeMode: "new",
                        existingPartTypeId: "",
                        countable: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Discrete items</option>
                    <option value="false">Bulk / non-countable</option>
                  </select>
                </label>
                <label className="wide">
                  Notes
                  <textarea
                    value={props.assignForm.notes}
                    onChange={(event) =>
                      props.onAssignFormChange((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </>
            )}
            <button type="submit" disabled={props.pendingAction !== null}>
              {props.pendingAction === "assign" ? "Assigning..." : "Assign QR"}
            </button>
          </form>
        </div>
      ) : null}

      {props.scanResult?.mode === "interact" ? (
        <div className="result-card">
          <h3>
            {props.scanResult.entity.partType.canonicalName} · {props.scanResult.entity.qrCode}
          </h3>
          <p>
            {props.scanResult.entity.targetType} in {props.scanResult.entity.location} · current state{" "}
            <strong>{props.scanResult.entity.state}</strong>
          </p>
          <div className="action-buttons">
            {props.scanResult.availableActions.map((action) => (
              <button
                key={action}
                type="button"
                className={props.eventForm.event === action ? "selected" : ""}
                onClick={() =>
                  props.onEventFormChange((current) => ({
                    ...current,
                    event: action as StockEventKind,
                  }))
                }
              >
                {action}
              </button>
            ))}
          </div>
          <form className="form-grid" onSubmit={props.onRecordEvent}>
            {(props.eventForm.event === "moved" ||
              props.eventForm.event === "checked_out" ||
              props.eventForm.event === "level_changed") && (
              <label>
                Location
                <input
                  value={props.eventForm.location}
                  onChange={(event) =>
                    props.onEventFormChange((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {props.eventForm.event === "checked_out" && (
              <label>
                Assignee
                <input
                  value={props.eventForm.assignee}
                  onChange={(event) =>
                    props.onEventFormChange((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            {props.eventForm.event === "level_changed" &&
              props.scanResult.entity.targetType === "bulk" && (
              <label>
                Next level
                <select
                  value={props.eventForm.nextLevel}
                  onChange={(event) =>
                    props.onEventFormChange((current) => ({
                      ...current,
                      nextLevel: event.target.value as BulkLevel,
                    }))
                  }
                >
                  {bulkLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="wide">
              Notes
              <textarea
                value={props.eventForm.notes}
                onChange={(event) =>
                  props.onEventFormChange((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" disabled={props.pendingAction !== null}>
              {props.pendingAction === "event" ? "Logging..." : "Log event"}
            </button>
          </form>

          <div className="event-list">
            {props.scanResult.recentEvents.map((stockEvent) => (
              <article key={stockEvent.id}>
                <strong>{stockEvent.event}</strong>
                <span>
                  {stockEvent.actor} · {stockEvent.createdAt}
                </span>
                <small>
                  {stockEvent.fromState ?? "none"} → {stockEvent.toState ?? "none"}
                </small>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}
