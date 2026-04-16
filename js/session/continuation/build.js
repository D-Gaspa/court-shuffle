import { buildTournamentSeries } from "../../tournament/series/build.js"
import {
    createTournamentSessionPhase,
    getCurrentSessionPhase,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
} from "../../tournament/series/sync.js"
import {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
} from "../../tournament/setup/advanced/model/index.js"
import { buildRestrictedTeamsFromSessionPhases } from "../../tournament/setup/advanced/model/restriction-collection.js"
import { canContinueTournamentSession, getLatestCompletedTournamentIndex } from "./eligibility.js"

function generateContinuationSeed(players, config) {
    return `${Date.now()}-${players.join("|")}-${config.format}-${config.teamSize}-continuation`
}

function buildPlayerDiff(previousPlayers, nextPlayers) {
    const previous = new Set(previousPlayers || [])
    const next = new Set(nextPlayers || [])
    return {
        addedPlayers: [...next].filter((player) => !previous.has(player)),
        removedPlayers: [...previous].filter((player) => !next.has(player)),
    }
}

function getAbandonedFutureTournamentIndexes(phase) {
    const currentIndex = phase?.tournamentSeries?.currentTournamentIndex ?? -1
    const tournaments = phase?.tournamentSeries?.tournaments || []
    const abandoned = []
    for (let index = currentIndex + 1; index < tournaments.length; index += 1) {
        abandoned.push(index)
    }
    return abandoned
}

function buildContinuationAdvancedConfig({ allowNotStrictDoubles, lockedPairs, players, session, sourceConfig }) {
    const advanced = cloneAdvancedSettings(sourceConfig?.advanced || getDefaultAdvancedSettings())
    if (sourceConfig.teamSize === 2) {
        advanced.doublesRestrictedTeams =
            buildRestrictedTeamsFromSessionPhases({
                session,
                activePlayers: players,
                allowNotStrictDoubles,
                lockedPairs: lockedPairs || advanced.doublesLockedPairs,
            }) || []
    }
    return normalizeAdvancedForConfig(advanced, allowNotStrictDoubles)
}

function buildContinuationConfig({ allowNotStrictDoubles, courtCount, players, session }) {
    const phase = getCurrentSessionPhase(session)
    const sourceConfig = phase?.tournamentConfig
    if (!sourceConfig) {
        return null
    }

    const resolvedAllowNotStrict = sourceConfig.teamSize === 2 ? Boolean(allowNotStrictDoubles) : false
    const config = {
        format: sourceConfig.format,
        teamSize: sourceConfig.teamSize,
        courtCount,
        courtHandling: sourceConfig.courtHandling || "queue",
        allowNotStrictDoubles: resolvedAllowNotStrict,
        advanced: buildContinuationAdvancedConfig({
            allowNotStrictDoubles: resolvedAllowNotStrict,
            lockedPairs: sourceConfig.advanced?.doublesLockedPairs,
            players,
            session,
            sourceConfig,
        }),
        seed: null,
    }

    config.seed = generateContinuationSeed(players, config)
    return config
}

function buildContinuationMetadata({ config, phase, session, players }) {
    const { addedPlayers, removedPlayers } = buildPlayerDiff(phase.players, players)
    return {
        sourcePhaseIndex: session.currentPhaseIndex,
        sourceTournamentIndex: getLatestCompletedTournamentIndex(phase),
        inheritedPhaseIndexes: session.phases.map((_, index) => index),
        addedPlayers,
        removedPlayers,
        abandonedFutureTournamentIndexes: getAbandonedFutureTournamentIndexes(phase),
        createdAt: new Date().toISOString(),
        inheritedConfig: {
            format: true,
            teamSize: true,
            courtCount: config.courtCount === phase.courtCount,
            allowNotStrictDoubles: config.allowNotStrictDoubles === phase.allowNotStrictDoubles,
        },
        editedConfig: {
            courtCount: config.courtCount !== phase.courtCount,
            allowNotStrictDoubles: config.allowNotStrictDoubles !== phase.allowNotStrictDoubles,
        },
    }
}

function appendContinuationPhase(session, phase) {
    persistTournamentSeriesAliases(session)
    session.phases.push(phase)
    session.currentPhaseIndex = session.phases.length - 1
    syncTournamentSeriesAliases(session)
    return phase
}

function buildContinuationPhase({ allowNotStrictDoubles, courtCount, players, session }) {
    if (!canContinueTournamentSession(session)) {
        return null
    }

    const phase = getCurrentSessionPhase(session)
    if (!phase) {
        return null
    }

    const config = buildContinuationConfig({
        allowNotStrictDoubles,
        courtCount,
        players,
        session,
    })
    if (!config) {
        return null
    }

    const series = buildTournamentSeries({
        players,
        format: config.format,
        teamSize: config.teamSize,
        courtCount: config.courtCount,
        courtHandling: config.courtHandling,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        seed: config.seed,
        advanced: config.advanced,
    })
    if (!series || series.tournaments.length === 0) {
        return null
    }

    const metadata = buildContinuationMetadata({
        config,
        phase,
        session,
        players,
    })
    return createTournamentSessionPhase({
        id: `${session.id}-phase-${session.phases.length}`,
        createdAt: metadata.createdAt,
        players,
        courtCount: config.courtCount,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        tournamentConfig: config,
        tournamentSeries: series,
        continuation: metadata,
    })
}

export { appendContinuationPhase, buildContinuationPhase }
