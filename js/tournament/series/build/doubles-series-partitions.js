import { computeCapacities } from "../../../shuffle/core.js"
import { normalizeTeamKey } from "./shared.js"

function allocateSeedBuckets(seedBuckets, capacities) {
    const usedIndexes = new Set()
    const indexedSeeds = [...seedBuckets].map((bucket) => [...bucket]).sort((a, b) => b.length - a.length)
    const buckets = Array.from({ length: capacities.length }, () => [])

    for (const bucket of indexedSeeds) {
        let assigned = -1
        let bestCapacity = Number.POSITIVE_INFINITY
        for (let index = 0; index < capacities.length; index += 1) {
            if (usedIndexes.has(index)) {
                continue
            }
            const capacity = capacities[index]
            if (capacity >= bucket.length && capacity < bestCapacity) {
                assigned = index
                bestCapacity = capacity
            }
        }
        if (assigned === -1) {
            return null
        }
        usedIndexes.add(assigned)
        buckets[assigned] = bucket
    }

    return buckets
}

function sortPartition(partition) {
    return [...partition]
        .map((team) => [...team])
        .sort((a, b) => normalizeTeamKey(a).localeCompare(normalizeTeamKey(b)))
}

function buildPartitionKey(partition) {
    return sortPartition(partition)
        .map((team) => normalizeTeamKey(team))
        .join("::")
}

function buildBucketSignature(bucket, capacity) {
    if (bucket.length === 0) {
        return `empty:${capacity}`
    }
    return `${capacity}:${normalizeTeamKey(bucket)}`
}

function seedBucketsAreAllowed(seededBuckets, capacities, restrictedTeamKeys) {
    for (let index = 0; index < seededBuckets.length; index += 1) {
        const bucket = seededBuckets[index]
        if (bucket.length !== capacities[index]) {
            continue
        }
        if (restrictedTeamKeys.has(normalizeTeamKey(bucket))) {
            return false
        }
    }
    return true
}

function buildCompletedBucketKey(bucket, player) {
    return normalizeTeamKey([...bucket, player])
}

function canPlacePlayerInBucket({ player, bucket, capacity, restrictedTeamKeys }) {
    if (bucket.length >= capacity) {
        return false
    }
    if (bucket.length + 1 < capacity) {
        return true
    }
    return !restrictedTeamKeys.has(buildCompletedBucketKey(bucket, player))
}

function collectBucketIndexes({ player, capacities, restrictedTeamKeys, buckets }) {
    const bucketIndexes = []
    const triedBuckets = new Set()

    for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
        const bucket = buckets[bucketIndex]
        const capacity = capacities[bucketIndex]
        const signature = buildBucketSignature(bucket, capacity)
        if (triedBuckets.has(signature)) {
            continue
        }
        triedBuckets.add(signature)
        if (canPlacePlayerInBucket({ player, bucket, capacity, restrictedTeamKeys })) {
            bucketIndexes.push(bucketIndex)
        }
    }

    return bucketIndexes
}

function storePartition(buckets, seen, partitions) {
    const partition = sortPartition(buckets)
    const partitionKey = buildPartitionKey(partition)
    if (seen.has(partitionKey)) {
        return
    }
    seen.add(partitionKey)
    partitions.push(partition)
}

function collectPartitionResults({ remainingPlayers, capacities, restrictedTeamKeys, buckets, seen, partitions }) {
    function backtrack(playerIndex) {
        if (playerIndex >= remainingPlayers.length) {
            storePartition(buckets, seen, partitions)
            return
        }

        const player = remainingPlayers[playerIndex]
        for (const bucketIndex of collectBucketIndexes({ player, capacities, restrictedTeamKeys, buckets })) {
            const bucket = buckets[bucketIndex]
            bucket.push(player)
            backtrack(playerIndex + 1)
            bucket.pop()
        }
    }

    backtrack(0)
}

function enumeratePartitions({ entrants, restrictedTeamKeys, seedBuckets = [] }) {
    const teamCount = Math.ceil(entrants.length / 2)
    const capacities = computeCapacities(entrants.length, teamCount)
    const seededBuckets = allocateSeedBuckets(seedBuckets, capacities)
    if (!seededBuckets) {
        return []
    }
    if (!seedBucketsAreAllowed(seededBuckets, capacities, restrictedTeamKeys)) {
        return []
    }

    const assignedPlayers = new Set(seededBuckets.flat())
    const remainingPlayers = entrants
        .filter((player) => !assignedPlayers.has(player))
        .sort((a, b) => a.localeCompare(b))
    const partitions = []
    collectPartitionResults({
        remainingPlayers,
        capacities,
        restrictedTeamKeys,
        buckets: seededBuckets.map((bucket) => [...bucket]),
        seen: new Set(),
        partitions,
    })
    return partitions
}

export { enumeratePartitions }
