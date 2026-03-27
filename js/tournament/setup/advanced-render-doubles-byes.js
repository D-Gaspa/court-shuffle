import { isBracketFormat } from "./advanced-model.js"
import {
    getBracketByeSlotCount,
    getConfiguredDoublesTeamsByKey,
    toLockedTeamPlayers,
} from "./advanced-model-helpers.js"
import { addPlaceholderRow, getRowValue } from "./advanced-render-utils.js"

function collectSelectedByeKeys(doublesByeTeams, lockedTeamsByKey, allowNotStrictDoubles) {
    const selectedByeKeys = new Set()
    for (const team of doublesByeTeams || []) {
        const normalizedTeam = toLockedTeamPlayers([getRowValue(team, 0), getRowValue(team, 1)], allowNotStrictDoubles)
        if (!normalizedTeam) {
            continue
        }
        const key = [...normalizedTeam].sort().join("||")
        if (lockedTeamsByKey.has(key)) {
            selectedByeKeys.add(key)
        }
    }
    return selectedByeKeys
}

function syncByeTeamsFromKeys(advancedDraft, selectedByeKeys, lockedTeamsByKey) {
    advancedDraft.doublesByeTeams = [...selectedByeKeys]
        .map((key) => lockedTeamsByKey.get(key))
        .filter((pair) => Array.isArray(pair) && pair.length > 0)
        .map((pair) => [...pair])
}

function appendByeCheckboxRow({
    key,
    team,
    selectedByeKeys,
    lockedTeamsByKey,
    advancedDraft,
    doublesByesList,
    byeSlots,
    onRequestRender,
}) {
    const row = document.createElement("label")
    row.className = "advanced-check-item advanced-check-item-bye"

    const input = document.createElement("input")
    input.type = "checkbox"
    input.className = "advanced-check-box"
    input.name = `advanced-doubles-bye-${key}`
    input.checked = selectedByeKeys.has(key)
    input.disabled = !input.checked && selectedByeKeys.size >= byeSlots
    input.addEventListener("change", () => {
        if (input.checked) {
            selectedByeKeys.add(key)
        } else {
            selectedByeKeys.delete(key)
        }
        syncByeTeamsFromKeys(advancedDraft, selectedByeKeys, lockedTeamsByKey)
        onRequestRender()
    })

    const copy = document.createElement("span")
    copy.className = "advanced-check-copy"

    const title = document.createElement("span")
    title.className = "advanced-check-title"
    title.textContent = team.length === 1 ? team[0] : `${team[0]} & ${team[1]}`

    const meta = document.createElement("span")
    meta.className = "advanced-check-meta"
    meta.textContent = team.length === 1 ? "Solo lock" : "Locked pair"

    copy.appendChild(title)
    copy.appendChild(meta)
    row.appendChild(input)
    row.appendChild(copy)
    doublesByesList.appendChild(row)
}

function appendByeCapacityHint(doublesByesList, selectedCount, byeSlots) {
    const hint = document.createElement("div")
    hint.className = "hint advanced-bye-capacity-hint"
    hint.textContent = `${selectedCount}/${byeSlots} bye slots selected`
    doublesByesList.appendChild(hint)
}

function getDoublesByesRenderContext(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        advancedDraft,
        doublesByesSection,
        doublesByesList,
        onRequestRender,
    } = context
    return {
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        advancedDraft,
        doublesByesSection,
        doublesByesList,
        onRequestRender,
    }
}

function trimSelectedByeKeysToSlots(selectedByeKeys, byeSlots) {
    while (selectedByeKeys.size > byeSlots) {
        const last = [...selectedByeKeys].at(-1)
        if (!last) {
            break
        }
        selectedByeKeys.delete(last)
    }
}

function renderLockedByeOptions({ allowNotStrictDoubles, advancedDraft, doublesByesList, onRequestRender, byeSlots }) {
    const lockedTeamsByKey = getConfiguredDoublesTeamsByKey(advancedDraft.doublesLockedPairs, allowNotStrictDoubles)
    const lockedTeams = [...lockedTeamsByKey.entries()]
    if (lockedTeams.length === 0) {
        advancedDraft.doublesByeTeams = []
        addPlaceholderRow(doublesByesList, "Add locked doubles teams to choose bye teams.")
        return
    }

    const selectedByeKeys = collectSelectedByeKeys(
        advancedDraft.doublesByeTeams,
        lockedTeamsByKey,
        allowNotStrictDoubles,
    )
    trimSelectedByeKeysToSlots(selectedByeKeys, byeSlots)
    syncByeTeamsFromKeys(advancedDraft, selectedByeKeys, lockedTeamsByKey)
    appendByeCapacityHint(doublesByesList, selectedByeKeys.size, byeSlots)
    for (const [key, team] of lockedTeams) {
        appendByeCheckboxRow({
            key,
            team,
            selectedByeKeys,
            lockedTeamsByKey,
            advancedDraft,
            doublesByesList,
            byeSlots,
            onRequestRender,
        })
    }
}

function renderDoublesByesSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        advancedDraft,
        doublesByesSection,
        doublesByesList,
        onRequestRender,
    } = getDoublesByesRenderContext(context)

    const byeSlots = getBracketByeSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
    })
    const visible = tournamentTeamSize === 2 && isBracketFormat(tournamentFormat) && byeSlots > 0
    doublesByesSection.hidden = !visible
    if (!visible) {
        advancedDraft.doublesByeTeams = []
        return
    }

    doublesByesList.textContent = ""
    renderLockedByeOptions({ allowNotStrictDoubles, advancedDraft, doublesByesList, onRequestRender, byeSlots })
}

export { renderDoublesByesSection }
