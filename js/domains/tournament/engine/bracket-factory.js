/**
 * Tournament engine — bracket generation, round-robin scheduling, and team formation.
 *
 * Teams are objects: { id: number, name: string, players: string[] }
 */

function nextPowerOf2(n) {
    let v = 1
    while (v < n) {
        v *= 2
    }
    return v
}

// ── First round generation ─────────────────────────────────────

/**
 * Build first-round matches for elimination or consolation.
 * Handles byes for non-power-of-2 team counts.
 */
function generateBracketFirstRound(teams) {
    const n = teams.length
    const bracketSize = nextPowerOf2(n)
    const byeCount = bracketSize - n

    const byeTeamIds = teams.slice(0, byeCount).map((t) => t.id)
    const playing = teams.slice(byeCount)

    const matches = []
    for (let i = 0; i < playing.length; i += 2) {
        if (i + 1 < playing.length) {
            matches.push({
                court: matches.length + 1,
                teams: [playing[i].players, playing[i + 1].players],
                teamIds: [playing[i].id, playing[i + 1].id],
            })
        }
    }

    return {
        matches,
        byes: byeTeamIds,
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: "Round 1",
    }
}

// ── Round Robin ────────────────────────────────────────────────

/**
 * Generate all round-robin rounds using the circle (polygon) method.
 * Every team plays every other team exactly once.
 */
function generateRoundRobinSchedule(teams) {
    const list = [...teams]
    const isOdd = list.length % 2 !== 0
    if (isOdd) {
        list.push(null)
    }

    const totalRounds = list.length - 1
    const rounds = []

    for (let r = 0; r < totalRounds; r += 1) {
        const matches = []
        const sitOuts = []
        for (let i = 0; i < list.length / 2; i += 1) {
            const home = list[i]
            const away = list.at(-(i + 1))
            if (home === null || away === null) {
                const sitOutTeam = home ?? away
                if (sitOutTeam) {
                    sitOuts.push(sitOutTeam.name)
                }
                continue
            }
            matches.push({
                court: matches.length + 1,
                teams: [home.players, away.players],
                teamIds: [home.id, away.id],
            })
        }
        rounds.push({
            matches,
            sitOuts,
            scores: null,
            tournamentRoundLabel: `Round ${r + 1}`,
        })

        const last = list.pop()
        list.splice(1, 0, last)
    }

    return rounds
}

// ── Bracket initialization ─────────────────────────────────────

function createInitialBracket() {
    return {
        pools: { winners: [], losers: [] },
        eliminated: [],
        champion: null,
        standings: {},
    }
}

export { nextPowerOf2, generateBracketFirstRound, generateRoundRobinSchedule, createInitialBracket }
