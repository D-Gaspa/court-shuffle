/**
 * Tournament setup UI controller.
 * Manages format, team size, pairing, and seeding selection.
 */

import { autoFormTeams, createTeamsFromPairings } from "./engine.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const pairingConfig = document.getElementById("tournament-pairing-config")
const pairingSelector = document.getElementById("pairing-selector")
const manualPairingArea = document.getElementById("manual-pairing-area")
const manualPairingGrid = document.getElementById("manual-pairing-grid")
const seedingSelector = document.getElementById("seeding-selector")
const manualSeedingArea = document.getElementById("manual-seeding-area")
const manualSeedingList = document.getElementById("manual-seeding-list")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")

let tournamentFormat = "consolation"
let tournamentTeamSize = 1
let pairingMode = "random"
let seedingMode = "random"
let manualPairings = []
let manualSeedOrder = []
let _onChangeCallback = null

function initTournamentSetup(onChange) {
    _onChangeCallback = onChange

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

/**
 * Render the manual pairing UI for doubles tournament.
 * Players are shown in a list and paired sequentially.
 */
function renderManualPairing(players) {
    manualPairingGrid.textContent = ""
    manualPairings = []

    // Create pairs from the player list order
    for (let i = 0; i < players.length; i += 2) {
        const pair = [players[i]]
        if (i + 1 < players.length) {
            pair.push(players[i + 1])
        }
        manualPairings.push(pair)

        const pairEl = document.createElement("div")
        pairEl.className = "manual-pair"

        const label = document.createElement("span")
        label.className = "pair-label"
        label.textContent = `Team ${manualPairings.length}`

        const names = document.createElement("span")
        names.className = "pair-names"
        names.textContent = pair.join(" & ")

        pairEl.appendChild(label)
        pairEl.appendChild(names)
        manualPairingGrid.appendChild(pairEl)
    }
}

/**
 * Render the manual seeding list.
 * Shows teams/players in bracket order with drag-to-reorder.
 */
function renderManualSeeding(players) {
    manualSeedingList.textContent = ""
    manualSeedOrder = [...players]

    for (let i = 0; i < manualSeedOrder.length; i += 1) {
        const item = document.createElement("div")
        item.className = "seeding-item"
        item.draggable = true
        item.dataset.index = i

        const seed = document.createElement("span")
        seed.className = "seed-number"
        seed.textContent = `#${i + 1}`

        const name = document.createElement("span")
        name.className = "seed-name"
        name.textContent = manualSeedOrder[i]

        const grip = document.createElement("span")
        grip.className = "seed-grip"
        grip.innerHTML = "&#x2630;"

        item.appendChild(seed)
        item.appendChild(name)
        item.appendChild(grip)
        manualSeedingList.appendChild(item)

        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", i.toString())
            item.classList.add("dragging")
        })
        item.addEventListener("dragend", () => {
            item.classList.remove("dragging")
        })
        item.addEventListener("dragover", (e) => {
            e.preventDefault()
            item.classList.add("drag-over")
        })
        item.addEventListener("dragleave", () => {
            item.classList.remove("drag-over")
        })
        item.addEventListener("drop", (e) => {
            e.preventDefault()
            item.classList.remove("drag-over")
            const fromIdx = Number(e.dataTransfer.getData("text/plain"))
            const toIdx = Number(item.dataset.index)
            if (fromIdx !== toIdx) {
                const [moved] = manualSeedOrder.splice(fromIdx, 1)
                manualSeedOrder.splice(toIdx, 0, moved)
                renderManualSeeding(manualSeedOrder)
            }
        })
    }
}

/**
 * Update the setup UI when players change.
 */
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

/**
 * Build tournament teams from current configuration.
 */
function buildTournamentTeams(players, _allowNotStrict) {
    if (tournamentTeamSize === 1) {
        // Singles: each player is a team
        return players.map((p, i) => ({ id: i, name: p, players: [p] }))
    }

    // Doubles
    if (pairingMode === "manual") {
        return createTeamsFromPairings(manualPairings)
    }

    return autoFormTeams(players, 2)
}

/**
 * Get the full tournament configuration.
 */
function getTournamentConfig(players, allowNotStrict) {
    const teams = buildTournamentTeams(players, allowNotStrict)

    // Apply seeding
    let seededTeams
    if (seedingMode === "manual" && manualSeedOrder.length > 0) {
        // Reorder teams to match manual seed order
        const teamsByName = new Map(teams.map((t) => [t.name, t]))
        seededTeams = []
        for (const name of manualSeedOrder) {
            const team = teamsByName.get(name)
            if (team) {
                seededTeams.push(team)
            }
        }
        // Add any teams not in the manual list
        for (const t of teams) {
            if (!seededTeams.includes(t)) {
                seededTeams.push(t)
            }
        }
    } else {
        // Random seeding: shuffle
        seededTeams = [...teams]
        for (let i = seededTeams.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = seededTeams[i]
            seededTeams[i] = seededTeams[j]
            seededTeams[j] = tmp
        }
    }

    // Reassign IDs based on seed position
    seededTeams.forEach((t, i) => {
        t.id = i
    })

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
