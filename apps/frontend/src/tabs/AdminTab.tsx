import type { FormEvent } from "react";
import type {
  PartDbSyncFailure,
  PartDbSyncStatusResponse,
  PartType,
  QrBatch,
  RegisterQrBatchRequest,
} from "@smart-db/contracts";
import { PanelTitle } from "../components/PanelTitle";
import {
  describePartDbSyncFailure,
  formatCategoryPath,
  formatTimestamp,
  type SearchState,
} from "../SmartApp.helpers";

interface AdminTabProps {
  sessionUsername: string;
  pendingAction: string | null;
  // Batch
  batchForm: RegisterQrBatchRequest;
  onBatchFormChange: (updater: (current: RegisterQrBatchRequest) => RegisterQrBatchRequest) => void;
  onRegisterBatch: (event: FormEvent<HTMLFormElement>) => void;
  latestBatch: QrBatch | null;
  isDownloadingLabels: boolean;
  onDownloadLabels: () => void;
  partDbSyncStatus: PartDbSyncStatusResponse | null;
  partDbSyncFailures: PartDbSyncFailure[];
  onDrainSync: () => void;
  onBackfillSync: () => void;
  onRetrySync: (id: string) => void;
  // Merge
  provisionalPartTypes: PartType[];
  mergeSourceId: string;
  onMergeSourceIdChange: (value: string) => void;
  mergeDestinationId: string;
  onMergeDestinationIdChange: (value: string) => void;
  mergeSearch: SearchState;
  mergeOptions: PartType[];
  onMergeSearch: (query: string) => void;
  onMerge: () => void;
  onApprovePartType: (id: string) => void;
}

export function AdminTab(props: AdminTabProps) {
  const syncEnabled = props.partDbSyncStatus?.enabled ?? false;

  return (
    <>
      <section className="panel">
        <PanelTitle
          title="Part-DB sync"
          copy="SmartDB remains writable while sync catches up in the background."
        />
        <div className="sync-status-grid">
          <div className="sync-status-card">
            <strong>Queued</strong>
            <span>{props.partDbSyncStatus?.pending ?? 0}</span>
          </div>
          <div className="sync-status-card">
            <strong>In flight</strong>
            <span>{props.partDbSyncStatus?.inFlight ?? 0}</span>
          </div>
          <div className="sync-status-card">
            <strong>Recent failures</strong>
            <span>{props.partDbSyncStatus?.failedLast24h ?? 0}</span>
          </div>
          <div className="sync-status-card">
            <strong>Dead</strong>
            <span>{props.partDbSyncStatus?.deadTotal ?? 0}</span>
          </div>
        </div>
        <div className="sync-actions">
          <button
            type="button"
            onClick={props.onDrainSync}
            disabled={!syncEnabled || props.pendingAction !== null}
          >
            {props.pendingAction === "sync" ? "Syncing..." : "Run sync now"}
          </button>
          <button
            type="button"
            onClick={props.onBackfillSync}
            disabled={!syncEnabled || props.pendingAction !== null}
          >
            {props.pendingAction === "sync" ? "Queuing..." : "Queue backfill"}
          </button>
        </div>
        {!syncEnabled ? (
          <p className="muted-copy">Background sync is disabled for this deployment.</p>
        ) : props.partDbSyncFailures.length > 0 ? (
          <div className="event-list">
            {props.partDbSyncFailures.map((failure) => (
              <article key={failure.id}>
                <strong>{failure.operation}</strong>
                <span>
                  {failure.status} · attempt {failure.attemptCount}
                </span>
                <small>
                  Last failure {formatTimestamp(failure.lastFailureAt ?? failure.createdAt)}
                </small>
                <small>{describePartDbSyncFailure(failure)}</small>
                <button
                  type="button"
                  onClick={() => props.onRetrySync(failure.id)}
                  disabled={props.pendingAction !== null}
                >
                  Retry sync
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-copy">No recent sync failures.</p>
        )}
      </section>

      <section className="panel">
        <PanelTitle
          title="Print QR batches"
          copy={`Pre-register sticker ranges. This batch will be attributed to ${props.sessionUsername}.`}
        />
        <p className="muted-copy batch-preview">
          Next range preview: {props.batchForm.prefix}-{props.batchForm.startNumber} to {props.batchForm.prefix}-{props.batchForm.startNumber + props.batchForm.count - 1} ({props.batchForm.count} labels)
        </p>
        {props.latestBatch ? (
          <div className="latest-batch-card">
            <div>
              <strong>Latest batch</strong>
              <p>
                {props.latestBatch.id} · {props.latestBatch.prefix}-{props.latestBatch.startNumber}
                {" "}to{" "}
                {props.latestBatch.prefix}-{props.latestBatch.endNumber}
              </p>
              <small>
                {props.latestBatch.endNumber - props.latestBatch.startNumber + 1} labels · created by{" "}
                {props.latestBatch.actor}
              </small>
            </div>
            <button
              type="button"
              onClick={props.onDownloadLabels}
              disabled={props.isDownloadingLabels}
            >
              {props.isDownloadingLabels ? "Downloading..." : "Download PDF Labels"}
            </button>
          </div>
        ) : (
          <p className="muted-copy">No QR batch has been registered yet.</p>
        )}
        <form className="form-grid" onSubmit={props.onRegisterBatch}>
          <label>
            Prefix
            <input
              value={props.batchForm.prefix}
              maxLength={20}
              onChange={(event) =>
                props.onBatchFormChange((current) => ({
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
              value={props.batchForm.startNumber}
              min={0}
              onChange={(event) =>
                props.onBatchFormChange((current) => ({
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
              value={props.batchForm.count}
              min={1}
              max={500}
              onChange={(event) =>
                props.onBatchFormChange((current) => ({
                  ...current,
                  count: Number(event.target.value),
                }))
              }
            />
          </label>
          <button type="submit" disabled={props.pendingAction !== null}>
            {props.pendingAction === "batch" ? "Registering..." : "Register batch"}
          </button>
        </form>
      </section>

      <section className="panel">
        <PanelTitle
          title="Canonicalize provisional types"
          copy="Merge cleanup uses its own predictive search state and request ordering."
        />
        <div className="stack">
          <label>
            Provisional source
            <select
              value={props.mergeSourceId}
              onChange={(event) => props.onMergeSourceIdChange(event.target.value)}
            >
              <option value="">Select provisional type</option>
              {props.provisionalPartTypes.map((partType) => (
              <option key={partType.id} value={partType.id}>
                  {partType.canonicalName} · {formatCategoryPath(partType.categoryPath)}
                </option>
              ))}
            </select>
          </label>
          {props.mergeSourceId && (
            <button
              type="button"
              onClick={() => props.onApprovePartType(props.mergeSourceId)}
              disabled={props.pendingAction !== null}
            >
              Keep As-Is
            </button>
          )}
          <label>
            Find canonical destination
            <input
              value={props.mergeSearch.query}
              onChange={(event) => props.onMergeSearch(event.target.value)}
              placeholder="Search existing type"
            />
          </label>
          {props.mergeSearch.error ? <p className="banner error">{props.mergeSearch.error}</p> : null}
          <div className="picker" role="radiogroup" aria-label="Canonical destination">
            {props.mergeOptions.map((partType) => (
              <button
                key={partType.id}
                type="button"
                role="radio"
                aria-checked={props.mergeDestinationId === partType.id}
                className={props.mergeDestinationId === partType.id ? "selected" : ""}
                onClick={() => props.onMergeDestinationIdChange(partType.id)}
              >
                <strong>{partType.canonicalName}</strong>
                <span>{formatCategoryPath(partType.categoryPath)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={props.onMerge}
            disabled={props.pendingAction !== null}
          >
            {props.pendingAction === "merge" ? "Merging..." : "Merge provisional type"}
          </button>
        </div>
      </section>
    </>
  );
}
