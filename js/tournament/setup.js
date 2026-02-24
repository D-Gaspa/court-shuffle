/**
 * Tournament setup UI controller.
 * Manages format, match type, and court handling selection.
 */

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2
const MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS = 3

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")
const courtHandlingSelector = document.getElementById("tournament-court-handling")

let tournamentFormat = "consolation"
let tournamentTeamSize = 1
let tournamentCourtHandling = "queue"

function initTournamentSetup(onChange) {
    for (const btn of formatSelector.querySelectorAll(".format-btn")) {
        btn.addEventListener("click", () => {
            tournamentFormat = btn.dataset.format
            for (const b of formatSelector.querySelectorAll(".format-btn")) {
                b.classList.toggle("selected", b === btn)
            }
            updateTournamentHint()
            onChange()
        })
    }

    for (const btn of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        btn.addEventListener("click", () => {
            tournamentTeamSize = Number(btn.dataset.teamSize)
            for (const b of teamSizeSelector.querySelectorAll(".team-size-btn")) {
                b.classList.toggle("selected", b === btn)
            }
            notStrictDoublesGroup.hidden = tournamentTeamSize !== 2
            updateTournamentHint()
            onChange()
        })
    }

    if (courtHandlingSelector) {
        for (const btn of courtHandlingSelector.querySelectorAll(".court-handling-btn")) {
            btn.addEventListener("click", () => {
                tournamentCourtHandling = btn.dataset.courtHandling || "queue"
                for (const b of courtHandlingSelector.querySelectorAll(".court-handling-btn")) {
                    b.classList.toggle("selected", b === btn)
                }
                onChange()
            })
        }
    }
}

function showTournamentConfig() {
    tournamentConfig.hidden = false
}

function hideTournamentConfig() {
    tournamentConfig.hidden = true
}

function updateTournamentHint() {
    const formatLabels = {
        consolation: "Everyone keeps playing (winners vs winners, losers vs losers)",
        elimination: "Single elimination knockout bracket",
        "round-robin": "Every team plays every other team",
    }
    tournamentHint.textContent = formatLabels[tournamentFormat] || ""
}

function updateTournamentPlayers(_players) {
    // No manual UI to update
}

function getTournamentConfig(players, allowNotStrict) {
    return {
        format: tournamentFormat,
        teamSize: tournamentTeamSize,
        playerCount: players.length,
        courtHandling: tournamentCourtHandling,
        allowNotStrictDoubles: allowNotStrict && tournamentTeamSize === 2,
    }
}

function getMinPlayersForTournament(allowNotStrict = false) {
    if (tournamentTeamSize === 2) {
        return allowNotStrict ? MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS : MIN_DOUBLES_TEAM_PLAYERS
    }
    return MIN_SINGLES_TEAM_PLAYERS
}

function getTournamentMatchMode() {
    return tournamentTeamSize === 1 ? "singles" : "doubles"
}

function resetTournamentSetup() {
    tournamentFormat = "consolation"
    tournamentTeamSize = 1
    tournamentCourtHandling = "queue"

    for (const b of formatSelector.querySelectorAll(".format-btn")) {
        b.classList.toggle("selected", b.dataset.format === "consolation")
    }
    for (const b of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        b.classList.toggle("selected", b.dataset.teamSize === "1")
    }
    if (courtHandlingSelector) {
        for (const b of courtHandlingSelector.querySelectorAll(".court-handling-btn")) {
            b.classList.toggle("selected", b.dataset.courtHandling === "queue")
        }
    }

    notStrictDoublesGroup.hidden = true
    tournamentHint.textContent = ""
}

export {
    initTournamentSetup,
    showTournamentConfig,
    hideTournamentConfig,
    getTournamentConfig,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    updateTournamentPlayers,
    resetTournamentSetup,
    updateTournamentHint,
}
