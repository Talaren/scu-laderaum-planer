const DESCENDING = (left, right) => right - left;
const flightPlanCache = new Map();

export function sumValues(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function countCapacities(slotCapacities) {
  const counts = new Map();

  for (const capacity of slotCapacities) {
    counts.set(capacity, (counts.get(capacity) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[0] - left[0]);
}

export function normalizeBoxSizes(boxSizes) {
  return [...new Set(boxSizes.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))].sort(DESCENDING);
}

export function normalizeMaxBoxSize(maxBoxSize) {
  const parsed = Math.trunc(Number(maxBoxSize));
  return parsed > 0 ? parsed : null;
}

export function constrainBoxSizes(boxSizes, maxBoxSize = null) {
  const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
  const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);

  if (normalizedMaxBoxSize == null) {
    return normalizedBoxSizes;
  }

  return normalizedBoxSizes.filter((size) => size <= normalizedMaxBoxSize);
}

function getMaxLoadableContainerSize(ship) {
  return Math.max(...ship.slotCapacities);
}

export function normalizeShip(ship) {
  const slotCapacities = (ship.slotCapacities ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));

  if (!slotCapacities.length) {
    throw new Error("Mindestens ein gueltiger Slot mit Kapazitaet > 0 wird benoetigt.");
  }

  return {
    id: ship.id ?? "custom",
    name: ship.name?.trim() || "Benutzerdefiniertes Schiff",
    note: ship.note?.trim() || "",
    slotCapacities,
    totalCapacity: sumValues(slotCapacities)
  };
}

export function describeSlotCapacities(slotCapacities) {
  return countCapacities(slotCapacities)
    .map(([capacity, count]) => `${count}x ${capacity} SCU`)
    .join(", ");
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

export function buildSlotPlans(capacity, boxSizes) {
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

function buildScoreWeights(length, base) {
  const weights = Array(length);
  let current = 1n;

  for (let index = length - 1; index >= 0; index -= 1) {
    weights[index] = current;
    current *= base;
  }

  return weights;
}

function buildBoxScore(boxes, sizeIndexMap, boxWeights) {
  let score = 0n;
  const counts = Array.from({ length: boxWeights.length }, () => 0);

  for (const size of boxes) {
    const index = sizeIndexMap.get(size);
    if (index != null) {
      counts[index] += 1;
    }
  }

  for (let index = 0; index < counts.length; index += 1) {
    if (!counts[index]) {
      continue;
    }

    score += BigInt(counts[index]) * boxWeights[index];
  }

  return score;
}

function buildFillWeights(maxSlotCapacity, slotCount) {
  const base = BigInt(slotCount + 1);
  const weights = Array.from({ length: maxSlotCapacity + 1 }, () => 0n);
  let current = base;

  for (let fill = 1; fill <= maxSlotCapacity; fill += 1) {
    weights[fill] = current;
    current *= base;
  }

  return weights;
}

function isBetterFlightState(candidate, current) {
  if (!current) {
    return true;
  }

  if (candidate.boxCount !== current.boxCount) {
    return candidate.boxCount < current.boxCount;
  }

  if (candidate.boxScore !== current.boxScore) {
    return candidate.boxScore > current.boxScore;
  }

  return candidate.usedScore > current.usedScore;
}

function reconstructFlightPlan(finalState, slotPlanCache) {
  const slotAssignments = [];
  let cursor = finalState;

  while (cursor?.prev) {
    const slotPlan = slotPlanCache.get(cursor.capacity)[cursor.fill].plan;
    slotAssignments.push({
      slotIndex: cursor.slotIndex,
      capacity: cursor.capacity,
      used: cursor.fill,
      free: cursor.capacity - cursor.fill,
      boxes: [...slotPlan.boxes]
    });
    cursor = cursor.prev;
  }

  slotAssignments.reverse();

  return {
    total: finalState.total,
    boxes: sortBoxes(slotAssignments.flatMap((slot) => slot.boxes)),
    boxCount: finalState.boxCount,
    slotAssignments
  };
}

export function buildFlightPlans(ship, boxSizes) {
  const normalizedShip = normalizeShip(ship);
  const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
  const cacheKey = `${normalizedShip.slotCapacities.join(",")}|${normalizedBoxSizes.join(",")}`;
  const cached = flightPlanCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const totalCapacity = normalizedShip.totalCapacity;
  const maxSlotCapacity = Math.max(...normalizedShip.slotCapacities);
  const sizeIndexMap = new Map(normalizedBoxSizes.map((size, index) => [size, index]));
  const boxWeights = buildScoreWeights(normalizedBoxSizes.length, BigInt(totalCapacity + 1));
  const fillWeights = buildFillWeights(maxSlotCapacity, normalizedShip.slotCapacities.length);
  const slotPlanCache = new Map();

  const getPreparedSlotPlans = (capacity) => {
    if (slotPlanCache.has(capacity)) {
      return slotPlanCache.get(capacity);
    }

    const preparedPlans = buildSlotPlans(capacity, normalizedBoxSizes).map((plan) => {
      if (!plan) {
        return null;
      }

      return {
        plan,
        boxScore: buildBoxScore(plan.boxes, sizeIndexMap, boxWeights)
      };
    });

    slotPlanCache.set(capacity, preparedPlans);
    return preparedPlans;
  };

  let states = Array.from({ length: totalCapacity + 1 }, () => null);
  let reachableMax = 0;
  states[0] = {
    total: 0,
    boxCount: 0,
    boxScore: 0n,
    usedScore: 0n,
    prev: null,
    fill: 0,
    slotIndex: 0,
    capacity: 0
  };

  normalizedShip.slotCapacities.forEach((capacity, index) => {
    const preparedSlotPlans = getPreparedSlotPlans(capacity);
    const nextStates = Array.from({ length: totalCapacity + 1 }, () => null);

    for (let total = 0; total <= reachableMax; total += 1) {
      const state = states[total];
      if (!state) {
        continue;
      }

      for (let fill = 0; fill <= capacity; fill += 1) {
        const preparedSlotPlan = preparedSlotPlans[fill];
        if (!preparedSlotPlan) {
          continue;
        }

        const nextTotal = total + fill;
        const candidate = {
          total: nextTotal,
          boxCount: state.boxCount + preparedSlotPlan.plan.boxCount,
          boxScore: state.boxScore + preparedSlotPlan.boxScore,
          usedScore: state.usedScore + fillWeights[fill],
          prev: state,
          fill,
          slotIndex: index + 1,
          capacity
        };

        if (isBetterFlightState(candidate, nextStates[nextTotal])) {
          nextStates[nextTotal] = candidate;
        }
      }
    }

    reachableMax += capacity;
    states = nextStates;
  });

  const plans = new Map();

  for (let total = 1; total <= reachableMax; total += 1) {
    const state = states[total];
    if (!state) {
      continue;
    }

    plans.set(total, reconstructFlightPlan(state, slotPlanCache));
  }

  flightPlanCache.set(cacheKey, plans);
  return plans;
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

export function planMission({ ship, boxSizes, maxBoxSize = null, targetSCU, mode = "exact" }) {
  const normalizedTarget = Math.trunc(Number(targetSCU));
  if (!(normalizedTarget > 0)) {
    throw new Error("Die Missionsmenge muss groesser als 0 SCU sein.");
  }

  const normalizedShip = normalizeShip(ship);
  const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);
  const maxLoadableContainerSize = getMaxLoadableContainerSize(normalizedShip);

  if (normalizedMaxBoxSize != null && normalizedMaxBoxSize > maxLoadableContainerSize) {
    return {
      reachable: false,
      reason: "max-box-size-too-large",
      mode,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      maxLoadableContainerSize,
      boxSizes: constrainBoxSizes(boxSizes, maxBoxSize),
      targetSCU: normalizedTarget
    };
  }

  const normalizedBoxSizes = constrainBoxSizes(boxSizes, maxBoxSize);
  if (!normalizedBoxSizes.length) {
    throw new Error("Mindestens eine passende Kistengroesse muss verfuegbar sein.");
  }

  const flightPlans = buildFlightPlans(normalizedShip, normalizedBoxSizes);
  const feasibleTotals = [...flightPlans.keys()].filter((total) => total > 0).sort(DESCENDING);

  if (!feasibleTotals.length) {
    return {
      reachable: false,
      mode,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      boxSizes: normalizedBoxSizes,
      targetSCU: normalizedTarget
    };
  }

  const maxFlightTotal = feasibleTotals[0];
  const directFlight = flightPlans.get(normalizedTarget);

  if (directFlight) {
    return {
      reachable: true,
      exact: true,
      mode,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      boxSizes: normalizedBoxSizes,
      targetSCU: normalizedTarget,
      deliveredSCU: normalizedTarget,
      overfillSCU: 0,
      missingSCU: 0,
      flightsRequired: 1,
      feasibleTotals,
      flights: [
        {
          number: 1,
          ...cloneFlightPlan(directFlight)
        }
      ],
      aggregateBoxes: countBoxes(directFlight.boxes)
    };
  }

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
      maxBoxSize: normalizedMaxBoxSize,
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
    maxBoxSize: normalizedMaxBoxSize,
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

export function normalizeMissionEntries(missions) {
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

export function applyFlightDelivery(missions, flightMissions) {
  const increments = new Map();

  for (const flightMission of flightMissions) {
    const missionId = flightMission?.id;
    const amount = Math.max(0, Math.trunc(Number(flightMission?.remainingSCU ?? 0)));

    if (!missionId || amount <= 0) {
      continue;
    }

    increments.set(missionId, (increments.get(missionId) ?? 0) + amount);
  }

  return missions.map((mission, index) => {
    const normalizedMission = normalizeMissionEntry(mission, index);
    const increment = increments.get(normalizedMission.id) ?? 0;
    const deliveredSCU = Math.min(normalizedMission.totalSCU, normalizedMission.deliveredSCU + increment);

    return {
      ...mission,
      ...normalizedMission,
      deliveredSCU,
      remainingSCU: normalizedMission.totalSCU - deliveredSCU
    };
  });
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

function sumBoxCounts(counts, sizes) {
  return counts.reduce((sum, count, index) => sum + count * sizes[index], 0);
}

function createBoxCounts(boxes, sizes) {
  const counts = Array.from({ length: sizes.length }, () => 0);

  for (const box of boxes) {
    const index = sizes.indexOf(box);
    if (index >= 0) {
      counts[index] += 1;
    }
  }

  return counts;
}

function boxCountsKey(counts) {
  return counts.join(",");
}

function expandBoxCounts(counts, sizes) {
  const boxes = [];

  for (let index = 0; index < counts.length; index += 1) {
    for (let count = 0; count < counts[index]; count += 1) {
      boxes.push(sizes[index]);
    }
  }

  return boxes;
}

function getTargetCombinations(targetSCU, sizes, availableCounts, memo) {
  const memoKey = `${targetSCU}|${boxCountsKey(availableCounts)}`;
  const cached = memo.get(memoKey);
  if (cached) {
    return cached;
  }

  const combinations = [];
  const working = Array.from({ length: sizes.length }, () => 0);

  function search(index, remainingSCU, usedBoxes, remainingCapacity) {
    if (remainingSCU === 0) {
      combinations.push({
        counts: [...working],
        boxCount: usedBoxes
      });
      return;
    }

    if (index >= sizes.length || remainingSCU < 0 || remainingSCU > remainingCapacity) {
      return;
    }

    const size = sizes[index];
    const maxUse = Math.min(availableCounts[index], Math.floor(remainingSCU / size));
    const nextRemainingCapacityBase = remainingCapacity - (availableCounts[index] * size);

    for (let use = maxUse; use >= 0; use -= 1) {
      working[index] = use;
      search(
        index + 1,
        remainingSCU - (use * size),
        usedBoxes + use,
        nextRemainingCapacityBase + ((availableCounts[index] - use) * size)
      );
    }

    working[index] = 0;
  }

  search(0, targetSCU, 0, sumBoxCounts(availableCounts, sizes));
  combinations.sort((left, right) => {
    if (left.boxCount !== right.boxCount) {
      return left.boxCount - right.boxCount;
    }

    return compareNumberListsDescending(left.counts, right.counts);
  });

  memo.set(memoKey, combinations);
  return combinations;
}

function allocateBoxesToMissions(boxes, missions) {
  if (!missions.length) {
    return [];
  }

  if (missions.length === 1) {
    return [{
      ...missions[0],
      boxes: sortBoxes(boxes),
      boxSummary: countBoxes(boxes)
    }];
  }

  const sizes = normalizeBoxSizes(boxes);
  const initialCounts = createBoxCounts(boxes, sizes);
  const orderedMissions = missions
    .map((mission, index) => ({ ...mission, originalIndex: index }))
    .sort((left, right) => right.remainingSCU - left.remainingSCU);
  const combinationMemo = new Map();
  const allocationMemo = new Map();

  function search(missionIndex, availableCounts) {
    const memoKey = `${missionIndex}|${boxCountsKey(availableCounts)}`;
    if (allocationMemo.has(memoKey)) {
      return allocationMemo.get(memoKey);
    }

    let result = null;

    if (missionIndex === orderedMissions.length - 1) {
      if (sumBoxCounts(availableCounts, sizes) === orderedMissions[missionIndex].remainingSCU) {
        result = [availableCounts];
      }
    } else {
      const mission = orderedMissions[missionIndex];
      const combinations = getTargetCombinations(mission.remainingSCU, sizes, availableCounts, combinationMemo);

      for (const combination of combinations) {
        const nextCounts = availableCounts.map((count, index) => count - combination.counts[index]);
        const remainder = search(missionIndex + 1, nextCounts);
        if (remainder) {
          result = [combination.counts, ...remainder];
          break;
        }
      }
    }

    allocationMemo.set(memoKey, result);
    return result;
  }

  const allocatedCounts = search(0, initialCounts);
  if (!allocatedCounts) {
    return null;
  }

  return orderedMissions
    .map((mission, index) => {
      const missionBoxes = expandBoxCounts(allocatedCounts[index], sizes);
      return {
        ...mission,
        boxes: missionBoxes,
        boxSummary: countBoxes(missionBoxes)
      };
    })
    .sort((left, right) => left.originalIndex - right.originalIndex)
    .map(({ originalIndex, ...mission }) => mission);
}

export function planMissionManifest({ ship, boxSizes, maxBoxSize = null, missions }) {
  const normalizedShip = normalizeShip(ship);
  const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);
  const maxLoadableContainerSize = getMaxLoadableContainerSize(normalizedShip);
  const normalizedBoxSizes = constrainBoxSizes(boxSizes, maxBoxSize);
  if (!normalizedBoxSizes.length) {
    throw new Error("Mindestens eine passende Kistengroesse muss verfuegbar sein.");
  }

  const manifest = normalizeMissionEntries(missions);
  const activeMissions = manifest.activeMissions;

  if (!activeMissions.length) {
    return {
      reachable: true,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      boxSizes: normalizedBoxSizes,
      ...manifest,
      flightsRequired: 0,
      flights: [],
      aggregateBoxes: []
    };
  }

  if (normalizedMaxBoxSize != null && normalizedMaxBoxSize > maxLoadableContainerSize) {
    return {
      reachable: false,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      maxLoadableContainerSize,
      boxSizes: normalizedBoxSizes,
      ...manifest,
      reason: "max-box-size-too-large",
      blockingMissions: activeMissions
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
      maxBoxSize: normalizedMaxBoxSize,
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

      const allocations = allocateBoxesToMissions(exactPlan.flights[0].boxes, subsetMissions);
      if (!allocations) {
        if (countBits(mask) === 1) {
          singleMissionIssues.push(subsetMissions[0]);
        }
        continue;
      }

      subsetPlans.set(mask, {
        totalSCU,
        plan: exactPlan.flights[0],
        missions: allocations,
        stops: subsetMissions.length
      });
    }

    if (singleMissionIssues.length) {
      return {
        reachable: false,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
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
          stopProfile: buildSortedProfile(current.stopProfile, subset.stops, (left, right) => left - right)
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

  const flights = selectedFlights.map((flight, index) => {
    const missionBoxes = flight.missions.length === 1 && !flight.missions[0].boxes
      ? [{ ...flight.missions[0], boxes: [...flight.plan.boxes] }]
      : flight.missions;

    return {
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
      missions: missionBoxes.map((mission) => ({
        id: mission.id,
        label: mission.label,
        cargo: mission.cargo,
        source: mission.source,
        destination: mission.destination,
        remainingSCU: mission.remainingSCU,
        boxes: [...(mission.boxes ?? [])],
        boxSummary: countBoxes(mission.boxes ?? [])
      }))
    };
  });

  return {
    reachable: true,
    ship: normalizedShip,
    maxBoxSize: normalizedMaxBoxSize,
    boxSizes: normalizedBoxSizes,
    ...manifest,
    flightsRequired: flights.length,
    flights,
    aggregateBoxes: countBoxes(flights.flatMap((flight) => flight.boxes))
  };
}
