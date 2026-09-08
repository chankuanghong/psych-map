const state = {
  status: null,
  history: [],
  venueMutationPending: false,
  selectedTagId: null,
  selectedVenueId: null,
};

const elements = {
  readerStatus: document.querySelector("#reader-status"),
  updated: document.querySelector("#last-updated"),
  threshold: document.querySelector("#leave-threshold"),
  syncThreshold: document.querySelector("#sync-threshold"),
  summaryCount: document.querySelector("#summary-count"),
  summaryVenue: document.querySelector("#summary-venue"),
  summarySync: document.querySelector("#summary-sync"),
  count: document.querySelector("#present-count"),
  people: document.querySelector("#people-list"),
  history: document.querySelector("#history-list"),
  error: document.querySelector("#api-error"),
  activeVenueLabel: document.querySelector("#active-venue-label"),
  activeVenueId: document.querySelector("#active-venue-id"),
  venueForm: document.querySelector("#venue-form"),
  venueSelect: document.querySelector("#venue-select"),
  venueSubmit: document.querySelector("#venue-submit"),
  venueFeedback: document.querySelector("#venue-feedback"),
  mapLiveSummary: document.querySelector("#map-live-summary"),
  selectionEmpty: document.querySelector("#selection-empty"),
  roomLedger: document.querySelector("#room-ledger"),
  roomLedgerName: document.querySelector("#room-ledger-name"),
  roomLedgerCount: document.querySelector("#room-ledger-count"),
  roomLedgerPeople: document.querySelector("#room-ledger-people"),
  roomLedgerClose: document.querySelector("#room-ledger-close"),
  inspector: document.querySelector("#person-inspector"),
  inspectorName: document.querySelector("#person-inspector-name"),
  inspectorLocation: document.querySelector("#person-inspector-location"),
  inspectorMeta: document.querySelector("#person-inspector-meta"),
  inspectorTag: document.querySelector("#person-inspector-tag"),
  inspectorClose: document.querySelector("#person-inspector-close"),
};

const mapZones = [...document.querySelectorAll(".map-zone[data-venue]")];
const markerLayer = document.querySelector("#people-marker-layer");
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PERSON_COLORS = {
  D00000000000000000000001: "#087a64",
  D00000000000000000000002: "#6b57a5",
};
const PERSON_COLOR_PALETTE = [
  "#b45543", "#2f6f9f", "#986b18", "#a33f74",
  "#52713c", "#725844", "#287d83", "#805a9d",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  if (name === "Unassigned tag") return "?";
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
}

function personColor(tagId) {
  if (PERSON_COLORS[tagId]) return PERSON_COLORS[tagId];
  let hash = 0;
  for (const character of tagId) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return PERSON_COLOR_PALETTE[hash % PERSON_COLOR_PALETTE.length];
}

function personName(tagId) {
  return state.status?.people.find((person) => person.tag_id === tagId)?.name || "Unassigned tag";
}

function formatDuration(session) {
  if (session.status === "active") return "In venue";
  const minutes = session.duration_minutes_rounded;
  return `${minutes} ${minutes === 1 ? "min" : "mins"}`;
}

function reasonLabel(reason) {
  return {
    signal_lost: "Signal lost",
    scanner_relocated: "Scanner relocated",
    service_stopped: "Service stopped",
  }[reason] || "Active";
}

function activeMapZone() {
  return mapZones.find((zone) => zone.dataset.venue === state.status?.venue.venue_id);
}

function mapZoneForVenue(venueId) {
  return mapZones.find((zone) => zone.dataset.venue === venueId);
}

function lastSessionForTag(tagId) {
  return state.history.find((session) => session.tag_id === tagId);
}

function renderReader(reader) {
  elements.readerStatus.classList.toggle("is-online", reader.connected);
  elements.readerStatus.classList.toggle("is-error", !reader.connected && Boolean(reader.error));
  const text = reader.connected ? "Reader connected" : reader.error ? "Reader unavailable" : "Connecting to reader…";
  elements.readerStatus.querySelector("span:last-child").textContent = text;
  elements.readerStatus.title = reader.error || text;
}

function populateVenues(venues) {
  if (elements.venueSelect.dataset.loaded === "true") return;
  elements.venueSelect.innerHTML = venues.map((venue) => (
    `<option value="${escapeHtml(venue.venue_id)}">${escapeHtml(venue.venue_label)}</option>`
  )).join("");
  elements.venueSelect.dataset.loaded = "true";
  elements.venueSelect.disabled = false;
}

function previewVenue(venueId) {
  const zone = mapZoneForVenue(venueId);
  mapZones.forEach((candidate) => candidate.classList.toggle("is-preview", candidate === zone));
  if (!zone) return;
  elements.venueSelect.value = venueId;
  elements.venueSelect.dataset.dirty = "true";
  elements.venueSubmit.disabled = state.venueMutationPending || venueId === state.status?.venue.venue_id;
  elements.venueFeedback.classList.remove("is-error");
  elements.venueFeedback.textContent = venueId === state.status?.venue.venue_id
    ? `${zone.dataset.label} is already the active scanner venue.`
    : `Ready to move the scanner to ${zone.dataset.label}.`;
}

function setupMapInteractions() {
  mapZones.forEach((zone) => {
    zone.addEventListener("click", () => selectRoom(zone.dataset.venue));
    zone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectRoom(zone.dataset.venue);
    });
  });

  markerLayer.addEventListener("click", (event) => {
    const marker = event.target.closest(".human-marker[data-tag-id]");
    if (!marker) return;
    event.stopPropagation();
    selectPerson(marker.dataset.tagId);
  });
  markerLayer.addEventListener("keydown", (event) => {
    const marker = event.target.closest(".human-marker[data-tag-id]");
    if (!marker || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    selectPerson(marker.dataset.tagId);
  });
}

function renderVenue(status) {
  const { venue, venues } = status;
  populateVenues(venues);
  elements.activeVenueLabel.textContent = venue.venue_label;
  elements.activeVenueId.textContent = venue.venue_id;
  elements.summaryVenue.textContent = venue.venue_label;

  if (elements.venueSelect.dataset.dirty !== "true" && !state.venueMutationPending) {
    elements.venueSelect.value = venue.venue_id;
  }
  elements.venueSubmit.disabled = state.venueMutationPending || elements.venueSelect.value === venue.venue_id;

  mapZones.forEach((zone) => {
    const isActive = zone.dataset.venue === venue.venue_id;
    zone.classList.toggle("is-active-scanner", isActive);
    if (isActive) zone.setAttribute("aria-current", "location");
    else zone.removeAttribute("aria-current");
  });

  const zone = activeMapZone();
  if (!zone) {
    elements.mapLiveSummary.textContent = `Scanner active at ${venue.venue_label}; this venue has no map position.`;
  }
}

function markerFits(shape, x, y) {
  return [[0, 0], [-4, 0], [4, 0], [0, -8], [0, 8]].every(
    ([offsetX, offsetY]) => shape.isPointInFill(new DOMPoint(x + offsetX, y + offsetY)),
  );
}

function markerPositionsForZone(zone, count) {
  const shape = zone.querySelector(".room-shape");
  const bounds = shape.getBBox();
  const preferred = { x: Number(zone.dataset.personX), y: Number(zone.dataset.personY) };
  const candidates = [];
  const seen = new Set();

  for (const spacing of [20, 14]) {
    const xSteps = Math.ceil(bounds.width / spacing);
    const ySteps = Math.ceil(bounds.height / spacing);
    for (let xStep = -xSteps; xStep <= xSteps; xStep += 1) {
      for (let yStep = -ySteps; yStep <= ySteps; yStep += 1) {
        const x = preferred.x + (xStep * spacing);
        const y = preferred.y + (yStep * spacing);
        const key = `${x.toFixed(1)}:${y.toFixed(1)}`;
        if (seen.has(key) || !markerFits(shape, x, y)) continue;
        seen.add(key);
        candidates.push({
          x,
          y,
          preferredDistance: Math.hypot(x - preferred.x, y - preferred.y),
        });
      }
    }
  }

  candidates.sort((a, b) => a.preferredDistance - b.preferredDistance);
  if (!candidates.length) return Array.from({ length: count }, () => preferred);

  const selected = [candidates.shift()];
  while (selected.length < count && candidates.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    candidates.forEach((candidate, index) => {
      const nearest = Math.min(...selected.map((point) => Math.hypot(
        candidate.x - point.x,
        candidate.y - point.y,
      )));
      const score = nearest;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    selected.push(candidates.splice(bestIndex, 1)[0]);
  }
  while (selected.length < count) selected.push(selected[selected.length % selected.length]);
  return selected;
}

function createPersonMarker(person) {
  const marker = document.createElementNS(SVG_NAMESPACE, "g");
  marker.classList.add("human-marker");
  marker.dataset.tagId = person.tag_id;
  marker.setAttribute("tabindex", "0");
  marker.setAttribute("role", "button");
  marker.innerHTML = `
    <circle class="person-pulse" r="8"></circle>
    <circle class="human-hit" r="13"></circle>
    <use class="person-symbol" href="#person-symbol" x="-10" y="-10" width="20" height="20"></use>`;
  return marker;
}

function peopleForMap(people) {
  const mapped = new Map();
  people.forEach((person) => {
    if (person.present) {
      mapped.set(person.tag_id, person);
      return;
    }
    const session = lastSessionForTag(person.tag_id);
    if (!session) return;
    mapped.set(person.tag_id, {
      ...person,
      venue_id: session.venue_id,
      venue_label: session.venue_label,
      last_seen_at_local_24h: session.exited_at_local_24h || session.last_seen_at_local_24h,
    });
  });
  state.history.forEach((session) => {
    if (mapped.has(session.tag_id)) return;
    mapped.set(session.tag_id, {
      tag_id: session.tag_id,
      name: personName(session.tag_id),
      subject_id: session.subject_id,
      assigned: Boolean(session.subject_id),
      present: session.status === "active",
      venue_id: session.venue_id,
      venue_label: session.venue_label,
      entered_at_local_24h: session.entered_at_local_24h,
      last_seen_at_local_24h: session.exited_at_local_24h || session.last_seen_at_local_24h,
    });
  });
  return [...mapped.values()];
}

function positionPeopleMarkers(people) {
  const existing = new Map(
    [...markerLayer.querySelectorAll(".human-marker[data-tag-id]")]
      .map((marker) => [marker.dataset.tagId, marker]),
  );
  const grouped = new Map();
  people.forEach((person) => {
    const venuePeople = grouped.get(person.venue_id) || [];
    venuePeople.push(person);
    grouped.set(person.venue_id, venuePeople);
  });

  grouped.forEach((venuePeople, venueId) => {
    const zone = mapZoneForVenue(venueId);
    if (!zone) return;
    venuePeople.sort((a, b) => a.tag_id.localeCompare(b.tag_id));
    const positions = markerPositionsForZone(zone, venuePeople.length);
    venuePeople.forEach((person, index) => {
      const marker = existing.get(person.tag_id) || createPersonMarker(person);
      marker.style.setProperty("--person-color", personColor(person.tag_id));
      marker.classList.toggle("is-present", person.present);
      marker.classList.toggle("is-away", !person.present);
      marker.setAttribute("aria-label", person.present
        ? `Open ${person.name} location at ${person.venue_label}`
        : `Open ${person.name} last known location at ${person.venue_label}`);
      marker.setAttribute("transform", `translate(${positions[index].x} ${positions[index].y})`);
      marker.classList.toggle("is-selected", person.tag_id === state.selectedTagId);
      markerLayer.append(marker);
      existing.delete(person.tag_id);
    });
  });
  existing.forEach((marker) => marker.remove());
}

function updateMapLiveSummary() {
  if (!state.status) return;
  const liveCount = state.status.people.filter((person) => person.present).length;
  elements.mapLiveSummary.textContent = `${liveCount} live ${liveCount === 1 ? "tag" : "tags"} at ${state.status.venue.venue_label}. Grey figures show last known positions.`;
}

function clearRoomSelection() {
  state.selectedVenueId = null;
  elements.roomLedger.hidden = true;
  mapZones.forEach((zone) => {
    zone.classList.remove("is-selected-room");
    zone.setAttribute("aria-pressed", "false");
  });
  if (elements.inspector.hidden) elements.selectionEmpty.hidden = false;
}

function renderRoomLedger() {
  if (!state.status || !state.selectedVenueId) return;
  const zone = mapZoneForVenue(state.selectedVenueId);
  if (!zone) return;
  const occupants = state.status.people.filter((person) => (
    person.present && person.venue_id === state.selectedVenueId
  ));

  elements.roomLedgerName.textContent = zone.dataset.label;
  elements.roomLedgerCount.textContent = String(occupants.length);
  elements.roomLedgerCount.setAttribute("aria-label", `${occupants.length} people currently in ${zone.dataset.label}`);
  elements.roomLedgerPeople.innerHTML = occupants.length
    ? occupants.map((person) => `
      <button type="button" class="room-ledger-person" data-tag-id="${escapeHtml(person.tag_id)}" style="--person-color:${personColor(person.tag_id)}">
        <span class="avatar" aria-hidden="true">${escapeHtml(initials(person.name))}</span>
        <span class="room-ledger-copy">
          <strong>${escapeHtml(person.name)}</strong>
          <span>Entered ${escapeHtml(person.entered_at_local_24h)} SGT</span>
        </span>
        <code>${escapeHtml(person.tag_id)}</code>
      </button>`).join("")
    : `<p class="room-ledger-empty">No one is currently detected in ${escapeHtml(zone.dataset.label)}.</p>`;
  elements.selectionEmpty.hidden = true;
  elements.roomLedger.hidden = false;
}

function selectRoom(venueId) {
  const zone = mapZoneForVenue(venueId);
  if (!zone) return;
  clearPersonSelection();
  state.selectedVenueId = venueId;
  mapZones.forEach((candidate) => {
    const isSelected = candidate === zone;
    candidate.classList.toggle("is-selected-room", isSelected);
    candidate.setAttribute("aria-pressed", String(isSelected));
  });
  renderRoomLedger();
}

function clearPersonSelection() {
  state.selectedTagId = null;
  elements.inspector.hidden = true;
  mapZones.forEach((zone) => {
    zone.classList.remove("is-person-location", "is-last-known");
  });
  document.querySelectorAll(".human-marker").forEach((marker) => marker.classList.remove("is-selected"));
  document.querySelectorAll(".person-row").forEach((row) => {
    row.classList.remove("is-selected");
    row.setAttribute("aria-pressed", "false");
  });
  if (elements.roomLedger.hidden) elements.selectionEmpty.hidden = false;
}

function renderPersonInspector(person) {
  const lastSession = lastSessionForTag(person.tag_id);
  mapZones.forEach((zone) => {
    zone.classList.remove("is-person-location", "is-last-known");
  });

  elements.inspectorName.textContent = person.name;
  elements.inspectorTag.textContent = person.tag_id;
  elements.inspector.style.setProperty("--person-color", personColor(person.tag_id));
  if (person.present) {
    elements.inspectorLocation.textContent = `Currently in ${person.venue_label}`;
    elements.inspectorMeta.textContent = `Entered ${person.entered_at_local_24h} SGT · last read ${person.last_seen_at_local_24h} SGT`;
    mapZoneForVenue(person.venue_id)?.classList.add("is-person-location");
  } else if (lastSession) {
    elements.inspectorLocation.textContent = `Away · last seen in ${lastSession.venue_label}`;
    elements.inspectorMeta.textContent = `Entered ${lastSession.entered_at_local_24h} SGT · ${lastSession.status === "closed" ? "left" : "last read"} ${lastSession.exited_at_local_24h || lastSession.last_seen_at_local_24h} SGT`;
    mapZoneForVenue(lastSession.venue_id)?.classList.add("is-last-known");
  } else {
    elements.inspectorLocation.textContent = "Not currently detected";
    elements.inspectorMeta.textContent = "No recorded ward visit is available for this tag.";
  }

  elements.selectionEmpty.hidden = true;
  elements.inspector.hidden = false;
  document.querySelectorAll(".person-row").forEach((row) => {
    const isSelected = row.dataset.tagId === person.tag_id;
    row.classList.toggle("is-selected", isSelected);
    row.setAttribute("aria-pressed", String(isSelected));
  });
  document.querySelectorAll(".human-marker").forEach((marker) => {
    marker.classList.toggle("is-selected", marker.dataset.tagId === person.tag_id);
  });
}

function selectPerson(tagId) {
  const person = state.status?.people.find((candidate) => candidate.tag_id === tagId);
  const mapPerson = peopleForMap(state.status?.people || []).find((candidate) => candidate.tag_id === tagId);
  if (!person && !mapPerson) return;
  clearRoomSelection();
  state.selectedTagId = tagId;
  renderPersonInspector(person || mapPerson);
}

function renderPeople(people) {
  const ordered = [...people].sort((a, b) => Number(b.present) - Number(a.present) || Number(b.assigned) - Number(a.assigned) || a.name.localeCompare(b.name));
  const present = ordered.filter((person) => person.present);
  elements.count.textContent = String(present.length);
  elements.summaryCount.textContent = String(present.length);
  elements.count.setAttribute("aria-label", `${present.length} tags present`);
  elements.people.setAttribute("aria-busy", "false");
  elements.people.innerHTML = ordered.map((person) => {
    const subject = person.subject_id ? ` · ${person.subject_id}` : "";
    const lastSession = lastSessionForTag(person.tag_id);
    const detail = person.present
      ? `In ${person.venue_label} since ${person.entered_at_local_24h} SGT`
      : lastSession
        ? `Last seen in ${lastSession.venue_label} · ${lastSession.exited_at_local_24h || lastSession.last_seen_at_local_24h} SGT`
        : "Not detected yet";
    const isSelected = person.tag_id === state.selectedTagId;
    return `
      <button type="button" class="person-row ${person.present ? "is-present" : ""} ${isSelected ? "is-selected" : ""}" data-tag-id="${escapeHtml(person.tag_id)}" aria-pressed="${isSelected}" style="--person-color:${personColor(person.tag_id)}">
        <span class="person-top">
          <span class="avatar" aria-hidden="true">${escapeHtml(initials(person.name))}</span>
          <span class="person-meta">
            <strong class="person-name">${escapeHtml(person.name)}${escapeHtml(subject)}</strong>
            <span class="person-status">${escapeHtml(detail)}</span>
          </span>
          <span class="status-label">${person.present ? "At venue" : "Away"}</span>
        </span>
        <code class="epc">${escapeHtml(person.tag_id)}</code>
      </button>`;
  }).join("");
  positionPeopleMarkers(peopleForMap(people));
  updateMapLiveSummary();
  if (state.selectedVenueId) renderRoomLedger();

  if (state.selectedTagId) {
    const selected = peopleForMap(people).find((person) => person.tag_id === state.selectedTagId);
    if (selected) renderPersonInspector(selected);
    else clearPersonSelection();
  }
}

function renderHistory(sessions) {
  elements.history.setAttribute("aria-busy", "false");
  if (!sessions.length) {
    elements.history.innerHTML = '<div class="empty-state">No visits recorded yet. A visit begins when a tag is first detected.</div>';
    return;
  }
  elements.history.innerHTML = sessions.map((session) => `
    <article class="history-row">
      <div class="history-person">
        ${escapeHtml(personName(session.tag_id))}
        <span>${escapeHtml(session.subject_id || "Unassigned")} · ${escapeHtml(session.venue_label)}</span>
      </div>
      <div class="history-time"><strong>Entered</strong>${escapeHtml(session.entered_at_local_24h)} SGT</div>
      <div class="history-time"><strong>${session.status === "closed" ? "Exited" : "Last seen"}</strong>${escapeHtml(session.exited_at_local_24h || session.last_seen_at_local_24h)} SGT</div>
      <div class="history-duration">
        ${escapeHtml(formatDuration(session))}
        <span>${escapeHtml(reasonLabel(session.closed_reason))}${session.exit_inferred ? " · inferred" : ""}</span>
      </div>
    </article>`).join("");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${response.status} ${response.statusText}`);
  return payload;
}

async function refresh() {
  try {
    const [status, history] = await Promise.all([
      fetchJson("/api/status"),
      fetchJson("/api/history"),
    ]);
    state.status = status;
    state.history = history.sessions;
    renderReader(status.reader);
    renderVenue(status);
    renderHistory(history.sessions);
    renderPeople(status.people);
    elements.threshold.textContent = String(status.leave_after_seconds);
    const syncMinutes = Math.max(1, Math.round(status.persistence_interval_seconds / 60));
    elements.syncThreshold.textContent = String(syncMinutes);
    elements.summarySync.textContent = `${syncMinutes} min`;
    elements.updated.textContent = `Updated ${status.generated_at_local_24h} SGT`;
    elements.error.hidden = true;
  } catch (error) {
    elements.error.hidden = false;
    elements.updated.textContent = "Update failed · retrying";
    elements.readerStatus.classList.remove("is-online");
    elements.readerStatus.classList.add("is-error");
    elements.readerStatus.querySelector("span:last-child").textContent = "Dashboard offline";
  }
}

elements.people.addEventListener("click", (event) => {
  const row = event.target.closest(".person-row[data-tag-id]");
  if (row) selectPerson(row.dataset.tagId);
});
elements.roomLedgerPeople.addEventListener("click", (event) => {
  const person = event.target.closest(".room-ledger-person[data-tag-id]");
  if (person) selectPerson(person.dataset.tagId);
});
elements.roomLedgerClose.addEventListener("click", clearRoomSelection);
elements.inspectorClose.addEventListener("click", clearPersonSelection);
elements.venueSelect.addEventListener("change", () => previewVenue(elements.venueSelect.value));

elements.venueForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.venueMutationPending) return;
  state.venueMutationPending = true;
  elements.venueSubmit.disabled = true;
  elements.venueSubmit.querySelector("span").textContent = "Relocating…";
  elements.venueFeedback.classList.remove("is-error");
  elements.venueFeedback.textContent = "Closing active sessions at the relocation instant…";
  try {
    const result = await fetchJson("/api/venue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: elements.venueSelect.value }),
    });
    elements.venueSelect.dataset.dirty = "false";
    mapZones.forEach((zone) => zone.classList.remove("is-preview"));
    elements.venueFeedback.textContent = `Scanner relocated to ${result.venue.venue_label}. ${result.closed_sessions} active session${result.closed_sessions === 1 ? "" : "s"} closed.`;
    await refresh();
  } catch (error) {
    elements.venueFeedback.classList.add("is-error");
    elements.venueFeedback.textContent = `Could not relocate scanner: ${error.message}`;
  } finally {
    state.venueMutationPending = false;
    elements.venueSubmit.querySelector("span").textContent = "Relocate scanner";
    elements.venueSubmit.disabled = elements.venueSelect.value === state.status?.venue.venue_id;
  }
});

setupMapInteractions();
refresh();
window.setInterval(refresh, 1000);
