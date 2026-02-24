const SINGLES_PER_COURT = 2
const DOUBLES_PER_COURT = 4
const NOT_STRICT_MIN_PER_COURT = 3
const _DOUBLES_TEAM_SIZE = 2

const courtsConfig = document.getElementById("courts-config")
const courtsDecBtn = document.getElementById("courts-dec")
const courtsIncBtn = document.getElementById("courts-inc")
const courtCountValue = document.getElementById("court-count-value")
const courtHint = document.getElementById("court-hint")

let courtCount = 1
let notStrictDoubles = false

function getPlayersPerCourt(gameMode) {
    return gameMode === "singles" ? SINGLES_PER_COURT : DOUBLES_PER_COURT
}

function getMinPerCourt(gameMode) {
    if (notStrictDoubles && gameMode === "doubles") {
        return NOT_STRICT_MIN_PER_COURT
    }
    return getPlayersPerCourt(gameMode)
}

function getMaxCourts(playerCount, gameMode) {
    const minPer = getMinPerCourt(gameMode)
    if (gameMode === "free") {
        return 1
    }
    return Math.max(1, Math.floor(playerCount / minPer))
}

function clampCourtCount(playerCount, gameMode) {
    const max = getMaxCourts(playerCount, gameMode)
    if (courtCount > max) {
        courtCount = max
    }
    if (courtCount < 1) {
        courtCount = 1
    }
    courtCountValue.textContent = courtCount
    courtsDecBtn.disabled = courtCount <= 1
    courtsIncBtn.disabled = courtCount >= max || playerCount < 2
}

function updateCourtHint(playerCount, gameMode) {
    if (gameMode === "free") {
        courtHint.textContent = ""
        return
    }
    if (playerCount < 2) {
        courtHint.textContent = ""
        return
    }
    const maxPerCourt = getPlayersPerCourt(gameMode)
    const minPerCourt = getMinPerCourt(gameMode)
    const maxActive = maxPerCourt * courtCount
    const minActive = minPerCourt * courtCount
    const activeCount = Math.min(Math.max(minActive, Math.min(maxActive, playerCount)), playerCount)
    const sitOuts = Math.max(0, playerCount - activeCount)
    const parts = [`${activeCount} active`]
    if (sitOuts > 0) {
        parts.push(`${sitOuts} sitting out`)
    }
    if (notStrictDoubles && gameMode === "doubles" && activeCount % DOUBLES_PER_COURT !== 0) {
        parts.push("some 2v1")
    }
    courtHint.textContent = parts.join(" · ")
}

function clearCourtHint() {
    courtHint.textContent = ""
}

function setNotStrictDoubles(value) {
    notStrictDoubles = value
}

function getNotStrictDoubles() {
    return notStrictDoubles
}

function setCourtVisibility(gameMode) {
    courtsConfig.hidden = gameMode === "free"
}

function resetCourtCount() {
    courtCount = 1
}

function initCourtConfig(onChange) {
    courtsDecBtn.addEventListener("click", () => {
        if (courtCount > 1) {
            courtCount -= 1
            onChange()
        }
    })
    courtsIncBtn.addEventListener("click", () => {
        // Max is checked via clamp on each onChange
        courtCount += 1
        onChange()
    })
}

function getCourtCount() {
    return courtCount
}

export {
    initCourtConfig,
    clampCourtCount,
    updateCourtHint,
    clearCourtHint,
    setCourtVisibility,
    resetCourtCount,
    getCourtCount,
    getPlayersPerCourt,
    setNotStrictDoubles,
    getNotStrictDoubles,
}
