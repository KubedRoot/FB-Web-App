import { getDevice } from "../device";
import { store } from "../redux/store";
import { Actions } from "../constants";
import { set } from "lodash";

interface NonSense {
  last: string;
  all: Set<string>;
}

export const outstandingRequests: NonSense = {
  last: "never-used",
  all: new Set()
};

export function storeUUID(uuid: string) {
  outstandingRequests.last = uuid;
  outstandingRequests.all.add(outstandingRequests.last);
}

function unstoreUUID(uuid: string) {
  outstandingRequests.all.delete(PLACEHOLDER);
  outstandingRequests.all.delete(uuid);
}

set(window, "outstanding_requests", outstandingRequests);

/** Use this when you need to throw the FE into an inconsistent state, but dont
 * have a real UUID available. It will be removed when a "real" UUID comes
 * along. This is necesary for creating an instantaneous "syncing..." label. */
const PLACEHOLDER = "PLACEHOLDER";

/** Max wait in MS before clearing out. */
const MAX_WAIT = 10000;

/**
* PROBLEM:  You save a sequence and click "RUN" very fast. The remote device
*           did not have time to download the new sequence and so it crashes
*           with a "sequence not found error". This is a result of an
*           inconsistency between the local FE and FBOS.
*
* SOLUTION:
*
*   - On all AJAX requests, the API attaches an `X-Request-Id` header (UUID).
*   - On all auto_sync messages, the API attaches the same UUID under
*     msg.args.label
*   - When FBOS gets an auto_sync message, it replies with an `rpc_ok` message
*     that has the same `label` as the API requeset.
*   - We keep a list of `outstandingRequests` filled with such UUIDs.
*   - When we get an `rpc_ok` from farmbot, we remove it from the list.
*   - If the request takes longer than 5 seconds, remove it from the list also
*     to prevent accidental UX issues. ("forceful removal")
*   - When `outstandingRequests.size === 0`, you can (probably) assume that the
*     Bot, API and client are in a consistent state. It is safe to perform data
*     intensive operations.
*
* LONG TERM SOLUTION: TODO:
*
*   - We should consider moving CRUD operations into FarmBotJS and provide
*     developers a unified API that handles these things.
*   - If data operations were RPCs instead of REST calls, we would not need
*     this and we could track data operations the same way a `exec_sequence`
*     and friends.
*/
export function startTracking(uuid = PLACEHOLDER) {
  const cleanID = cleanUUID(uuid);
  ifQueueEmpty(() => store.dispatch(stash()));
  if (getConsistencyState()) {
    store.dispatch(setConsistency(false));
  }
  storeUUID(cleanID);
  getDevice().on(cleanID, () => stopTracking(cleanID));
  setTimeout(stop, MAX_WAIT);
}

export function stopTracking(uuid: string) {
  const cleanID = cleanUUID(uuid);
  unstoreUUID(cleanID);
  if (!getConsistencyState()) { // Do we even need to dispatch?
    ifQueueEmpty(() => store.dispatch(setConsistency(true)));
  }
}

const setConsistency =
  (payload: boolean) => ({ type: Actions.SET_CONSISTENCY, payload });
const stash =
  () => ({ type: Actions.STASH_STATUS, payload: undefined });
const ifQueueEmpty =
  <T>(cb: () => T): T | false => (outstandingRequests.all.size === 0) && cb();
const getConsistencyState = () => !!store.getState().bot.consistent;

/** HTTP servers were stripping dots out of our UUIDs in headers...? */
export const cleanUUID =
  (uuid: string) => uuid.toLowerCase().split(".").join("");
