import { buildMatchResultSection } from "../../score-editor/index.js"
import { countSetWins, normalizeSets } from "../../score-editor/sets.js"

function getMatchWinnerIdx(entry) {
    const sets = normalizeSets(entry)
    if (!sets) {
        return null
    }
    const completeSets = sets.filter(([a, b]) => a !== null && b !== null)
    if (completeSets.length === 0) {
        return null
    }
    const { winsA, winsB } = countSetWins(completeSets)
    if (winsA === winsB) {
        return null
    }
    return winsA > winsB ? 0 : 1
}

function applyMatchWinnerUi(card, teamElements, entry) {
    card.classList.remove("match-card-has-winner")
    for (const teamElement of teamElements) {
        teamElement.classList.remove("match-team-winner", "match-team-loser")
    }
    const winnerIdx = getMatchWinnerIdx(entry)
    if (winnerIdx === null) {
        return
    }
    card.classList.add("match-card-has-winner")
    for (let idx = 0; idx < teamElements.length; idx += 1) {
        const teamElement = teamElements[idx]
        teamElement.classList.add(idx === winnerIdx ? "match-team-winner" : "match-team-loser")
    }
}

function appendMatchResult(card, opts, teamElements) {
    const teamLabels = opts?.teamLabels || ["Team 1", "Team 2"]
    const entry = opts?.entry || null
    card.appendChild(
        buildMatchResultSection({
            entry,
            editable: Boolean(opts?.editable && opts?.onCommit),
            onCommit: opts?.onCommit ?? {},
            onEntryChange: (nextEntry) => {
                applyMatchWinnerUi(card, teamElements, nextEntry)
            },
            onEditingChange: opts?.onEditingChange,
            teamLabels,
            startEditing: Boolean(opts?.isEditing),
        }),
    )
}

export { appendMatchResult, applyMatchWinnerUi }
