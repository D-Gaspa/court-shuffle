import { shuffleWithRng } from "../../../core/random.js"
import { nextPowerOf2 } from "../../engine.js"
import {
    buildTournamentRunFromTeams,
    createBracketFirstRoundWithOverrides,
    extractOpeningSinglesMatchupKeys,
    normalizeAdvancedSettings,
    validateKnownPlayers,
} from "./shared.js"

function buildSinglesTeams(players, rng) {
    const seededPlayers = shuffleWithRng(players, rng)
    return seededPlayers.map((player, idx) => ({ id: idx, name: player, players: [player] }))
}

function collectSinglesOverrides(players, advanced, errors) {
    const playersSet = new Set(players)
    const normalizedAdvanced = normalizeAdvancedSettings(advanced)
    const singlesByePlayers = [...new Set(normalizedAdvanced.singlesByePlayers.filter(Boolean))]
    const openingMatchups = normalizedAdvanced.singlesOpeningMatchups
        .filter(([a, b]) => a || b)
        .map(([a, b]) => [a || "", b || ""])

    validateKnownPlayers(singlesByePlayers, playersSet, "Singles byes", errors)
    for (const [left, right] of openingMatchups) {
        if (!(left && right)) {
            errors.push("Singles opening matchups require two players per row.")
            continue
        }
        if (left === right) {
            errors.push("Singles opening matchup players must be different.")
            continue
        }
        validateKnownPlayers([left, right], playersSet, "Singles opening matchup", errors)
    }
    return { singlesByePlayers, openingMatchups }
}

function validateRoundRobinSinglesOverrides(format, openingMatchups, singlesByePlayers, errors) {
    if (format !== "round-robin") {
        return
    }
    if (openingMatchups.length > 0) {
        errors.push("Singles opening matchups are not supported for round-robin tournaments.")
    }
    if (singlesByePlayers.length > 0) {
        errors.push("Singles byes cannot be assigned for round-robin tournaments.")
    }
}

function collectSinglesForcedPairs({ openingMatchups, teamByPlayer, forcedByeSet, errors }) {
    const forcedPairTeamIds = []
    const pairedPlayers = new Set()
    for (const [left, right] of openingMatchups) {
        if (!(left && right)) {
            continue
        }
        if (forcedByeSet.has(teamByPlayer.get(left)?.id) || forcedByeSet.has(teamByPlayer.get(right)?.id)) {
            errors.push("Singles opening matchups cannot include players assigned to byes.")
            continue
        }
        if (pairedPlayers.has(left) || pairedPlayers.has(right)) {
            errors.push("Singles opening matchups cannot reuse a player across rows.")
            continue
        }
        const leftTeam = teamByPlayer.get(left)
        const rightTeam = teamByPlayer.get(right)
        if (!(leftTeam && rightTeam)) {
            continue
        }
        forcedPairTeamIds.push([leftTeam.id, rightTeam.id])
        pairedPlayers.add(left)
        pairedPlayers.add(right)
    }
    return forcedPairTeamIds
}

function resolveSinglesBracketOverrides({ teams, singlesByePlayers, openingMatchups, rng, errors }) {
    const byeCount = nextPowerOf2(teams.length) - teams.length
    if (singlesByePlayers.length > byeCount) {
        errors.push(`Singles byes exceed available Round 1 bye slots (${byeCount}).`)
    }

    const teamByPlayer = new Map(teams.map((team) => [team.players[0], team]))
    const forcedByeTeamIds = singlesByePlayers
        .map((player) => teamByPlayer.get(player)?.id)
        .filter((id) => Number.isInteger(id))
    const forcedByeSet = new Set(forcedByeTeamIds)
    const forcedPairTeamIds = collectSinglesForcedPairs({ openingMatchups, teamByPlayer, forcedByeSet, errors })
    const expectedMatchSlots = (teams.length - byeCount) / 2

    if (forcedPairTeamIds.length > expectedMatchSlots) {
        errors.push(`Singles opening matchups exceed available Round 1 match slots (${expectedMatchSlots}).`)
    }
    if (errors.length > 0) {
        return null
    }

    const unassignedByeCandidates = teams
        .map((team) => team.id)
        .filter((teamId) => !(forcedByeSet.has(teamId) || forcedPairTeamIds.some((pair) => pair.includes(teamId))))
    const autoByesNeeded = Math.max(0, byeCount - forcedByeSet.size)
    const autoByes = shuffleWithRng(unassignedByeCandidates, rng).slice(0, autoByesNeeded)
    return {
        byeTeamIds: [...forcedByeSet, ...autoByes],
        forcedPairTeamIds,
        expectedMatchSlots,
    }
}

function applySinglesOpeningKeys(run, usedSinglesOpeningMatchups) {
    const openingKeys = extractOpeningSinglesMatchupKeys(run)
    for (const key of openingKeys) {
        usedSinglesOpeningMatchups.add(key)
    }
}

function buildSinglesFirstRun({
    players,
    format,
    advanced,
    usedSinglesOpeningMatchups,
    courtCount,
    courtHandling,
    rng,
}) {
    const errors = []
    const { singlesByePlayers, openingMatchups } = collectSinglesOverrides(players, advanced, errors)
    const teams = buildSinglesTeams(players, rng)

    validateRoundRobinSinglesOverrides(format, openingMatchups, singlesByePlayers, errors)
    if (errors.length > 0) {
        return { run: null, errors }
    }

    if (format === "round-robin") {
        const run = buildTournamentRunFromTeams({
            format,
            teamSize: 1,
            teams,
            entrants: players,
            tournamentLevelSitOuts: [],
            courtCount,
            courtHandling,
        })
        return { run, errors: [] }
    }

    const overrides = resolveSinglesBracketOverrides({ teams, singlesByePlayers, openingMatchups, rng, errors })
    if (!overrides) {
        return { run: null, errors }
    }

    const firstRound = createBracketFirstRoundWithOverrides({
        teams,
        byeTeamIds: overrides.byeTeamIds,
        forcedPairTeamIds: overrides.forcedPairTeamIds,
        rng,
    })
    if (firstRound.matches.length !== overrides.expectedMatchSlots) {
        return { run: null, errors: ["Unable to build a valid Round 1 from the selected singles overrides."] }
    }

    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 1,
        teams,
        entrants: players,
        tournamentLevelSitOuts: [],
        courtCount,
        courtHandling,
        firstRoundOverride: firstRound,
    })
    applySinglesOpeningKeys(run, usedSinglesOpeningMatchups)
    return { run, errors: [] }
}

function buildSinglesTournament({
    players,
    format,
    usedSinglesOpeningMatchups,
    courtCount,
    courtHandling,
    rng,
    attempts,
}) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const teams = buildSinglesTeams(players, rng)
        const run = buildTournamentRunFromTeams({
            format,
            teamSize: 1,
            teams,
            entrants: players,
            tournamentLevelSitOuts: [],
            courtCount,
            courtHandling,
        })
        const openingKeys = extractOpeningSinglesMatchupKeys(run)
        if (openingKeys.some((key) => usedSinglesOpeningMatchups.has(key))) {
            continue
        }
        for (const key of openingKeys) {
            usedSinglesOpeningMatchups.add(key)
        }
        return run
    }
    return null
}

export { buildSinglesFirstRun, buildSinglesTournament }
