const SINGLES_PLAYERS_PER_COURT = 2
const STRICT_DOUBLES_PLAYERS_PER_COURT = 4
const FLEX_DOUBLES_PLAYERS_PER_COURT = 3

function getPlayersPerCourt(matchMode, allowNotStrictDoubles) {
    if (matchMode === "singles") {
        return SINGLES_PLAYERS_PER_COURT
    }
    return allowNotStrictDoubles ? FLEX_DOUBLES_PLAYERS_PER_COURT : STRICT_DOUBLES_PLAYERS_PER_COURT
}

function getCourtSetupState(draft) {
    if (draft.gameMode === "tournament") {
        return {
            courtCount: draft.tournament.courtCount,
            allowNotStrictDoubles: draft.tournament.allowNotStrictDoubles,
            setCourtCount: (nextValue) => {
                draft.tournament.courtCount = nextValue
            },
        }
    }

    return {
        courtCount: draft.structured.courtCount,
        allowNotStrictDoubles: draft.structured.allowNotStrictDoubles,
        setCourtCount: (nextValue) => {
            draft.structured.courtCount = nextValue
        },
    }
}

function clampCourtCount({ draft, matchMode, courtCountValue, courtCountLabel, courtsDecBtn, courtsIncBtn }) {
    const playerCount = draft.selectedPlayers.size
    const state = getCourtSetupState(draft)
    const playersPerCourt = getPlayersPerCourt(matchMode, state.allowNotStrictDoubles)
    const maxCourts = Math.max(1, Math.floor(playerCount / playersPerCourt))
    const nextCourtCount = Math.min(Math.max(1, state.courtCount), maxCourts)
    state.setCourtCount(nextCourtCount)
    const lockedForContinuation = Boolean(draft.continuation) && draft.gameMode === "tournament"

    courtCountValue.textContent = nextCourtCount
    courtCountLabel.textContent = nextCourtCount === 1 ? "court" : "courts"
    courtsDecBtn.disabled = lockedForContinuation || nextCourtCount <= 1
    courtsIncBtn.disabled = lockedForContinuation || nextCourtCount >= maxCourts || playerCount < 2
}

function updateCourtHint({ draft, matchMode, courtHint }) {
    const playerCount = draft.selectedPlayers.size
    if (playerCount < 2) {
        courtHint.textContent = ""
        return
    }

    const state = getCourtSetupState(draft)
    const maxPerCourt = matchMode === "singles" ? SINGLES_PLAYERS_PER_COURT : STRICT_DOUBLES_PLAYERS_PER_COURT
    const onCourtCount = Math.min(maxPerCourt * state.courtCount, playerCount)
    const offCourtCount = Math.max(0, playerCount - onCourtCount)
    const parts = [`${onCourtCount} on court at once`]
    if (offCourtCount > 0) {
        parts.push(`${offCourtCount} off court at the same time`)
    }
    if (matchMode === "doubles" && !state.allowNotStrictDoubles && playerCount % 2 !== 0) {
        parts.push(
            draft.gameMode === "tournament" ? "1 tournament sit-out may be required" : "1 sit-out may be required",
        )
    }
    if (
        state.allowNotStrictDoubles &&
        matchMode === "doubles" &&
        onCourtCount % STRICT_DOUBLES_PLAYERS_PER_COURT !== 0
    ) {
        parts.push("some 2v1 possible")
    }
    courtHint.textContent = parts.join(" · ")
}

export { clampCourtCount, clampCourtCount as clampTournamentCourtCount, getPlayersPerCourt, updateCourtHint }
