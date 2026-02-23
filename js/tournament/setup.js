/**
 * Tournament setup UI controller.
 * Manages format, team size, pairing, and seeding selection.
 */

import { autoFormTeams, createTeamsFromPairings } from "./engine.js"
import { getManualPairings, getManualSeedOrder, renderManualPairing, renderManualSeeding } from "./manual-input.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const pairingConfig = document.getElementById("tournament-pairing-config")
const pairingSelector = document.getElementById("pairing-selector")
const manualPairingArea = document.getElementById("manual-pairing-area")
const seedingSelector = document.getElementById("seeding-selector")
const manualSeedingArea = document.getElementById("manual-seeding-area")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")

let tournamentFormat = "consolation"
let tournamentTeamSize = 1
let pairingMode = "random"
let seedingMode = "random"

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
            pairingConfig.hidden = tournamentTeamSize !== 2
            notStrictDoublesGroup.hidden = tournamentTeamSize !== 2
            updateTournamentHint()
            onChange()
        })
    }

    for (const btn of pairingSelector.querySelectorAll(".pairing-btn")) {
        btn.addEventListener("click", () => {
            pairingMode = btn.dataset.pairing
            for (const b of pairingSelector.querySelectorAll(".pairing-btn")) {
                b.classList.toggle("selected", b === btn)
            }
            manualPairingArea.hidden = pairingMode !== "manual"
            onChange()
        })
    }

    for (const btn of seedingSelector.querySelectorAll(".seeding-btn")) {
        btn.addEventListener("click", () => {
            seedingMode = btn.dataset.seeding
            for (const b of seedingSelector.querySelectorAll(".seeding-btn")) {
                b.classList.toggle("selected", b === btn)
            }
            manualSeedingArea.hidden = seedingMode !== "manual"
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

function updateTournamentPlayers(players) {
    if (tournamentTeamSize === 2 && pairingMode === "manual") {
        renderManualPairing(players)
    }
    if (seedingMode === "manual") {
        if (tournamentTeamSize === 2) {
            const teamNames = []
            for (let i = 0; i < players.length; i += 2) {
                const pair = [players[i]]
                if (i + 1 < players.length) {
                    pair.push(players[i + 1])
                }
                teamNames.push(pair.join(" & "))
            }
            renderManualSeeding(teamNames)
        } else {
            renderManualSeeding(players)
        }
    }
}

function buildTournamentTeams(players, _allowNotStrict) {
    if (tournamentTeamSize === 1) {
        return players.map((p, i) => ({ id: i, name: p, players: [p] }))
    }

    if (pairingMode === "manual") {
        return createTeamsFromPairings(getManualPairings())
    }

    return autoFormTeams(players, 2)
}

function applySeedingToTeams(teams) {
    const manualSeedOrder = getManualSeedOrder()
    let seededTeams
    if (seedingMode === "manual" && manualSeedOrder.length > 0) {
        const teamsByName = new Map(teams.map((t) => [t.name, t]))
        seededTeams = []
        for (const name of manualSeedOrder) {
            const team = teamsByName.get(name)
            if (team) {
                seededTeams.push(team)
            }
        }
        for (const t of teams) {
            if (!seededTeams.includes(t)) {
                seededTeams.push(t)
            }
        }
    } else {
        seededTeams = [...teams]
        for (let i = seededTeams.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = seededTeams[i]
            seededTeams[i] = seededTeams[j]
            seededTeams[j] = tmp
        }
    }

    seededTeams.forEach((t, i) => {
        t.id = i
    })
    return seededTeams
}

function getTournamentConfig(players, allowNotStrict) {
    const teams = buildTournamentTeams(players, allowNotStrict)
    const seededTeams = applySeedingToTeams(teams)

    return {
        format: tournamentFormat,
        teamSize: tournamentTeamSize,
        teams: seededTeams,
        seeding: seedingMode,
        allowNotStrictDoubles: allowNotStrict && tournamentTeamSize === 2,
    }
}

function getMinPlayersForTournament() {
    return tournamentTeamSize === 2 ? MIN_DOUBLES_TEAM_PLAYERS : MIN_SINGLES_TEAM_PLAYERS
}

function resetTournamentSetup() {
    tournamentFormat = "consolation"
    tournamentTeamSize = 1
    pairingMode = "random"
    seedingMode = "random"

    for (const b of formatSelector.querySelectorAll(".format-btn")) {
        b.classList.toggle("selected", b.dataset.format === "consolation")
    }
    for (const b of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        b.classList.toggle("selected", b.dataset.teamSize === "1")
    }
    for (const b of pairingSelector.querySelectorAll(".pairing-btn")) {
        b.classList.toggle("selected", b.dataset.pairing === "random")
    }
    for (const b of seedingSelector.querySelectorAll(".seeding-btn")) {
        b.classList.toggle("selected", b.dataset.seeding === "random")
    }

    pairingConfig.hidden = true
    manualPairingArea.hidden = true
    manualSeedingArea.hidden = true
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
