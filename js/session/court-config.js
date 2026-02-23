const SINGLES_PER_COURT = 2
const DOUBLES_PER_COURT = 4

const courtsConfig = document.getElementById("courts-config")
const courtsDecBtn = document.getElementById("courts-dec")
const courtsIncBtn = document.getElementById("courts-inc")
const courtCountValue = document.getElementById("court-count-value")
const courtHint = document.getElementById("court-hint")

let courtCount = 1

function getPlayersPerCourt(gameMode) {
    return gameMode === "singles" ? SINGLES_PER_COURT : DOUBLES_PER_COURT
}

function getMaxCourts(playerCount, gameMode) {
    if (gameMode === "singles") {
        return Math.max(1, Math.floor(playerCount / SINGLES_PER_COURT))
    }
    if (gameMode === "doubles") {
        return Math.max(1, Math.floor(playerCount / DOUBLES_PER_COURT))
    }
    return 1
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
    const playersPerCourt = getPlayersPerCourt(gameMode)
    const activeCount = Math.min(playersPerCourt * courtCount, playerCount)
    const sitOuts = Math.max(0, playerCount - activeCount)
    const parts = [`${activeCount} active`]
    if (sitOuts > 0) {
        parts.push(`${sitOuts} sitting out`)
    }
    courtHint.textContent = parts.join(" · ")
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
    setCourtVisibility,
    resetCourtCount,
    getCourtCount,
    getPlayersPerCourt,
}
