(function () {
  const DEFAULT_BOX_SIZES = [32, 24, 16, 8, 4, 2, 1];
  const STORAGE_KEY = "scu-laderaum-planer:v3";
  const DESCENDING = (left, right) => right - left;
  const ASCENDING = (left, right) => left - right;
  const formatter = new Intl.NumberFormat("de-DE");

  const SHIP_PRESETS = [
    {
      id: "raft-mission-6x32",
      name: "ARGO RAFT (6x32 Missionscargo)",
      slotCapacities: [32, 32, 32, 32, 32, 32],
      maxBoxesPerSlot: null,
      cargoModel: "6 flexible 32-SCU-Slots",
      note: "Praktischer RAFT-Preset fuer Frachtmissionen, bei denen maximal 16-SCU-Kisten aus dem Aufzug kommen."
    },
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

  function compareNumberListsAscending(left, right) {
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = left[index] ?? Number.POSITIVE_INFINITY;
      const rightValue = right[index] ?? Number.POSITIVE_INFINITY;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
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

  function normalizeMissionEntry(mission, index) {
    const totalSCU = Math.trunc(Number(mission.totalSCU ?? mission.targetSCU ?? mission.amountSCU));
    const deliveredSCU = Math.max(0, Math.trunc(Number(mission.deliveredSCU ?? 0)));

    if (!(totalSCU > 0)) {
      throw new Error(`Auftrag ${index + 1} braucht eine Gesamtmenge groesser als 0 SCU.`);
    }

    if (deliveredSCU > totalSCU) {
      throw new Error(`Auftrag ${index + 1} hat mehr geliefert als insgesamt benoetigt.`);
    }

    return {
      id: mission.id ?? `mission-${index + 1}`,
      label: mission.label?.trim() || `Auftrag ${index + 1}`,
      cargo: mission.cargo?.trim() || "",
      source: mission.source?.trim() || "",
      destination: mission.destination?.trim() || `Ziel ${index + 1}`,
      totalSCU,
      deliveredSCU,
      remainingSCU: totalSCU - deliveredSCU
    };
  }

  function normalizeMissionEntries(missions) {
    const normalized = missions.map(normalizeMissionEntry);
    const activeMissions = normalized.filter((mission) => mission.remainingSCU > 0);
    const completedMissions = normalized.filter((mission) => mission.remainingSCU === 0);

    return {
      missions: normalized,
      activeMissions,
      completedMissions,
      totalSCU: sumValues(normalized.map((mission) => mission.totalSCU)),
      deliveredSCU: sumValues(normalized.map((mission) => mission.deliveredSCU)),
      remainingSCU: sumValues(normalized.map((mission) => mission.remainingSCU))
    };
  }

  function countBits(mask) {
    let value = mask;
    let count = 0;

    while (value > 0) {
      count += value & 1;
      value >>= 1;
    }

    return count;
  }

  function buildSortedProfile(profile, value, sorter = DESCENDING) {
    return [...profile, value].sort(sorter);
  }

  function isBetterManifestState(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.flights !== current.flights) {
      return candidate.flights < current.flights;
    }

    const loadComparison = compareNumberListsDescending(candidate.loadProfile, current.loadProfile);
    if (loadComparison !== 0) {
      return loadComparison < 0;
    }

    return compareNumberListsAscending(candidate.stopProfile, current.stopProfile) < 0;
  }

  function planMissionManifest({ ship, boxSizes, missions }) {
    const normalizedShip = normalizeShip(ship);
    const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
    if (!normalizedBoxSizes.length) {
      throw new Error("Mindestens eine Kistengroesse muss aktiviert sein.");
    }

    const manifest = normalizeMissionEntries(missions);
    const activeMissions = manifest.activeMissions;

    if (!activeMissions.length) {
      return {
        reachable: true,
        ship: normalizedShip,
        boxSizes: normalizedBoxSizes,
        ...manifest,
        flightsRequired: 0,
        flights: [],
        aggregateBoxes: []
      };
    }

    const dedicatedFlights = [];
    const packableMissions = [];
    const blockingMissions = [];

    for (const mission of activeMissions) {
      const exactPlan = planMission({
        ship: normalizedShip,
        boxSizes: normalizedBoxSizes,
        targetSCU: mission.remainingSCU,
        mode: "exact"
      });

      if (!exactPlan.reachable) {
        blockingMissions.push(mission);
        continue;
      }

      if (exactPlan.flightsRequired === 1) {
        packableMissions.push(mission);
        continue;
      }

      const stagedFlights = exactPlan.flights;

      for (const stagedFlight of stagedFlights.slice(0, -1)) {
        dedicatedFlights.push({
          totalSCU: stagedFlight.total,
          plan: stagedFlight,
          missions: [
            {
              ...mission,
              remainingSCU: stagedFlight.total
            }
          ],
          stops: 1
        });
      }

      const finalRemainder = stagedFlights[stagedFlights.length - 1];
      packableMissions.push({
        ...mission,
        remainingSCU: finalRemainder.total
      });
    }

    if (blockingMissions.length) {
      return {
        reachable: false,
        ship: normalizedShip,
        boxSizes: normalizedBoxSizes,
        ...manifest,
        reason: "single-mission-unreachable",
        blockingMissions
      };
    }

    let selectedFlights = [];

    if (packableMissions.length) {
      if (packableMissions.length > 15) {
        throw new Error("Maximal 15 kombinierbare Restauftraege gleichzeitig unterstuetzt.");
      }

      const subsetPlans = new Map();
      const singleMissionIssues = [];
      const fullMask = (1 << packableMissions.length) - 1;

      for (let mask = 1; mask <= fullMask; mask += 1) {
        const subsetMissions = [];
        let totalSCU = 0;

        for (let index = 0; index < packableMissions.length; index += 1) {
          if ((mask & (1 << index)) === 0) {
            continue;
          }

          subsetMissions.push(packableMissions[index]);
          totalSCU += packableMissions[index].remainingSCU;
        }

        const exactPlan = planMission({
          ship: normalizedShip,
          boxSizes: normalizedBoxSizes,
          targetSCU: totalSCU,
          mode: "exact"
        });

        if (!exactPlan.reachable || exactPlan.flightsRequired !== 1) {
          if (countBits(mask) === 1) {
            singleMissionIssues.push(subsetMissions[0]);
          }
          continue;
        }

        subsetPlans.set(mask, {
          totalSCU,
          plan: exactPlan.flights[0],
          missions: subsetMissions,
          stops: subsetMissions.length
        });
      }

      if (singleMissionIssues.length) {
        return {
          reachable: false,
          ship: normalizedShip,
          boxSizes: normalizedBoxSizes,
          ...manifest,
          reason: "single-mission-unreachable",
          blockingMissions: singleMissionIssues
        };
      }

      const validMasks = [...subsetPlans.keys()];
      const bestStates = Array.from({ length: fullMask + 1 }, () => null);
      bestStates[0] = {
        flights: 0,
        prevMask: null,
        subsetMask: 0,
        loadProfile: [],
        stopProfile: []
      };

      for (let mask = 0; mask <= fullMask; mask += 1) {
        const current = bestStates[mask];
        if (!current) {
          continue;
        }

        for (const subsetMask of validMasks) {
          if ((mask & subsetMask) !== 0) {
            continue;
          }

          const nextMask = mask | subsetMask;
          const subset = subsetPlans.get(subsetMask);
          const candidate = {
            flights: current.flights + 1,
            prevMask: mask,
            subsetMask,
            loadProfile: buildSortedProfile(current.loadProfile, subset.totalSCU),
            stopProfile: buildSortedProfile(current.stopProfile, subset.stops, ASCENDING)
          };

          if (isBetterManifestState(candidate, bestStates[nextMask])) {
            bestStates[nextMask] = candidate;
          }
        }
      }

      const finalState = bestStates[fullMask];
      if (!finalState) {
        return {
          reachable: false,
          ship: normalizedShip,
          boxSizes: normalizedBoxSizes,
          ...manifest,
          reason: "manifest-unreachable"
        };
      }

      let cursorMask = fullMask;

      while (cursorMask > 0) {
        const state = bestStates[cursorMask];
        selectedFlights.push(subsetPlans.get(state.subsetMask));
        cursorMask = state.prevMask;
      }
    }

    selectedFlights = [...dedicatedFlights, ...selectedFlights];
    selectedFlights.sort((left, right) => right.totalSCU - left.totalSCU);
    const flights = selectedFlights.map((flight, index) => ({
      number: index + 1,
      total: flight.plan.total,
      boxes: [...flight.plan.boxes],
      boxCount: flight.plan.boxCount,
      slotAssignments: flight.plan.slotAssignments.map((slot) => ({
        slotIndex: slot.slotIndex,
        capacity: slot.capacity,
        used: slot.used,
        free: slot.free,
        boxes: [...slot.boxes]
      })),
      missions: flight.missions.map((mission) => ({
        id: mission.id,
        label: mission.label,
        cargo: mission.cargo,
        source: mission.source,
        destination: mission.destination,
        remainingSCU: mission.remainingSCU
      }))
    }));

    return {
      reachable: true,
      ship: normalizedShip,
      boxSizes: normalizedBoxSizes,
      ...manifest,
      flightsRequired: flights.length,
      flights,
      aggregateBoxes: countBoxes(flights.flatMap((flight) => flight.boxes))
    };
  }

  const QUARTZ_EXAMPLE = {
    presetId: "raft-mission-6x32",
    shipName: "ARGO RAFT (6x32 Missionscargo)",
    slotCapacities: "32, 32, 32, 32, 32, 32",
    maxBoxesPerSlot: "",
    source: "MIC-L1 Shallow Frontier Station",
    cargoName: "Quartz",
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { id: "mission-1", cargoName: "Quartz", destination: "Everus Harbor oberhalb von Hurston", totalSCU: 124, deliveredSCU: 0 },
      { id: "mission-2", cargoName: "Quartz", destination: "Seraphim-Station oberhalb von Crusader", totalSCU: 93, deliveredSCU: 0 },
      { id: "mission-3", cargoName: "Quartz", destination: "Baijini-Point oberhalb von ArcCorp", totalSCU: 84, deliveredSCU: 0 }
    ]
  };

  const MIXED_CARGO_EXAMPLE = {
    presetId: "raft-mission-6x32",
    shipName: "ARGO RAFT (6x32 Missionscargo)",
    slotCapacities: "32, 32, 32, 32, 32, 32",
    maxBoxesPerSlot: "",
    source: "Everus Harbor oberhalb von Hurston",
    cargoName: "",
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { id: "mission-1", cargoName: "Hydrogen Fuel", destination: "Melodic Fields-Station am L4-Lagrangepunkt von Hurston", totalSCU: 60, deliveredSCU: 0 },
      { id: "mission-2", cargoName: "Quantum Fuel", destination: "High Course-Station am L5-Lagrangepunkt von Hurston", totalSCU: 136, deliveredSCU: 0 },
      { id: "mission-3", cargoName: "Ship Ammunition", destination: "Thundering Express-Station am L3-Lagrangepunkt von Hurston", totalSCU: 137, deliveredSCU: 0 },
      { id: "mission-4", cargoName: "Hydrogen Fuel", destination: "Green Glade-Station am L1-Lagrangepunkt von Hurston", totalSCU: 70, deliveredSCU: 0 }
    ]
  };

  const form = document.querySelector("#planner-form");
  const presetSelect = document.querySelector("#ship-preset");
  const shipNameInput = document.querySelector("#ship-name");
  const slotCapacitiesInput = document.querySelector("#slot-capacities");
  const maxBoxesInput = document.querySelector("#max-boxes-per-slot");
  const cargoModelBadge = document.querySelector("#cargo-model");
  const shipHint = document.querySelector("#ship-hint");
  const missionList = document.querySelector("#mission-list");
  const boxSizeContainer = document.querySelector("#box-size-grid");
  const resultSummary = document.querySelector("#result-summary");
  const resultFlights = document.querySelector("#result-flights");
  const resultAlternative = document.querySelector("#result-alternative");
  const shareStatus = document.querySelector("#share-status");
  let lastRenderedPlan = null;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatInteger(value) {
    return formatter.format(Math.trunc(value));
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

  function createMissionDraft(row = {}) {
    return {
      id: row.id ?? `mission-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      cargoName: row.cargoName ?? "",
      destination: row.destination ?? "",
      totalSCU: row.totalSCU ?? "",
      deliveredSCU: row.deliveredSCU ?? 0
    };
  }

  function renderMissionRows(rows) {
    missionList.innerHTML = rows
      .map((row, index) => {
        const totalSCU = Number(row.totalSCU) || 0;
        const deliveredSCU = Number(row.deliveredSCU) || 0;
        const remainingSCU = Math.max(0, totalSCU - deliveredSCU);

        return `
          <article class="mission-row" data-mission-id="${escapeHtml(row.id)}">
            <div class="mission-row__grid">
              <label>
                <span>Ziel ${index + 1}</span>
                <input type="text" name="mission-destination" value="${escapeHtml(row.destination)}" placeholder="z. B. Seraphim-Station">
              </label>
              <label>
                <span>Ladung</span>
                <input type="text" name="mission-cargo" value="${escapeHtml(row.cargoName)}" placeholder="z. B. Quantum Fuel">
              </label>
              <label>
                <span>Gesamt-SCU</span>
                <input type="number" name="mission-total" min="0" step="1" value="${escapeHtml(row.totalSCU)}" placeholder="93">
              </label>
              <label>
                <span>Geliefert</span>
                <input type="number" name="mission-delivered" min="0" step="1" value="${escapeHtml(row.deliveredSCU)}" placeholder="0">
              </label>
              <div class="mission-row__meta">
                <span>Offen</span>
                <strong data-role="remaining">${formatInteger(remainingSCU)} SCU</strong>
              </div>
            </div>
            <div class="mission-row__actions">
              <button type="button" class="button button--ghost mission-row__remove" data-action="remove-mission">Entfernen</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function readMissionRowsFromDom() {
    return [...missionList.querySelectorAll(".mission-row")].map((row) => ({
      id: row.dataset.missionId,
      cargoName: row.querySelector('input[name="mission-cargo"]').value.trim(),
      destination: row.querySelector('input[name="mission-destination"]').value.trim(),
      totalSCU: row.querySelector('input[name="mission-total"]').value,
      deliveredSCU: row.querySelector('input[name="mission-delivered"]').value
    }));
  }

  function updateMissionRowMeta(rowElement) {
    const totalInput = rowElement.querySelector('input[name="mission-total"]');
    const deliveredInput = rowElement.querySelector('input[name="mission-delivered"]');
    const remainingElement = rowElement.querySelector('[data-role="remaining"]');
    const totalSCU = Math.max(0, Number.parseInt(totalInput.value || "0", 10) || 0);
    const deliveredSCU = Math.max(0, Number.parseInt(deliveredInput.value || "0", 10) || 0);
    const remainingSCU = Math.max(0, totalSCU - deliveredSCU);
    remainingElement.textContent = `${formatInteger(remainingSCU)} SCU`;
  }

  function applyPreset(presetId, keepMissionData = true) {
    const preset = getShipPresetById(presetId);
    const savedMissionData = keepMissionData ? {
      source: form.elements.source.value,
      cargoName: form.elements.cargoName.value
    } : null;

    presetSelect.value = preset.id;
    shipNameInput.value = preset.name;
    slotCapacitiesInput.value = preset.slotCapacities.join(", ");
    maxBoxesInput.value = preset.maxBoxesPerSlot == null ? "" : String(preset.maxBoxesPerSlot);
    shipHint.dataset.baseNote = preset.note;
    cargoModelBadge.textContent = preset.cargoModel;
    shipHint.textContent = preset.note;

    if (savedMissionData) {
      form.elements.source.value = savedMissionData.source;
      form.elements.cargoName.value = savedMissionData.cargoName;
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
    const source = form.elements.source.value.trim();
    const cargoName = form.elements.cargoName.value.trim();
    const missionRows = readMissionRowsFromDom();

    const missions = missionRows
      .filter((row) => row.destination || row.cargoName || row.totalSCU || row.deliveredSCU)
      .map((row, index) => ({
        id: row.id,
        label: row.destination || `Auftrag ${index + 1}`,
        source,
        destination: row.destination,
        cargo: row.cargoName || cargoName,
        totalSCU: Number.parseInt(row.totalSCU, 10),
        deliveredSCU: Number.parseInt(row.deliveredSCU || "0", 10) || 0
      }));

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
      cargoName,
      source,
      missions,
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

  function sanitizeShareState(state) {
    return {
      presetId: state?.presetId ?? "",
      shipName: state?.shipName ?? "",
      slotCapacities: state?.slotCapacities ?? "",
      maxBoxesPerSlot: state?.maxBoxesPerSlot ?? "",
      source: state?.source ?? "",
      cargoName: state?.cargoName ?? "",
      boxSizes: Array.isArray(state?.boxSizes) ? state.boxSizes : [],
      missions: Array.isArray(state?.missions)
        ? state.missions.map((mission) => ({
          id: mission?.id ?? "",
          cargoName: mission?.cargoName ?? "",
          destination: mission?.destination ?? "",
          totalSCU: mission?.totalSCU ?? "",
          deliveredSCU: mission?.deliveredSCU ?? 0
        }))
        : []
    };
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  }

  function decodeBase64Url(value) {
    const base64 = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeShareState(state) {
    return encodeBase64Url(JSON.stringify({
      version: 1,
      state: sanitizeShareState(state)
    }));
  }

  function decodeShareState(encoded) {
    try {
      const payload = JSON.parse(decodeBase64Url(encoded));
      if (payload?.version !== 1 || typeof payload?.state !== "object" || !payload.state) {
        return null;
      }

      return sanitizeShareState(payload.state);
    } catch {
      return null;
    }
  }

  function buildShareUrl(baseUrl, state) {
    const url = new URL(baseUrl);
    url.hash = `share=${encodeShareState(state)}`;
    return url.toString();
  }

  function readShareStateFromCurrentUrl() {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const encoded = params.get("share");
    return encoded ? decodeShareState(encoded) : null;
  }

  function setShareStatus(message) {
    shareStatus.textContent = message;
  }

  function applyFlightDeliveryToRows(missionRows, flightMissions) {
    const increments = new Map();

    for (const flightMission of flightMissions) {
      const missionId = flightMission?.id;
      const amount = Math.max(0, Math.trunc(Number(flightMission?.remainingSCU ?? 0)));

      if (!missionId || amount <= 0) {
        continue;
      }

      increments.set(missionId, (increments.get(missionId) ?? 0) + amount);
    }

    return missionRows.map((row) => {
      const totalSCU = Math.max(0, Number.parseInt(row.totalSCU || "0", 10) || 0);
      const deliveredSCU = Math.max(0, Number.parseInt(row.deliveredSCU || "0", 10) || 0);
      const increment = increments.get(row.id) ?? 0;

      return {
        ...row,
        deliveredSCU: Math.min(totalSCU, deliveredSCU + increment)
      };
    });
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

  function renderError(message, details = "") {
    lastRenderedPlan = null;
    resultSummary.innerHTML = `
      <article class="result-card result-card--alert">
        <h2>Berechnung blockiert</h2>
        <p>${escapeHtml(message)}</p>
        ${details ? `<p>${escapeHtml(details)}</p>` : ""}
      </article>
    `;
    resultFlights.innerHTML = "";
  }

  function renderCompletedMissions(manifest, source, cargoName) {
    const sections = [];

    if (manifest.completedMissions.length) {
      sections.push(`
        <article class="result-card">
          <h2>Bereits erledigt</h2>
          <ul class="manifest-list">
            ${manifest.completedMissions.map((mission) => `
              <li>
                <strong>${escapeHtml(mission.destination)}</strong>
                <span>${formatInteger(mission.totalSCU)} SCU abgeschlossen</span>
                <span>${escapeHtml(mission.cargo || cargoName || "Fracht")} von ${escapeHtml(source || mission.source || "Pickup offen")}</span>
              </li>
            `).join("")}
          </ul>
        </article>
      `);
    }

    sections.push(`
      <article class="result-card">
        <h2>Aktive Kisten</h2>
        <p>${escapeHtml(manifest.boxSizes.map((size) => `${size} SCU`).join(", "))}</p>
      </article>
    `);

    resultAlternative.innerHTML = sections.join("");
  }

  function summarizeCargoTypes(missions, fallbackCargo = "") {
    const cargoTypes = [...new Set(
      missions
        .map((mission) => mission.cargo?.trim())
        .filter(Boolean)
    )];

    if (!cargoTypes.length) {
      return fallbackCargo || "Fracht";
    }

    if (cargoTypes.length <= 3) {
      return cargoTypes.join(", ");
    }

    return `${cargoTypes.length} Frachttypen`;
  }

  function renderFlightCard(flight, cargoName, source) {
    const slotList = flight.slotAssignments
      .map((slot) => `
        <li>
          <strong>Slot ${slot.slotIndex}</strong>
          <span>${formatInteger(slot.used)} / ${formatInteger(slot.capacity)} SCU</span>
          <span>${slot.used > 0 ? formatBoxSummary(slot.boxes) : "leer"}</span>
        </li>
      `)
      .join("");

    const missionListMarkup = flight.missions
      .map((mission) => `
        <li>
          <strong>${escapeHtml(mission.destination)}</strong>
          <span>${formatInteger(mission.remainingSCU)} SCU</span>
          <span>${escapeHtml(mission.cargo || cargoName || "Fracht")} ab ${escapeHtml(source || mission.source || "Pickup offen")}</span>
        </li>
      `)
      .join("");

    return `
      <article class="flight-card">
        <header>
          <p class="flight-index">Ladeflug ${flight.number}</p>
          <h3>${formatInteger(flight.total)} SCU</h3>
        </header>
        <p class="flight-boxes">Boxen: ${escapeHtml(formatBoxSummary(flight.boxes))}</p>
        <ul class="manifest-list">${missionListMarkup}</ul>
        <ul class="slot-list">${slotList}</ul>
        <div class="flight-actions">
          <button type="button" class="button button--primary flight-apply" data-action="apply-flight" data-flight-index="${flight.number - 1}">
            Geliefert eintragen
          </button>
        </div>
      </article>
    `;
  }

  function renderManifestPlan(plan, source, cargoName) {
    lastRenderedPlan = plan;
    const activeDestinations = plan.activeMissions.length;
    const completedDestinations = plan.completedMissions.length;
    const cargoSummary = summarizeCargoTypes(plan.activeMissions, cargoName);

    resultSummary.innerHTML = `
      <article class="result-card">
        <div class="mission-strip">
          <span class="route-pill">${escapeHtml(source || "Pickup offen")}</span>
          <span class="route-pill route-pill--accent">${escapeHtml(plan.ship.name)}</span>
        </div>
        <h2>Auftrags-Manifest</h2>
        <p>${escapeHtml(cargoSummary)} mit ${formatInteger(plan.remainingSCU)} offenen SCU ueber ${formatInteger(activeDestinations)} aktive Ziele.</p>
        <div class="metric-grid">
          <div>
            <span>Ladefluege</span>
            <strong>${formatInteger(plan.flightsRequired)}</strong>
          </div>
          <div>
            <span>Offen</span>
            <strong>${formatInteger(plan.remainingSCU)} SCU</strong>
          </div>
          <div>
            <span>Aktive Ziele</span>
            <strong>${formatInteger(activeDestinations)}</strong>
          </div>
          <div>
            <span>Erledigt</span>
            <strong>${formatInteger(completedDestinations)}</strong>
          </div>
        </div>
        <p class="aggregate-boxes">Gesamt laden: ${escapeHtml(formatBoxSummary(plan.aggregateBoxes))}</p>
      </article>
    `;

    resultFlights.innerHTML = plan.flights
      .map((flight) => renderFlightCard(flight, cargoName, source))
      .join("");

    renderCompletedMissions(plan, source, cargoName);
  }

  function renderBlockedManifest(plan) {
    const blockingList = plan.blockingMissions?.length
      ? plan.blockingMissions.map((mission) => `${mission.destination}: ${mission.remainingSCU} SCU`).join(", ")
      : "Mindestens ein Auftrag passt mit den aktiven Boxengroessen nicht exakt in einen Ladeflug.";

    renderError("Mindestens ein Auftrag ist mit der aktuellen Boxenauswahl oder den Slotgrenzen nicht exakt planbar.", blockingList);
    renderCompletedMissions(plan, plan.missions[0]?.source ?? "", plan.missions[0]?.cargo ?? "");
  }

  function renderFinishedManifest(plan, source, cargoName) {
    lastRenderedPlan = plan;
    const cargoSummary = summarizeCargoTypes(plan.completedMissions, cargoName);
    resultSummary.innerHTML = `
      <article class="result-card">
        <h2>Alle Auftraege erledigt</h2>
        <p>${escapeHtml(cargoSummary)} ab ${escapeHtml(source || "Pickup offen")} ist komplett geliefert.</p>
      </article>
    `;
    resultFlights.innerHTML = "";
    renderCompletedMissions(plan, source, cargoName);
  }

  function calculateAndRender() {
    try {
      const snapshot = collectMissionInput();
      const normalizedShip = normalizeShip(snapshot.ship);
      renderShipMeta(normalizedShip);

      if (!snapshot.missions.length) {
        throw new Error("Bitte mindestens einen Auftrag eintragen.");
      }

      if (!snapshot.boxSizes.length) {
        throw new Error("Bitte mindestens eine Kistengroesse aktivieren.");
      }

      const plan = planMissionManifest({
        ship: normalizedShip,
        boxSizes: snapshot.boxSizes,
        missions: snapshot.missions
      });

      if (!plan.reachable) {
        renderBlockedManifest(plan);
      } else if (plan.flightsRequired === 0) {
        renderFinishedManifest(plan, snapshot.source, snapshot.cargoName);
      } else {
        renderManifestPlan(plan, snapshot.source, snapshot.cargoName);
      }

      saveState(buildCurrentStateSnapshot());
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Unbekannter Fehler bei der Berechnung.");
      resultAlternative.innerHTML = "";
    }
  }

  function buildCurrentStateSnapshot() {
    return {
      presetId: presetSelect.value,
      shipName: shipNameInput.value,
      slotCapacities: slotCapacitiesInput.value,
      maxBoxesPerSlot: maxBoxesInput.value,
      source: form.elements.source.value,
      cargoName: form.elements.cargoName.value,
      boxSizes: getSelectedBoxSizes(),
      missions: readMissionRowsFromDom()
    };
  }

  function applyExampleState(example) {
    renderBoxSizes(example.boxSizes);
    applyPreset(example.presetId, false);
    shipNameInput.value = example.shipName;
    slotCapacitiesInput.value = example.slotCapacities;
    maxBoxesInput.value = example.maxBoxesPerSlot;
    form.elements.source.value = example.source;
    form.elements.cargoName.value = example.cargoName;
    renderMissionRows(example.missions.map(createMissionDraft));
  }

  function hydrateFromSavedState() {
    const initialState = readShareStateFromCurrentUrl() ?? loadState();
    if (!initialState) {
      applyExampleState(QUARTZ_EXAMPLE);
      return;
    }

    renderBoxSizes(initialState.boxSizes?.length ? initialState.boxSizes : QUARTZ_EXAMPLE.boxSizes);
    applyPreset(initialState.presetId ?? QUARTZ_EXAMPLE.presetId, false);

    shipNameInput.value = initialState.shipName ?? shipNameInput.value;
    slotCapacitiesInput.value = initialState.slotCapacities ?? slotCapacitiesInput.value;
    maxBoxesInput.value = initialState.maxBoxesPerSlot ?? maxBoxesInput.value;
    form.elements.source.value = initialState.source ?? QUARTZ_EXAMPLE.source;
    form.elements.cargoName.value = initialState.cargoName ?? QUARTZ_EXAMPLE.cargoName;
    renderMissionRows((initialState.missions?.length ? initialState.missions : QUARTZ_EXAMPLE.missions).map(createMissionDraft));
  }

  async function copyShareLink() {
    const shareUrl = buildShareUrl(window.location.href, buildCurrentStateSnapshot());
    window.history.replaceState(null, "", shareUrl);

    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();

      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }

      textarea.remove();
    }

    setShareStatus(copied
      ? "Share-Link kopiert."
      : "Share-Link in der URL aktualisiert. Bei Bedarf aus der Adressleiste kopieren.");
  }

  function setBoxSelection(predicate) {
    for (const checkbox of form.querySelectorAll('input[name="box-size"]')) {
      checkbox.checked = predicate(Number(checkbox.value));
    }
    calculateAndRender();
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

  document.querySelector("#share-link").addEventListener("click", () => {
    copyShareLink();
  });

  document.querySelector("#add-mission").addEventListener("click", () => {
    const rows = readMissionRowsFromDom();
    rows.push(createMissionDraft());
    renderMissionRows(rows);
    calculateAndRender();
  });

  document.querySelector("#load-quartz-example").addEventListener("click", () => {
    applyExampleState(QUARTZ_EXAMPLE);
    calculateAndRender();
  });

  document.querySelector("#load-mixed-example").addEventListener("click", () => {
    applyExampleState(MIXED_CARGO_EXAMPLE);
    calculateAndRender();
  });

  document.querySelector("#preset-boxes-16").addEventListener("click", () => {
    setBoxSelection((size) => size <= 16);
  });

  document.querySelector("#preset-boxes-all").addEventListener("click", () => {
    setBoxSelection(() => true);
  });

  resultFlights.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.dataset.action !== "apply-flight") {
      return;
    }

    const flightIndex = Number.parseInt(target.dataset.flightIndex || "", 10);
    const flight = lastRenderedPlan?.flights?.[flightIndex];
    if (!flight) {
      return;
    }

    const updatedRows = applyFlightDeliveryToRows(readMissionRowsFromDom(), flight.missions);
    renderMissionRows(updatedRows);
    calculateAndRender();
  });

  missionList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.dataset.action !== "remove-mission") {
      return;
    }

    const rows = readMissionRowsFromDom();
    const rowElement = target.closest(".mission-row");
    const filtered = rows.filter((row) => row.id !== rowElement?.dataset.missionId);
    renderMissionRows(filtered.length ? filtered : [createMissionDraft()]);
    calculateAndRender();
  });

  missionList.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const rowElement = target.closest(".mission-row");
    if (rowElement) {
      updateMissionRowMeta(rowElement);
    }

    calculateAndRender();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      if (!event.target.closest(".mission-row")) {
        calculateAndRender();
      }
    }
  });

  form.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      calculateAndRender();
    }
  });
}());
