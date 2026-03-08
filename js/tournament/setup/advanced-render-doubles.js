import { renderDoublesByesSection as renderDoublesByesSectionValue } from "./advanced-render-doubles-byes.js"
import {
    addPlaceholderRow,
    createRemoveRowButton,
    createRowSeparator,
    createSelect,
    getPlayerOptions,
    getRowValue,
} from "./advanced-render-utils.js"

const renderDoublesByesSection = renderDoublesByesSectionValue

function getBlockedPlayersForLockedPairRow(rows, rowIndex) {
    const blocked = new Set()
    for (let i = 0; i < rows.length; i += 1) {
        if (i === rowIndex) {
            continue
        }
        const left = getRowValue(rows[i], 0)
        const right = getRowValue(rows[i], 1)
        if (left) {
            blocked.add(left)
        }
        if (right) {
            blocked.add(right)
        }
    }
    return blocked
}

function getSelectablePlayers({ selectedPlayers, blockedPlayers, currentValue }) {
    return selectedPlayers.filter((player) => player === currentValue || !blockedPlayers.has(player))
}

function getPairOptionsForRow(rows, rowIndex, selectedPlayers, allowNotStrictDoubles) {
    const currentLeft = getRowValue(rows[rowIndex], 0)
    const currentRight = getRowValue(rows[rowIndex], 1)
    const blockedByOtherRows = getBlockedPlayersForLockedPairRow(rows, rowIndex)

    const blockedForLeft = new Set(blockedByOtherRows)
    if (currentRight) {
        blockedForLeft.add(currentRight)
    }

    const blockedForRight = new Set(blockedByOtherRows)
    if (currentLeft) {
        blockedForRight.add(currentLeft)
    }

    return {
        currentLeft,
        currentRight,
        leftOptions: getPlayerOptions(
            getSelectablePlayers({ selectedPlayers, blockedPlayers: blockedForLeft, currentValue: currentLeft }),
            true,
            "Select player",
        ),
        rightOptions: getPlayerOptions(
            getSelectablePlayers({ selectedPlayers, blockedPlayers: blockedForRight, currentValue: currentRight }),
            true,
            allowNotStrictDoubles ? "Optional (solo lock)" : "Select player",
        ),
    }
}

function updateDoublesPairAddButton(addDoublesPairBtn, rows, selectedPlayers, allowNotStrictDoubles) {
    if (!addDoublesPairBtn) {
        return
    }
    const usedPlayers = new Set(rows.flat().filter(Boolean))
    const availablePlayers = selectedPlayers.filter((player) => !usedPlayers.has(player))
    addDoublesPairBtn.disabled = availablePlayers.length < (allowNotStrictDoubles ? 1 : 2)
}

function appendDoublesPairRow({
    rows,
    rowIndex,
    selectedPlayers,
    allowNotStrictDoubles,
    advancedDraft,
    doublesPairsList,
    onRequestRender,
}) {
    const row = document.createElement("div")
    row.className = "advanced-row"
    const { currentLeft, currentRight, leftOptions, rightOptions } = getPairOptionsForRow(
        rows,
        rowIndex,
        selectedPlayers,
        allowNotStrictDoubles,
    )

    row.appendChild(
        createSelect(
            leftOptions,
            currentLeft,
            (next) => {
                advancedDraft.doublesLockedPairs[rowIndex][0] = next
                if (next && advancedDraft.doublesLockedPairs[rowIndex][1] === next) {
                    advancedDraft.doublesLockedPairs[rowIndex][1] = ""
                }
                onRequestRender()
            },
            { name: `advanced-doubles-pair-${rowIndex}-left` },
        ),
    )
    row.appendChild(createRowSeparator(allowNotStrictDoubles ? "+" : "and"))
    row.appendChild(
        createSelect(
            rightOptions,
            currentRight,
            (next) => {
                advancedDraft.doublesLockedPairs[rowIndex][1] = next
                if (next && advancedDraft.doublesLockedPairs[rowIndex][0] === next) {
                    advancedDraft.doublesLockedPairs[rowIndex][0] = ""
                }
                onRequestRender()
            },
            { name: `advanced-doubles-pair-${rowIndex}-right` },
        ),
    )
    if (allowNotStrictDoubles && (currentLeft || currentRight) && !(currentLeft && currentRight)) {
        row.classList.add("advanced-row-solo-lock")
    }
    row.appendChild(
        createRemoveRowButton(() => {
            advancedDraft.doublesLockedPairs.splice(rowIndex, 1)
            onRequestRender()
        }),
    )
    doublesPairsList.appendChild(row)
}

function renderDoublesPairsSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        advancedDraft,
        doublesPairsSection,
        doublesPairsList,
        addDoublesPairBtn,
        onRequestRender,
    } = context

    const visible = tournamentTeamSize === 2
    doublesPairsSection.hidden = !visible
    if (addDoublesPairBtn) {
        addDoublesPairBtn.disabled = true
    }
    if (!visible) {
        return
    }

    doublesPairsList.textContent = ""
    const rows = Array.isArray(advancedDraft.doublesLockedPairs) ? advancedDraft.doublesLockedPairs : []
    updateDoublesPairAddButton(addDoublesPairBtn, rows, selectedPlayers, allowNotStrictDoubles)
    if (rows.length === 0) {
        addPlaceholderRow(doublesPairsList, "No locked doubles teams.")
        return
    }

    for (let i = 0; i < rows.length; i += 1) {
        appendDoublesPairRow({
            rows,
            rowIndex: i,
            selectedPlayers,
            allowNotStrictDoubles,
            advancedDraft,
            doublesPairsList,
            onRequestRender,
        })
    }
}

export { renderDoublesByesSection, renderDoublesPairsSection }
