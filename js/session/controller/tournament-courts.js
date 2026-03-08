const SINGLES_PLAYERS_PER_COURT = 2
const STRICT_DOUBLES_PLAYERS_PER_COURT = 4
const FLEX_DOUBLES_PLAYERS_PER_COURT = 3

function getPlayersPerCourt(matchMode, allowNotStrictDoubles) {
    if (matchMode === "singles") {
        return SINGLES_PLAYERS_PER_COURT
    }
    return allowNotStrictDoubles ? FLEX_DOUBLES_PLAYERS_PER_COURT : STRICT_DOUBLES_PLAYERS_PER_COURT
}

function clampTournamentCourtCount({ draft, matchMode, courtCountValue, courtCountLabel, courtsDecBtn, courtsIncBtn }) {
    const playerCount = draft.selectedPlayers.size
    const playersPerCourt = getPlayersPerCourt(matchMode, draft.tournament.allowNotStrictDoubles)
    const maxCourts = Math.max(1, Math.floor(playerCount / playersPerCourt))
    if (draft.tournament.courtCount > maxCourts) {
        draft.tournament.courtCount = maxCourts
    }
    if (draft.tournament.courtCount < 1) {
        draft.tournament.courtCount = 1
    }

    courtCountValue.textContent = draft.tournament.courtCount
    courtCountLabel.textContent = draft.tournament.courtCount === 1 ? "court" : "courts"
    courtsDecBtn.disabled = draft.tournament.courtCount <= 1
    courtsIncBtn.disabled = draft.tournament.courtCount >= maxCourts || playerCount < 2
}

function updateCourtHint({ draft, matchMode, courtHint }) {
    const playerCount = draft.selectedPlayers.size
    if (playerCount < 2) {
        courtHint.textContent = ""
        return
    }

    const maxPerCourt = matchMode === "singles" ? SINGLES_PLAYERS_PER_COURT : STRICT_DOUBLES_PLAYERS_PER_COURT
    const minPerCourt = getPlayersPerCourt(matchMode, draft.tournament.allowNotStrictDoubles)
    const activeCap = maxPerCourt * draft.tournament.courtCount
    const minActive = minPerCourt * draft.tournament.courtCount
    const activeCount = Math.min(Math.max(minActive, Math.min(activeCap, playerCount)), playerCount)
    const sitOuts = Math.max(0, playerCount - activeCount)
    const parts = [`${activeCount} active`]
    if (sitOuts > 0) {
        parts.push(`${sitOuts} sitting out`)
    }
    if (
        draft.tournament.allowNotStrictDoubles &&
        matchMode === "doubles" &&
        activeCount % STRICT_DOUBLES_PLAYERS_PER_COURT !== 0
    ) {
        parts.push("some 2v1")
    }
    courtHint.textContent = parts.join(" · ")
}

export { clampTournamentCourtCount, updateCourtHint }
