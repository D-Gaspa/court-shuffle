/**
 * Tournament standings computation for round-robin format.
 */

import { determineMatchWinner } from "./utils.js"

function initStatsMap(teams) {
    const stats = new Map()
    for (const t of teams) {
        stats.set(t.id, {
            teamId: t.id,
            teamName: t.name,
            wins: 0,
            losses: 0,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
        })
    }
    return stats
}

function tallySetScores(sets) {
    let sets0 = 0
    let sets1 = 0
    let games0 = 0
    let games1 = 0
    for (const [s0, s1] of sets) {
        games0 += s0
        games1 += s1
        if (s0 > s1) {
            sets0 += 1
        } else if (s1 > s0) {
            sets1 += 1
        }
    }
    return { sets0, sets1, games0, games1 }
}

function applyMatchStats(stats, match, score) {
    const ids = match.teamIds
    if (!ids) {
        return
    }

    const stat0 = stats.get(ids[0])
    const stat1 = stats.get(ids[1])
    if (!(stat0 && stat1)) {
        return
    }

    const { sets0, sets1, games0, games1 } = tallySetScores(score.sets)

    stat0.setsWon += sets0
    stat0.setsLost += sets1
    stat0.gamesWon += games0
    stat0.gamesLost += games1
    stat1.setsWon += sets1
    stat1.setsLost += sets0
    stat1.gamesWon += games1
    stat1.gamesLost += games0

    const winner = determineMatchWinner(score)
    if (winner === 0) {
        stat0.wins += 1
        stat1.losses += 1
    } else if (winner === 1) {
        stat1.wins += 1
        stat0.losses += 1
    }
}

/**
 * Compute round-robin standings from all rounds played so far.
 * Returns sorted array of { teamId, teamName, wins, losses, setsWon, setsLost, gamesWon, gamesLost }.
 */
function computeStandings(teams, rounds) {
    const stats = initStatsMap(teams)

    for (const round of rounds) {
        if (!round.scores) {
            continue
        }
        for (let i = 0; i < round.matches.length; i += 1) {
            const score = round.scores[i]
            if (!score?.sets) {
                continue
            }
            applyMatchStats(stats, round.matches[i], score)
        }
    }

    return [...stats.values()].sort((a, b) => {
        if (b.wins !== a.wins) {
            return b.wins - a.wins
        }
        const diffA = a.setsWon - a.setsLost
        const diffB = b.setsWon - b.setsLost
        if (diffB !== diffA) {
            return diffB - diffA
        }
        return b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost)
    })
}

export { computeStandings }
