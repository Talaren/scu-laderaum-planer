const DESCENDING = (left, right) => right - left;

export function sumValues(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

export function normalizeBoxSizes(boxSizes) {
  return [...new Set(boxSizes.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))].sort(DESCENDING);
}

export function normalizeShip(ship) {
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

export function describeSlotCapacities(slotCapacities) {
  return slotCapacities.map((capacity) => `${capacity} SCU`).join(" + ");
}

export function countBoxes(boxes) {
  const counts = new Map();
  for (const size of boxes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([size, count]) => ({ size, count }));
}

export function formatBoxSummary(input) {
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

export function buildSlotPlans(capacity, boxSizes, maxBoxesPerSlot = Number.POSITIVE_INFINITY) {
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

export function buildFlightPlans(ship, boxSizes) {
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

export function planMission({ ship, boxSizes, targetSCU, mode = "exact" }) {
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
