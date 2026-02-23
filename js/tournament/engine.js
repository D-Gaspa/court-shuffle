/**
 * Tournament engine — algorithms for elimination, consolation, and round-robin formats.
 *
 * Teams are objects: { id: number, name: string, players: string[] }
 * Bracket state tracks pools, eliminations, and standings.
 */

// ── Utilities ──────────────────────────────────────────────────

export function nextPowerOf2(n) {
    let v = 1
    while (v < n) {
        v *= 2
    }
    return v
}

/**
 * Determine which side (0 or 1) won a match based on score sets.
 * Returns 0, 1, or null if tied/undetermined.
 */
export function determineMatchWinner(scoreEntry) {
    if (!scoreEntry?.sets || scoreEntry.sets.length === 0) {
        return null
    }
    let wins0 = 0
    let wins1 = 0
    let games0 = 0
    let games1 = 0
    for (const [s0, s1] of scoreEntry.sets) {
        games0 += s0
        games1 += s1
        if (s0 > s1) {
            wins0 += 1
        } else if (s1 > s0) {
            wins1 += 1
        }
    }
    if (wins0 > wins1) {
        return 0
    }
    if (wins1 > wins0) {
        return 1
    }
    // Tiebreak on total games
    if (games0 > games1) {
        return 0
    }
    if (games1 > games0) {
        return 1
    }
    return null
}

/**
 * Check if all matches in a round have non-null scores with a determinable winner.
 */
export function allScoresEntered(round) {
    if (!round.scores) {
        return false
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        const s = round.scores[i]
        if (!s) {
            return false
        }
        if (determineMatchWinner(s) === null) {
            return false
        }
    }
    return true
}

// ── Team helpers ───────────────────────────────────────────────

function teamById(teams, id) {
    return teams.find((t) => t.id === id)
}

function teamByPlayers(teams, players) {
    const key = [...players].sort().join("||")
    return teams.find((t) => [...t.players].sort().join("||") === key)
}

function shuffleArray(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }
    return a
}

// ── First round generation ─────────────────────────────────────

/**
 * Build first-round matches for elimination or consolation.
 * Handles byes for non-power-of-2 team counts.
 *
 * @param {object[]} teams - Array of team objects in seeding order
 * @returns {{ matches, byes: number[], sitOuts, scores, tournamentRoundLabel }}
 */
export function generateBracketFirstRound(teams) {
    const n = teams.length
    const bracketSize = nextPowerOf2(n)
    const byeCount = bracketSize - n

    // Byes go to the top-seeded teams (first in array)
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

// ── Single Elimination advancement ─────────────────────────────

/**
 * Advance a single elimination tournament by one round.
 * Returns next round or null if champion determined.
 */
export function advanceElimination(session) {
    const lastRound = session.rounds.at(-1)
    const winners = []

    for (let i = 0; i < lastRound.matches.length; i += 1) {
        const match = lastRound.matches[i]
        const winIdx = determineMatchWinner(lastRound.scores[i])
        if (winIdx === null) {
            return null
        }
        const winTeam = teamByPlayers(session.teams, match.teams[winIdx])
        if (winTeam) {
            winners.push(winTeam)
        }
    }

    // Add bye teams from previous round
    const byeTeams = (lastRound.byes || []).map((id) => teamById(session.teams, id)).filter(Boolean)
    const advancing = [...winners, ...byeTeams]

    if (advancing.length <= 1) {
        if (advancing.length === 1) {
            session.bracket.champion = advancing[0].id
        }
        return null
    }

    // Mark losers as eliminated
    for (let i = 0; i < lastRound.matches.length; i += 1) {
        const match = lastRound.matches[i]
        const winIdx = determineMatchWinner(lastRound.scores[i])
        const loseIdx = winIdx === 0 ? 1 : 0
        const loseTeam = teamByPlayers(session.teams, match.teams[loseIdx])
        if (loseTeam && !session.bracket.eliminated.includes(loseTeam.id)) {
            session.bracket.eliminated.push(loseTeam.id)
        }
    }

    const matches = []
    const byes = []
    if (advancing.length % 2 !== 0) {
        byes.push(advancing.at(-1).id)
    }
    const pairable = advancing.length % 2 !== 0 ? advancing.slice(0, -1) : advancing
    for (let i = 0; i < pairable.length; i += 2) {
        matches.push({
            court: matches.length + 1,
            teams: [pairable[i].players, pairable[i + 1].players],
            teamIds: [pairable[i].id, pairable[i + 1].id],
        })
    }

    const roundNum = session.rounds.length + 1
    const label = matches.length === 1 && byes.length === 0 ? "Final" : `Round ${roundNum}`

    return {
        matches,
        byes,
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: label,
    }
}

// ── Consolation Bracket advancement ────────────────────────────

/**
 * Advance a consolation bracket tournament.
 * Winners play winners, losers play losers. Everyone keeps playing.
 */
export function advanceConsolation(session) {
    const lastRound = session.rounds.at(-1)

    // Separate matches by pool
    const winnersMatches = []
    const losersMatches = []
    for (let i = 0; i < lastRound.matches.length; i += 1) {
        const pool = lastRound.matches[i].bracketPool || "winners"
        if (pool === "losers") {
            losersMatches.push({ match: lastRound.matches[i], scoreIdx: i })
        } else {
            winnersMatches.push({ match: lastRound.matches[i], scoreIdx: i })
        }
    }

    function getWinnersAndLosers(matchList) {
        const w = []
        const l = []
        for (const { match, scoreIdx } of matchList) {
            const winIdx = determineMatchWinner(lastRound.scores[scoreIdx])
            if (winIdx === null) {
                return null
            }
            const loseIdx = winIdx === 0 ? 1 : 0
            const winTeam = teamByPlayers(session.teams, match.teams[winIdx])
            const loseTeam = teamByPlayers(session.teams, match.teams[loseIdx])
            if (winTeam) {
                w.push(winTeam)
            }
            if (loseTeam) {
                l.push(loseTeam)
            }
        }
        return { w, l }
    }

    const winnersResult = getWinnersAndLosers(winnersMatches)
    if (!winnersResult) {
        return null
    }

    // Add bye teams from previous round to winners pool
    const byeTeams = (lastRound.byes || []).map((id) => teamById(session.teams, id)).filter(Boolean)

    // Winners pool advancing: winners of winners matches + bye teams
    const winnersAdvancing = [...winnersResult.w, ...byeTeams]
    // New losers entering from winners bracket
    const newLosers = winnersResult.l

    // Losers pool: winners of losers matches advance in losers bracket
    let losersAdvancing = []
    let losersBracketLosers = []
    if (losersMatches.length > 0) {
        const losersResult = getWinnersAndLosers(losersMatches)
        if (!losersResult) {
            return null
        }
        losersAdvancing = losersResult.w
        losersBracketLosers = losersResult.l
    }

    // Add losers byes
    const losersByes = (lastRound.losersByes || []).map((id) => teamById(session.teams, id)).filter(Boolean)
    losersAdvancing.push(...losersByes)

    // Combine into losers pool: new losers from winners + advancing losers
    const losersPool = [...newLosers, ...losersAdvancing]

    // Build next round matches
    const matches = []
    const byes = []
    const losersByeIds = []

    // Winners bracket matches
    if (winnersAdvancing.length >= 2) {
        if (winnersAdvancing.length % 2 !== 0) {
            byes.push(winnersAdvancing.at(-1).id)
        }
        const pairable = winnersAdvancing.length % 2 !== 0 ? winnersAdvancing.slice(0, -1) : winnersAdvancing
        for (let i = 0; i < pairable.length; i += 2) {
            matches.push({
                court: matches.length + 1,
                teams: [pairable[i].players, pairable[i + 1].players],
                teamIds: [pairable[i].id, pairable[i + 1].id],
                bracketPool: "winners",
            })
        }
    }

    // Losers bracket matches
    if (losersPool.length >= 2) {
        if (losersPool.length % 2 !== 0) {
            losersByeIds.push(losersPool.at(-1).id)
        }
        const pairable = losersPool.length % 2 !== 0 ? losersPool.slice(0, -1) : losersPool
        for (let i = 0; i < pairable.length; i += 2) {
            matches.push({
                court: matches.length + 1,
                teams: [pairable[i].players, pairable[i + 1].players],
                teamIds: [pairable[i].id, pairable[i + 1].id],
                bracketPool: "losers",
            })
        }
    }

    // Drop eliminated losers (those who lost in losers bracket — they're done)
    for (const t of losersBracketLosers) {
        if (!session.bracket.eliminated.includes(t.id)) {
            session.bracket.eliminated.push(t.id)
        }
    }

    if (matches.length === 0) {
        // Tournament over — determine champion
        if (winnersAdvancing.length === 1) {
            session.bracket.champion = winnersAdvancing[0].id
        }
        return null
    }

    const roundNum = session.rounds.length + 1
    const isWinnersFinal = winnersAdvancing.length <= 2 && winnersAdvancing.length > 0
    const label = isWinnersFinal && losersPool.length <= 2 ? `Finals (Round ${roundNum})` : `Round ${roundNum}`

    return {
        matches,
        byes,
        losersByes: losersByeIds,
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: label,
    }
}

// ── Round Robin ────────────────────────────────────────────────

/**
 * Generate all round-robin rounds using the circle (polygon) method.
 * Every team plays every other team exactly once.
 *
 * @param {object[]} teams - Array of team objects
 * @returns {object[]} Array of round objects
 */
export function generateRoundRobinSchedule(teams) {
    const list = [...teams]
    const isOdd = list.length % 2 !== 0
    if (isOdd) {
        list.push(null) // null = bye placeholder
    }

    const totalRounds = list.length - 1
    const rounds = []

    for (let r = 0; r < totalRounds; r += 1) {
        const matches = []
        for (let i = 0; i < list.length / 2; i += 1) {
            const home = list[i]
            const away = list.at(1 + i)
            if (home === null || away === null) {
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
            sitOuts: [],
            scores: null,
            tournamentRoundLabel: `Round ${r + 1}`,
        })

        // Rotate: fix first element, rotate the rest clockwise
        const last = list.pop()
        list.splice(1, 0, last)
    }

    return rounds
}

/**
 * Compute round-robin standings from all rounds played so far.
 * Returns sorted array of { teamId, teamName, wins, losses, setsWon, setsLost, gamesWon, gamesLost }.
 */
export function computeStandings(teams, rounds) {
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

    for (const round of rounds) {
        if (!round.scores) {
            continue
        }
        for (let i = 0; i < round.matches.length; i += 1) {
            const match = round.matches[i]
            const score = round.scores[i]
            if (!score?.sets) {
                continue
            }

            const ids = match.teamIds
            if (!ids) {
                continue
            }

            let sets0 = 0
            let sets1 = 0
            let games0 = 0
            let games1 = 0
            for (const [s0, s1] of score.sets) {
                games0 += s0
                games1 += s1
                if (s0 > s1) {
                    sets0 += 1
                } else if (s1 > s0) {
                    sets1 += 1
                }
            }

            const stat0 = stats.get(ids[0])
            const stat1 = stats.get(ids[1])
            if (!(stat0 && stat1)) {
                continue
            }

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

// ── Bracket initialization ─────────────────────────────────────

export function createInitialBracket(_format) {
    return {
        pools: { winners: [], losers: [] },
        eliminated: [],
        champion: null,
        standings: {},
    }
}

// ── Team formation helpers ─────────────────────────────────────

/**
 * Auto-pair players into doubles teams.
 * @param {string[]} players
 * @returns {{ id, name, players }[]}
 */
export function autoFormTeams(players, teamSize) {
    const shuffled = shuffleArray(players)
    const teams = []
    let id = 0
    for (let i = 0; i < shuffled.length; i += teamSize) {
        const teamPlayers = shuffled.slice(i, i + teamSize)
        if (teamPlayers.length === 0) {
            break
        }
        teams.push({
            id,
            name: teamPlayers.join(" & "),
            players: teamPlayers,
        })
        id += 1
    }
    return teams
}

/**
 * Create teams from a manual pairing specification.
 * @param {string[][]} pairings - Array of player arrays
 * @returns {{ id, name, players }[]}
 */
export function createTeamsFromPairings(pairings) {
    return pairings.map((players, i) => ({
        id: i,
        name: players.join(" & "),
        players,
    }))
}

/**
 * Advance a tournament by one round based on the format.
 * Returns the next round or null if tournament is complete.
 */
export function advanceTournament(session) {
    if (session.tournamentFormat === "elimination") {
        return advanceElimination(session)
    }
    if (session.tournamentFormat === "consolation") {
        return advanceConsolation(session)
    }
    // Round-robin is pre-generated; should not need advancement
    return null
}
