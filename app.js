import { DEFAULT_BOX_SIZES, SHIP_PRESETS, getShipPresetById } from "./data/ships.js";
import {
  describeSlotCapacities,
  formatBoxSummary,
  normalizeShip,
  planMission
} from "./lib/planner.js";

const STORAGE_KEY = "scu-laderaum-planer:v1";
const formatter = new Intl.NumberFormat("de-DE");

const form = document.querySelector("#planner-form");
const presetSelect = document.querySelector("#ship-preset");
const shipNameInput = document.querySelector("#ship-name");
const slotCapacitiesInput = document.querySelector("#slot-capacities");
const maxBoxesInput = document.querySelector("#max-boxes-per-slot");
const cargoModelBadge = document.querySelector("#cargo-model");
const shipHint = document.querySelector("#ship-hint");
const boxSizeContainer = document.querySelector("#box-size-grid");
const resultSummary = document.querySelector("#result-summary");
const resultFlights = document.querySelector("#result-flights");
const resultAlternative = document.querySelector("#result-alternative");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatInteger(value) {
  return formatter.format(Math.trunc(value));
}

function formatRoute(source, destination) {
  const from = source?.trim() || "Start offen";
  const to = destination?.trim() || "Ziel offen";
  return `${from} -> ${to}`;
}

function populatePresetOptions() {
  presetSelect.innerHTML = SHIP_PRESETS
    .map((preset) => `<option value="${preset.id}">${preset.name}</option>`)
    .join("");
}

function renderBoxSizes(selectedSizes) {
  boxSizeContainer.innerHTML = DEFAULT_BOX_SIZES
    .map((size) => {
      const checked = selectedSizes.includes(size) ? "checked" : "";
      return `
        <label class="box-toggle">
          <input type="checkbox" name="box-size" value="${size}" ${checked}>
          <span>${size} SCU</span>
        </label>
      `;
    })
    .join("");
}

function applyPreset(presetId, keepRoute = true) {
  const preset = getShipPresetById(presetId);
  const routeValues = keepRoute ? {
    source: form.elements.source.value,
    destination: form.elements.destination.value,
    targetSCU: form.elements.targetSCU.value
  } : null;

  presetSelect.value = preset.id;
  shipNameInput.value = preset.name;
  slotCapacitiesInput.value = preset.slotCapacities.join(", ");
  maxBoxesInput.value = preset.maxBoxesPerSlot == null ? "" : String(preset.maxBoxesPerSlot);
  shipHint.dataset.baseNote = preset.note;
  cargoModelBadge.textContent = preset.cargoModel;
  shipHint.textContent = preset.note;

  if (routeValues) {
    form.elements.source.value = routeValues.source;
    form.elements.destination.value = routeValues.destination;
    form.elements.targetSCU.value = routeValues.targetSCU;
  }
}

function parseSlotCapacities(input) {
  return input
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getSelectedBoxSizes() {
  return [...form.querySelectorAll('input[name="box-size"]:checked')]
    .map((checkbox) => Number(checkbox.value))
    .filter((value) => Number.isFinite(value));
}

function collectMissionInput() {
  const selectedPreset = getShipPresetById(presetSelect.value);
  return {
    presetId: selectedPreset.id,
    ship: {
      id: selectedPreset.id,
      name: shipNameInput.value,
      cargoModel: cargoModelBadge.textContent,
      note: shipHint.dataset.baseNote ?? selectedPreset.note,
      slotCapacities: parseSlotCapacities(slotCapacitiesInput.value),
      maxBoxesPerSlot: maxBoxesInput.value.trim() === "" ? null : Number.parseInt(maxBoxesInput.value, 10)
    },
    mission: {
      source: form.elements.source.value.trim(),
      destination: form.elements.destination.value.trim(),
      targetSCU: Number.parseInt(form.elements.targetSCU.value, 10),
      mode: form.elements.deliveryMode.value
    },
    boxSizes: getSelectedBoxSizes()
  };
}

function saveState(snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function describeMaxBoxes(limit) {
  return limit === Number.POSITIVE_INFINITY ? "beliebig viele" : String(limit);
}

function renderShipMeta(ship) {
  cargoModelBadge.textContent = ship.cargoModel;
  const baseNote = shipHint.dataset.baseNote?.trim() || ship.note;
  const details = `Slots: ${describeSlotCapacities(ship.slotCapacities)}. Max. Kisten je Slot: ${describeMaxBoxes(ship.maxBoxesPerSlot)}.`;
  shipHint.textContent = baseNote ? `${baseNote} ${details}` : details;
}

function renderError(message) {
  resultSummary.innerHTML = `
    <article class="result-card result-card--alert">
      <h2>Berechnung blockiert</h2>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
  resultFlights.innerHTML = "";
  resultAlternative.innerHTML = "";
}

function renderFlightCard(flight) {
  const slotList = flight.slotAssignments
    .map((slot) => `
      <li>
        <strong>Slot ${slot.slotIndex}</strong>
        <span>${formatInteger(slot.used)} / ${formatInteger(slot.capacity)} SCU</span>
        <span>${slot.used > 0 ? formatBoxSummary(slot.boxes) : "leer"}</span>
      </li>
    `)
    .join("");

  return `
    <article class="flight-card">
      <header>
        <p class="flight-index">Flug ${flight.number}</p>
        <h3>${formatInteger(flight.total)} SCU</h3>
      </header>
      <p class="flight-boxes">${formatBoxSummary(flight.boxes)}</p>
      <ul class="slot-list">${slotList}</ul>
    </article>
  `;
}

function renderPlan(plan, mission, leadText) {
  const route = formatRoute(mission.source, mission.destination);
  const overfillLabel = plan.overfillSCU > 0 ? `+${formatInteger(plan.overfillSCU)} SCU Ueberlieferung` : "keine Ueberlieferung";

  resultSummary.innerHTML = `
    <article class="result-card">
      <div class="mission-strip">
        <span class="route-pill">${escapeHtml(route)}</span>
        <span class="route-pill route-pill--accent">${escapeHtml(plan.ship.name)}</span>
      </div>
      <h2>${escapeHtml(leadText)}</h2>
      <p>${plan.mode === "exact" ? "Exakte Lieferung" : "Lieferung mindestens"} fuer ${formatInteger(plan.targetSCU)} SCU.</p>
      <div class="metric-grid">
        <div>
          <span>Fluege</span>
          <strong>${formatInteger(plan.flightsRequired)}</strong>
        </div>
        <div>
          <span>Geliefert</span>
          <strong>${formatInteger(plan.deliveredSCU)} SCU</strong>
        </div>
        <div>
          <span>Slots</span>
          <strong>${escapeHtml(describeSlotCapacities(plan.ship.slotCapacities))}</strong>
        </div>
        <div>
          <span>Delta</span>
          <strong>${escapeHtml(overfillLabel)}</strong>
        </div>
      </div>
      <p class="aggregate-boxes">Gesamt laden: ${escapeHtml(formatBoxSummary(plan.aggregateBoxes))}</p>
    </article>
  `;

  resultFlights.innerHTML = plan.flights.map(renderFlightCard).join("");
}

function renderAlternativePlan(plan) {
  if (!plan?.reachable) {
    resultAlternative.innerHTML = "";
    return;
  }

  resultAlternative.innerHTML = `
    <article class="result-card result-card--warning">
      <h2>Naechste sinnvolle Alternative</h2>
      <p>Mit den aktiven Boxengroessen ist nur eine Mindestlieferung moeglich.</p>
      <p>${formatInteger(plan.flightsRequired)} Flug/Fluege, ${formatInteger(plan.deliveredSCU)} SCU geliefert, ${formatInteger(plan.overfillSCU)} SCU Ueberlieferung.</p>
      <p>Beispiel-Loadout: ${escapeHtml(formatBoxSummary(plan.aggregateBoxes))}</p>
    </article>
  `;
}

function calculateAndRender() {
  try {
    const snapshot = collectMissionInput();
    const normalizedShip = normalizeShip(snapshot.ship);
    renderShipMeta(normalizedShip);

    if (!(snapshot.mission.targetSCU > 0)) {
      throw new Error("Bitte eine Missionsmenge groesser als 0 SCU eintragen.");
    }

    if (!snapshot.boxSizes.length) {
      throw new Error("Bitte mindestens eine Kistengroesse aktivieren.");
    }

    const plan = planMission({
      ship: normalizedShip,
      boxSizes: snapshot.boxSizes,
      targetSCU: snapshot.mission.targetSCU,
      mode: snapshot.mission.mode
    });

    if (plan.reachable) {
      renderPlan(plan, snapshot.mission, snapshot.mission.mode === "exact" ? "Exakter Ladeplan" : "Effizientester Missionsplan");
      resultAlternative.innerHTML = "";
    } else if (snapshot.mission.mode === "exact") {
      const alternativePlan = planMission({
        ship: normalizedShip,
        boxSizes: snapshot.boxSizes,
        targetSCU: snapshot.mission.targetSCU,
        mode: "atLeast"
      });
      renderError("Exakte Lieferung mit diesem Schiff, den Slots und den aktiven Kistengroessen nicht moeglich.");
      renderAlternativePlan(alternativePlan);
    } else {
      renderError("Mit den gewaehlten Einstellungen konnte kein gueltiger Flugplan erzeugt werden.");
    }

    saveState({
      presetId: snapshot.presetId,
      shipName: shipNameInput.value,
      slotCapacities: slotCapacitiesInput.value,
      maxBoxesPerSlot: maxBoxesInput.value,
      source: snapshot.mission.source,
      destination: snapshot.mission.destination,
      targetSCU: String(snapshot.mission.targetSCU),
      deliveryMode: snapshot.mission.mode,
      boxSizes: snapshot.boxSizes
    });
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Unbekannter Fehler bei der Berechnung.");
  }
}

function hydrateFromSavedState() {
  const saved = loadState();
  if (!saved) {
    applyPreset(SHIP_PRESETS[0].id, false);
    form.elements.source.value = "Port Tressler";
    form.elements.destination.value = "Area18";
    form.elements.targetSCU.value = "93";
    form.elements.deliveryMode.value = "exact";
    renderBoxSizes(DEFAULT_BOX_SIZES);
    return;
  }

  renderBoxSizes(saved.boxSizes?.length ? saved.boxSizes : DEFAULT_BOX_SIZES);
  applyPreset(saved.presetId ?? SHIP_PRESETS[0].id, false);

  shipNameInput.value = saved.shipName ?? shipNameInput.value;
  slotCapacitiesInput.value = saved.slotCapacities ?? slotCapacitiesInput.value;
  maxBoxesInput.value = saved.maxBoxesPerSlot ?? maxBoxesInput.value;
  form.elements.source.value = saved.source ?? "";
  form.elements.destination.value = saved.destination ?? "";
  form.elements.targetSCU.value = saved.targetSCU ?? "93";
  form.elements.deliveryMode.value = saved.deliveryMode ?? "exact";
}

populatePresetOptions();
hydrateFromSavedState();
calculateAndRender();

presetSelect.addEventListener("change", () => {
  applyPreset(presetSelect.value);
  calculateAndRender();
});

document.querySelector("#reset-preset").addEventListener("click", () => {
  applyPreset(presetSelect.value);
  calculateAndRender();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateAndRender();
});

form.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    calculateAndRender();
  }
});

form.addEventListener("change", () => {
  calculateAndRender();
});
