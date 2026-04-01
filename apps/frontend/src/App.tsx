import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  AssignQrRequest,
  BulkLevel,
  DashboardSummary,
  InstanceStatus,
  InventoryTargetKind,
  PartDbConnectionStatus,
  PartType,
  RecordEventRequest,
  RegisterQrBatchRequest,
  ScanResponse,
  StockEventKind,
} from "@smart-db/contracts";
import { bulkLevels, instanceStatuses, InvariantError } from "@smart-db/contracts";
import { api } from "./api";

type AssignFormState = {
  qrCode: string;
  actor: string;
  entityKind: InventoryTargetKind;
  location: string;
  notes: string;
  partTypeMode: "existing" | "new";
  existingPartTypeId: string;
  canonicalName: string;
  category: string;
  countable: boolean;
  initialStatus: InstanceStatus;
  initialLevel: BulkLevel;
};

type EventFormState = {
  targetType: InventoryTargetKind;
  targetId: string;
  actor: string;
  event: StockEventKind;
  location: string;
  nextStatus: InstanceStatus;
  nextLevel: BulkLevel;
  assignee: string;
  notes: string;
};

const defaultBatchForm: RegisterQrBatchRequest = {
  actor: "lab-admin",
  prefix: "QR",
  startNumber: 1001,
  count: 500,
};

const defaultAssignForm: AssignFormState = {
  qrCode: "",
  actor: "lab-admin",
  entityKind: "instance",
  location: "Buffer Room A",
  notes: "",
  partTypeMode: "new",
  existingPartTypeId: "",
  canonicalName: "",
  category: "",
  countable: true,
  initialStatus: "available",
  initialLevel: "good",
};

const defaultEventForm: EventFormState = {
  targetType: "instance",
  targetId: "",
  actor: "lab-admin",
  event: "moved",
  location: "Unknown",
  nextStatus: "available",
  nextLevel: "good",
  assignee: "",
  notes: "",
};

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [partDbStatus, setPartDbStatus] = useState<PartDbConnectionStatus | null>(null);
  const [provisionalPartTypes, setProvisionalPartTypes] = useState<PartType[]>([]);
  const [partTypeResults, setPartTypeResults] = useState<PartType[]>([]);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [assignForm, setAssignForm] = useState(defaultAssignForm);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [partTypeQuery, setPartTypeQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeDestinationId, setMergeDestinationId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshAll();
  }, []);

  async function refreshAll(): Promise<void> {
    try {
      const [dashboardData, partDbData, provisionalData, partTypes] = await Promise.all([
        api.getDashboard(),
        api.getPartDbStatus(),
        api.getProvisionalPartTypes(),
        api.searchPartTypes(""),
      ]);
      setDashboard(dashboardData);
      setPartDbStatus(partDbData);
      setProvisionalPartTypes(provisionalData);
      setPartTypeResults(partTypes);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleSearchPartTypes(query: string): Promise<void> {
    setPartTypeQuery(query);
    try {
      const results = await api.searchPartTypes(query);
      setPartTypeResults(results);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleRegisterBatch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const response = await api.registerQrBatch(batchForm);
      setMessage(
        `Registered ${response.created} QR codes in ${response.batch.id}. ${response.skipped} were already present.`,
      );
      await refreshAll();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleScan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const response = await api.scan(scanCode);
      setScanResult(response);
      if (response.mode === "label") {
        setAssignForm((current) => ({
          ...current,
          qrCode: response.qrCode.code,
        }));
      }
      if (response.mode === "interact") {
        setEventForm((current) => ({
          ...current,
          targetType: response.entity.targetType,
          targetId: response.entity.id,
          location: response.entity.location,
          nextStatus:
            response.entity.targetType === "instance"
              ? (response.entity.state as InstanceStatus)
              : current.nextStatus,
          nextLevel:
            response.entity.targetType === "bulk"
              ? (response.entity.state as BulkLevel)
              : current.nextLevel,
        }));
      }
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const request = buildAssignRequest(assignForm);
      await api.assignQr(request);
      setMessage(`Assigned ${request.qrCode} to inventory.`);
      setScanCode(request.qrCode);
      setAssignForm(defaultAssignForm);
      setScanResult(await api.scan(request.qrCode));
      await refreshAll();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleRecordEvent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const request = buildEventRequest(eventForm);
      const response = await api.recordEvent(request);
      setMessage(`Logged ${response.event} for ${request.targetType} ${request.targetId}.`);
      if (scanResult?.mode === "interact") {
        setScanResult(await api.scan(scanResult.qrCode.code));
      }
      await refreshAll();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function handleMergePartTypes(): Promise<void> {
    if (!mergeSourceId || !mergeDestinationId) {
      setError("Select both a provisional source and a canonical destination.");
      return;
    }

    setMessage(null);
    setError(null);
    try {
      await api.mergePartTypes({
        sourcePartTypeId: mergeSourceId,
        destinationPartTypeId: mergeDestinationId,
      });
      setMessage("Merged provisional part type into canonical record.");
      setMergeSourceId("");
      setMergeDestinationId("");
      await refreshAll();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  const scanSuggestions = scanResult?.mode === "label" ? scanResult.suggestions : [];
  const partTypeOptions = partTypeResults.length > 0 ? partTypeResults : scanSuggestions;

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Smart DB</p>
          <h1>Fast intake, durable inventory.</h1>
          <p className="lede">
            The phone UI stays light. The middleware owns QR batches, lifecycle events,
            provisional naming, and the seam into Part-DB.
          </p>
        </div>
        <div className="status-card">
          <div className={`pill ${partDbStatus?.connected ? "ok" : "warn"}`}>
            {partDbStatus?.connected ? "Part-DB linked" : "Part-DB not linked"}
          </div>
          <p>{partDbStatus?.message ?? "Checking Part-DB status..."}</p>
          <small>
            {partDbStatus?.baseUrl
              ? `Base URL: ${partDbStatus.baseUrl}`
              : "Set PARTDB_BASE_URL and PARTDB_API_TOKEN when you are ready to link."}
          </small>
        </div>
      </header>

      {message ? <p className="banner success">{message}</p> : null}
      {error ? <p className="banner error">{error}</p> : null}

      <section className="metrics">
        <Metric label="Part types" value={dashboard?.partTypeCount ?? 0} />
        <Metric label="Instances" value={dashboard?.instanceCount ?? 0} />
        <Metric label="Bulk bins" value={dashboard?.bulkStockCount ?? 0} />
        <Metric label="Provisional" value={dashboard?.provisionalCount ?? 0} />
        <Metric label="Unassigned QRs" value={dashboard?.unassignedQrCount ?? 0} />
      </section>

      <main className="layout">
        <section className="panel">
          <PanelTitle
            title="Print QR batches"
            copy="Pre-register sticker ranges so damaged, skipped, and assigned labels are all explicit."
          />
          <form className="form-grid" onSubmit={handleRegisterBatch}>
            <label>
              Prefix
              <input
                value={batchForm.prefix}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    prefix: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Start number
              <input
                type="number"
                value={batchForm.startNumber}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    startNumber: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Count
              <input
                type="number"
                value={batchForm.count}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    count: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Actor
              <input
                value={batchForm.actor}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    actor: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit">Register batch</button>
          </form>
        </section>

        <section className="panel">
          <PanelTitle
            title="Scan"
            copy="A registered but unassigned QR opens the intake flow. An assigned QR opens lifecycle actions."
          />
          <form className="scan-form" onSubmit={handleScan}>
            <input
              placeholder="Scan or type a QR / barcode"
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
            />
            <button type="submit">Open</button>
          </form>

          {scanResult?.mode === "unknown" ? (
            <div className="result-card">
              <h3>{scanResult.code} is unknown to Smart DB</h3>
              <p>
                That usually means this is a manufacturer barcode or a QR that has not been
                pre-registered yet.
              </p>
              <small>{scanResult.partDb.message}</small>
            </div>
          ) : null}

          {scanResult?.mode === "label" ? (
            <div className="result-card">
              <h3>Assign {scanResult.qrCode.code}</h3>
              <p>Pick an existing part type or create a provisional one without slowing intake.</p>
              <form className="form-grid" onSubmit={handleAssign}>
                <label className="wide">
                  Search existing part types
                  <input
                    value={partTypeQuery}
                    onChange={(event) => void handleSearchPartTypes(event.target.value)}
                    placeholder="Arduino, JST, PLA, cotton..."
                  />
                </label>
                <div className="wide picker">
                  {partTypeOptions.map((partType) => (
                    <button
                      key={partType.id}
                      type="button"
                      className={
                        assignForm.partTypeMode === "existing" &&
                        assignForm.existingPartTypeId === partType.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setAssignForm((current) => ({
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
                  Actor
                  <input
                    value={assignForm.actor}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        actor: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Location
                  <input
                    value={assignForm.location}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Kind
                  <select
                    value={assignForm.entityKind}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        entityKind: event.target.value as AssignQrRequest["entityKind"],
                      }))
                    }
                  >
                    <option value="instance">Physical instance</option>
                    <option value="bulk">Bulk bin</option>
                  </select>
                </label>
                {assignForm.entityKind === "instance" ? (
                  <label>
                    Initial status
                    <select
                    value={assignForm.initialStatus}
                    onChange={(event) =>
                      setAssignForm((current) => ({
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
                    value={assignForm.initialLevel}
                    onChange={(event) =>
                      setAssignForm((current) => ({
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
                    value={assignForm.canonicalName}
                    placeholder="Leave blank when reusing an existing part type"
                    onChange={(event) =>
                      setAssignForm((current) => ({
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
                    value={assignForm.category}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Countable
                  <select
                    value={String(assignForm.countable)}
                    onChange={(event) =>
                      setAssignForm((current) => ({
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
                    value={assignForm.notes}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
                <button type="submit">Assign QR</button>
              </form>
            </div>
          ) : null}

          {scanResult?.mode === "interact" ? (
            <div className="result-card">
              <h3>
                {scanResult.entity.partType.canonicalName} · {scanResult.entity.qrCode}
              </h3>
              <p>
                {scanResult.entity.targetType} in {scanResult.entity.location} · current state{" "}
                <strong>{scanResult.entity.state}</strong>
              </p>
              <form className="form-grid" onSubmit={handleRecordEvent}>
                <label>
                  Actor
                  <input
                    value={eventForm.actor}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        actor: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Event
                  <select
                    value={eventForm.event}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        event: event.target.value as StockEventKind,
                      }))
                    }
                  >
                    {scanResult.availableActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input
                    value={eventForm.location}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>
                {scanResult.entity.targetType === "instance" ? (
                  <>
                    <label>
                      Next status
                      <select
                        value={eventForm.nextStatus}
                        onChange={(event) =>
                        setEventForm((current) => ({
                            ...current,
                            nextStatus: event.target.value as InstanceStatus,
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
                    <label>
                      Assignee
                      <input
                    value={eventForm.assignee}
                        onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          assignee: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    Next level
                    <select
                      value={eventForm.nextLevel}
                      onChange={(event) =>
                        setEventForm((current) => ({
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
                    value={eventForm.notes}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
                <button type="submit">Log event</button>
              </form>

              <div className="event-list">
                {scanResult.recentEvents.map((stockEvent) => (
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
        </section>

        <section className="panel">
          <PanelTitle
            title="Canonicalize provisional types"
            copy="Labelers can move fast. Admin cleanup stays cheap and explicit."
          />
          <div className="stack">
            <label>
              Provisional source
              <select value={mergeSourceId} onChange={(event) => setMergeSourceId(event.target.value)}>
                <option value="">Select provisional type</option>
                {provisionalPartTypes.map((partType) => (
                  <option key={partType.id} value={partType.id}>
                    {partType.canonicalName} · {partType.category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Find canonical destination
              <input
                value={partTypeQuery}
                onChange={(event) => void handleSearchPartTypes(event.target.value)}
                placeholder="Search existing type"
              />
            </label>
            <div className="picker">
              {partTypeResults.map((partType) => (
                <button
                  key={partType.id}
                  type="button"
                  className={mergeDestinationId === partType.id ? "selected" : ""}
                  onClick={() => setMergeDestinationId(partType.id)}
                >
                  <strong>{partType.canonicalName}</strong>
                  <span>{partType.category}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void handleMergePartTypes()}>
              Merge provisional type
            </button>
          </div>
        </section>

        <section className="panel">
          <PanelTitle
            title="Recent events"
            copy="Counts are derived from event-backed state, not from hand-edited integers."
          />
          <div className="event-list">
            {dashboard?.recentEvents.map((stockEvent) => (
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

          <div className="resource-list">
            <h3>Discovered Part-DB resources</h3>
            <ul>
              <li>Parts: {partDbStatus?.discoveredResources.partsPath ?? "not discovered"}</li>
              <li>Part lots: {partDbStatus?.discoveredResources.partLotsPath ?? "not discovered"}</li>
              <li>
                Storage locations:{" "}
                {partDbStatus?.discoveredResources.storageLocationsPath ?? "not discovered"}
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function PanelTitle(props: { title: string; copy: string }) {
  return (
    <div className="panel-title">
      <h2>{props.title}</h2>
      <p>{props.copy}</p>
    </div>
  );
}

function Metric(props: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  return "Something went wrong.";
}

export function buildAssignRequest(form: AssignFormState): AssignQrRequest {
  const notes = normalizeNullable(form.notes);

  if (form.partTypeMode === "existing" && form.existingPartTypeId) {
    return form.entityKind === "instance"
      ? {
          qrCode: form.qrCode,
          actor: form.actor,
          entityKind: "instance",
          location: form.location,
          notes,
          partType: {
            kind: "existing",
            existingPartTypeId: form.existingPartTypeId,
          },
          initialStatus: form.initialStatus,
        }
      : {
          qrCode: form.qrCode,
          actor: form.actor,
          entityKind: "bulk",
          location: form.location,
          notes,
          partType: {
            kind: "existing",
            existingPartTypeId: form.existingPartTypeId,
          },
          initialLevel: form.initialLevel,
        };
  }

  return form.entityKind === "instance"
    ? {
        qrCode: form.qrCode,
        actor: form.actor,
        entityKind: "instance",
        location: form.location,
        notes,
        partType: {
          kind: "new",
          canonicalName: form.canonicalName,
          category: form.category,
          aliases: [],
          notes: null,
          imageUrl: null,
          countable: form.countable,
        },
        initialStatus: form.initialStatus,
      }
    : {
        qrCode: form.qrCode,
        actor: form.actor,
        entityKind: "bulk",
        location: form.location,
        notes,
        partType: {
          kind: "new",
          canonicalName: form.canonicalName,
          category: form.category,
          aliases: [],
          notes: null,
          imageUrl: null,
          countable: form.countable,
        },
        initialLevel: form.initialLevel,
      };
}

export function buildEventRequest(form: EventFormState): RecordEventRequest {
  return form.targetType === "instance"
    ? {
        targetType: "instance",
        targetId: form.targetId,
        actor: form.actor,
        event: narrowInstanceEvent(form.event),
        location: form.location,
        notes: normalizeNullable(form.notes),
        nextStatus: form.nextStatus,
        assignee: normalizeNullable(form.assignee),
      }
    : {
        targetType: "bulk",
        targetId: form.targetId,
        actor: form.actor,
        event: narrowBulkEvent(form.event),
        location: form.location,
        notes: normalizeNullable(form.notes),
        nextLevel: form.nextLevel,
      };
}

export function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function narrowInstanceEvent(event: StockEventKind): Extract<StockEventKind, "moved" | "checked_out" | "returned" | "consumed" | "damaged" | "lost" | "disposed"> {
  if (event === "level_changed" || event === "labeled") {
    throw new InvariantError(`Invalid instance event: ${event}`);
  }

  return event;
}

export function narrowBulkEvent(
  event: StockEventKind,
): Extract<StockEventKind, "moved" | "level_changed" | "consumed"> {
  if (event !== "moved" && event !== "level_changed" && event !== "consumed") {
    throw new InvariantError(`Invalid bulk event: ${event}`);
  }

  return event;
}
