(function () {
  const DEFAULT_BOX_SIZES = [32, 24, 16, 8, 4, 2, 1];

  const SHIP_PRESETS = [
    {
      id: "raft-classic",
      name: "ARGO RAFT (3x32)",
      slotCapacities: [32, 32, 32],
      maxBoxesPerSlot: 1,
      cargoModel: "Feste Containerhalterung",
      note: "Klassische RAFT-Konfiguration mit drei externen Containern. Gut fuer volle 32er, aber Restmengen werden schnell unhandlich."
    },
    {
      id: "raft-expanded",
      name: "ARGO RAFT (6x32)",
      slotCapacities: [32, 32, 32, 32, 32, 32],
      maxBoxesPerSlot: 1,
      cargoModel: "Erweiterte Containerhalterung",
      note: "Alternative Vorlage fuer Patches oder Loadouts, in denen die RAFT mehr als drei 32er Container aufnehmen soll."
    },
    {
      id: "cutlass-black",
      name: "Drake Cutlass Black",
      slotCapacities: [46],
      maxBoxesPerSlot: null,
      cargoModel: "Flexibles Frachtnetz",
      note: "Kleiner Hauler fuer gemischte Missionen und variable Boxenkombinationen."
    },
    {
      id: "hull-a",
      name: "MISC Hull A",
      slotCapacities: [64],
      maxBoxesPerSlot: null,
      cargoModel: "Flexibles Frachtnetz",
      note: "Praktisch fuer kleinere Frachtrouten mit klarer Trennung von Quelle und Ziel."
    },
    {
      id: "c1-spirit",
      name: "Crusader C1 Spirit",
      slotCapacities: [64],
      maxBoxesPerSlot: null,
      cargoModel: "Flexibles Frachtnetz",
      note: "Solider Allrounder mit genug Platz fuer haeufige Liefermissionen."
    },
    {
      id: "freelancer-max",
      name: "MISC Freelancer MAX",
      slotCapacities: [120],
      maxBoxesPerSlot: null,
      cargoModel: "Flexibles Frachtnetz",
      note: "Mittlere bis groessere Frachten lassen sich in einem einzelnen Laderaum effizient aufteilen."
    },
    {
      id: "constellation-taurus",
      name: "RSI Constellation Taurus",
      slotCapacities: [174],
      maxBoxesPerSlot: null,
      cargoModel: "Flexibles Frachtnetz",
      note: "Viel Raum fuer grosse Mengen und dadurch oft weniger Umlaeufe."
    }
  ];

  function getShipPresetById(presetId) {
    return SHIP_PRESETS.find((preset) => preset.id === presetId) ?? SHIP_PRESETS[0];
  }

  const DESCENDING = (left, right) => right - left;

  function sumValues(values) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  function normalizeBoxSizes(boxSizes) {
    return [...new Set(boxSizes.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))].sort(DESCENDING);
  }

  function normalizeShip(ship) {
    const slotCapacities = (ship.slotCapacities ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.trunc(value));

    if (!slotCapacities.length) {
      throw new Error("Mindestens ein gueltiger Slot mit Kapazitaet > 0 wird benoetigt.");
    }

    const rawLimit = ship.maxBoxesPerSlot;
    const maxBoxesPerSlot = rawLimit == null || rawLimit === ""
      ? Number.POSITIVE_INFINITY
      : Math.trunc(Number(rawLimit));

    if (!(maxBoxesPerSlot > 0 || maxBoxesPerSlot === Number.POSITIVE_INFINITY)) {
      throw new Error("Maximale Kisten pro Slot muss leer oder groesser als 0 sein.");
    }

    return {
      id: ship.id ?? "custom",
      name: ship.name?.trim() || "Benutzerdefiniertes Schiff",
      cargoModel: ship.cargoModel?.trim() || "Benutzerdefiniert",
      note: ship.note?.trim() || "",
      slotCapacities,
      maxBoxesPerSlot,
      totalCapacity: sumValues(slotCapacities)
    };
  }

  function describeSlotCapacities(slotCapacities) {
    return slotCapacities.map((capacity) => `${capacity} SCU`).join(" + ");
  }

  function countBoxes(boxes) {
    const counts = new Map();
    for (const size of boxes) {
      counts.set(size, (counts.get(size) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[0] - left[0])
      .map(([size, count]) => ({ size, count }));
  }

  function formatBoxSummary(input) {
    const groups = input.length && typeof input[0] === "number" ? countBoxes(input) : input;
    return groups.length
      ? groups.map(({ size, count }) => `${count}x ${size} SCU`).join(", ")
      : "keine Kisten";
  }

  function sortBoxes(boxes) {
    return [...boxes].sort(DESCENDING);
  }

  function compareNumberListsDescending(left, right) {
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = left[index] ?? Number.NEGATIVE_INFINITY;
      const rightValue = right[index] ?? Number.NEGATIVE_INFINITY;

      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }
    }

    return left.length - right.length;
  }

  function isBetterLoad(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    return compareNumberListsDescending(candidate.boxes, current.boxes) < 0;
  }

  function buildSlotPlans(capacity, boxSizes, maxBoxesPerSlot = Number.POSITIVE_INFINITY) {
    const sizes = normalizeBoxSizes(boxSizes).filter((size) => size <= capacity);
    const best = Array.from({ length: capacity + 1 }, () => null);
    best[0] = { total: 0, boxes: [], boxCount: 0 };

    for (let total = 1; total <= capacity; total += 1) {
      for (const size of sizes) {
        if (size > total) {
          continue;
        }

        const previous = best[total - size];
        if (!previous) {
          continue;
        }

        const boxCount = previous.boxCount + 1;
        if (boxCount > maxBoxesPerSlot) {
          continue;
        }

        const candidate = {
          total,
          boxes: sortBoxes([...previous.boxes, size]),
          boxCount
        };

        if (isBetterLoad(candidate, best[total])) {
          best[total] = candidate;
        }
      }
    }

    return best;
  }

  function cloneFlightPlan(plan) {
    return {
      total: plan.total,
      boxes: [...plan.boxes],
      boxCount: plan.boxCount,
      slotAssignments: plan.slotAssignments.map((slot) => ({
        slotIndex: slot.slotIndex,
        capacity: slot.capacity,
        used: slot.used,
        free: slot.free,
        boxes: [...slot.boxes]
      }))
    };
  }

  function compareSlotUsage(candidate, current) {
    const candidateUsage = candidate.slotAssignments.map((slot) => slot.used).sort(DESCENDING);
    const currentUsage = current.slotAssignments.map((slot) => slot.used).sort(DESCENDING);
    return compareNumberListsDescending(candidateUsage, currentUsage);
  }

  function isBetterFlightPlan(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    const boxComparison = compareNumberListsDescending(candidate.boxes, current.boxes);
    if (boxComparison !== 0) {
      return boxComparison < 0;
    }

    return compareSlotUsage(candidate, current) < 0;
  }

  function buildFlightPlans(ship, boxSizes) {
    const normalizedShip = normalizeShip(ship);
    let states = new Map([
      [0, { total: 0, boxes: [], boxCount: 0, slotAssignments: [] }]
    ]);

    normalizedShip.slotCapacities.forEach((capacity, index) => {
      const slotPlans = buildSlotPlans(capacity, boxSizes, normalizedShip.maxBoxesPerSlot);
      const nextStates = new Map();

      for (const state of states.values()) {
        for (let fill = 0; fill <= capacity; fill += 1) {
          const slotPlan = slotPlans[fill];
          if (!slotPlan) {
            continue;
          }

          const total = state.total + fill;
          const candidate = {
            total,
            boxes: sortBoxes([...state.boxes, ...slotPlan.boxes]),
            boxCount: state.boxCount + slotPlan.boxCount,
            slotAssignments: [
              ...state.slotAssignments,
              {
                slotIndex: index + 1,
                capacity,
                used: fill,
                free: capacity - fill,
                boxes: [...slotPlan.boxes]
              }
            ]
          };

          const current = nextStates.get(total);
          if (isBetterFlightPlan(candidate, current)) {
            nextStates.set(total, candidate);
          }
        }
      }

      states = nextStates;
    });

    return states;
  }

  function pickBestAtLeast(bestStates, targetSCU) {
    let chosenTotal = null;

    for (let total = targetSCU; total < bestStates.length; total += 1) {
      const state = bestStates[total];
      if (!state) {
        continue;
      }

      if (
        chosenTotal == null ||
        state.flights < bestStates[chosenTotal].flights ||
        (state.flights === bestStates[chosenTotal].flights && total < chosenTotal)
      ) {
        chosenTotal = total;
      }
    }

    return chosenTotal;
  }

  function isBetterMissionState(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.flights !== current.flights) {
      return candidate.flights < current.flights;
    }

    return candidate.flightTotal > current.flightTotal;
  }

  function planMission({ ship, boxSizes, targetSCU, mode = "exact" }) {
    const normalizedTarget = Math.trunc(Number(targetSCU));
    if (!(normalizedTarget > 0)) {
      throw new Error("Die Missionsmenge muss groesser als 0 SCU sein.");
    }

    const normalizedShip = normalizeShip(ship);
    const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
    if (!normalizedBoxSizes.length) {
      throw new Error("Mindestens eine Kistengroesse muss aktiviert sein.");
    }

    const flightPlans = buildFlightPlans(normalizedShip, normalizedBoxSizes);
    const feasibleTotals = [...flightPlans.keys()].filter((total) => total > 0).sort(DESCENDING);

    if (!feasibleTotals.length) {
      return {
        reachable: false,
        mode,
        ship: normalizedShip,
        boxSizes: normalizedBoxSizes,
        targetSCU: normalizedTarget
      };
    }

    const maxFlightTotal = feasibleTotals[0];
    const limit = mode === "exact" ? normalizedTarget : normalizedTarget + maxFlightTotal;
    const bestStates = Array.from({ length: limit + 1 }, () => null);
    bestStates[0] = {
      flights: 0,
      prevTotal: null,
      flightTotal: 0
    };

    for (let currentTotal = 0; currentTotal <= limit; currentTotal += 1) {
      const state = bestStates[currentTotal];
      if (!state) {
        continue;
      }

      for (const flightTotal of feasibleTotals) {
        const nextTotal = currentTotal + flightTotal;
        if (nextTotal > limit) {
          continue;
        }

        const candidate = {
          flights: state.flights + 1,
          prevTotal: currentTotal,
          flightTotal
        };

        if (isBetterMissionState(candidate, bestStates[nextTotal])) {
          bestStates[nextTotal] = candidate;
        }
      }
    }

    const deliveredTarget = mode === "exact" ? normalizedTarget : pickBestAtLeast(bestStates, normalizedTarget);
    if (deliveredTarget == null || !bestStates[deliveredTarget]) {
      return {
        reachable: false,
        mode,
        ship: normalizedShip,
        boxSizes: normalizedBoxSizes,
        targetSCU: normalizedTarget
      };
    }

    const flightTotals = [];
    let cursor = deliveredTarget;

    while (cursor > 0) {
      const state = bestStates[cursor];
      flightTotals.push(state.flightTotal);
      cursor = state.prevTotal;
    }

    flightTotals.sort(DESCENDING);
    const flights = flightTotals.map((flightTotal, index) => ({
      number: index + 1,
      ...cloneFlightPlan(flightPlans.get(flightTotal))
    }));

    const deliveredSCU = sumValues(flightTotals);
    const aggregateBoxes = countBoxes(flights.flatMap((flight) => flight.boxes));

    return {
      reachable: true,
      exact: deliveredSCU === normalizedTarget,
      mode,
      ship: normalizedShip,
      boxSizes: normalizedBoxSizes,
      targetSCU: normalizedTarget,
      deliveredSCU,
      overfillSCU: Math.max(0, deliveredSCU - normalizedTarget),
      missingSCU: Math.max(0, normalizedTarget - deliveredSCU),
      flightsRequired: flights.length,
      feasibleTotals,
      flights,
      aggregateBoxes
    };
  }

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
}());
