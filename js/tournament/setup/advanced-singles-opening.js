import { reconcilePairRows } from "./advanced-model-helpers.js"

function getSinglesReservedPlayers(advancedDraft) {
    return new Set([
        ...(advancedDraft.singlesByePlayers || []).filter(Boolean),
        ...(advancedDraft.singlesNextUpPlayers || []).filter(Boolean),
    ])
}

function reconcileSinglesOpeningAvailability(advancedDraft) {
    const reservedPlayers = getSinglesReservedPlayers(advancedDraft)
    const usedPlayers = new Set()

    advancedDraft.singlesOpeningMatchups = reconcilePairRows(advancedDraft.singlesOpeningMatchups, true).map(
        ([left, right]) => {
            let nextLeft = left
            let nextRight = right

            if (reservedPlayers.has(nextLeft) || usedPlayers.has(nextLeft)) {
                nextLeft = ""
            }
            if (reservedPlayers.has(nextRight) || usedPlayers.has(nextRight) || (nextLeft && nextRight === nextLeft)) {
                nextRight = ""
            }

            if (nextLeft) {
                usedPlayers.add(nextLeft)
            }
            if (nextRight) {
                usedPlayers.add(nextRight)
            }

            return [nextLeft, nextRight]
        },
    )
}

function getSinglesOpeningSelectablePlayers({ advancedDraft, selectedPlayers, rowIndex, sideIndex }) {
    const blockedPlayers = getSinglesReservedPlayers(advancedDraft)
    const rows = advancedDraft.singlesOpeningMatchups || []
    const currentValue = rows[rowIndex]?.[sideIndex] || ""
    const oppositeValue = rows[rowIndex]?.[sideIndex === 0 ? 1 : 0] || ""

    for (let index = 0; index < rows.length; index += 1) {
        if (index === rowIndex) {
            continue
        }
        const [left, right] = rows[index]
        if (left) {
            blockedPlayers.add(left)
        }
        if (right) {
            blockedPlayers.add(right)
        }
    }
    if (oppositeValue) {
        blockedPlayers.add(oppositeValue)
    }

    return selectedPlayers.filter((player) => player === currentValue || !blockedPlayers.has(player))
}

export { getSinglesOpeningSelectablePlayers, getSinglesReservedPlayers, reconcileSinglesOpeningAvailability }
