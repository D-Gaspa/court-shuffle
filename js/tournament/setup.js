/**
 * Tournament setup UI controller.
 * Manages format and team size selection. Seeding is always random.
 */

import { autoFormTeams } from "./engine.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")

let tournamentFormat = "consolation"
let tournamentTeamSize = 1

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
    // No manual UI to update — seeding is always random
}

function buildTournamentTeams(players) {
    if (tournamentTeamSize === 1) {
        return players.map((p, i) => ({ id: i, name: p, players: [p] }))
    }

    return autoFormTeams(players, 2)
}

function randomSeedTeams(teams) {
    const seeded = [...teams]
    for (let i = seeded.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = seeded[i]
        seeded[i] = seeded[j]
        seeded[j] = tmp
    }
    seeded.forEach((t, i) => {
        t.id = i
    })
    return seeded
}

function getTournamentConfig(players, allowNotStrict) {
    const teams = buildTournamentTeams(players)
    const seededTeams = randomSeedTeams(teams)

    return {
        format: tournamentFormat,
        teamSize: tournamentTeamSize,
        teams: seededTeams,
        seeding: "random",
        allowNotStrictDoubles: allowNotStrict && tournamentTeamSize === 2,
    }
}

function getMinPlayersForTournament() {
    return tournamentTeamSize === 2 ? MIN_DOUBLES_TEAM_PLAYERS : MIN_SINGLES_TEAM_PLAYERS
}

function resetTournamentSetup() {
    tournamentFormat = "consolation"
    tournamentTeamSize = 1

    for (const b of formatSelector.querySelectorAll(".format-btn")) {
        b.classList.toggle("selected", b.dataset.format === "consolation")
    }
    for (const b of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        b.classList.toggle("selected", b.dataset.teamSize === "1")
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
    updateTournamentPlayers,
    resetTournamentSetup,
    updateTournamentHint,
}
