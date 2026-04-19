import {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
} from "../../../domains/tournament/setup/advanced/model/index.js"
import { isMultiPhaseHistorySession } from "../summary/session-phases.js"

const HISTORY_REMIX_VERSION = 1

const HISTORY_REMIX_ACTIONS = {
    reusePlayers: "reuse-players",
    newSeed: "new-seed",
    sameSeed: "same-seed",
}

const HISTORY_SEED_VARIANTS = {
    newSeed: "new-seed",
    sameSeed: "same-seed",
}

function buildTournamentSeedSignature(players, tournamentConfig) {
    return JSON.stringify({
        players,
        format: tournamentConfig.format,
        teamSize: tournamentConfig.teamSize,
        courtCount: tournamentConfig.courtCount,
        courtHandling: tournamentConfig.courtHandling || "queue",
        allowNotStrictDoubles: Boolean(tournamentConfig.allowNotStrictDoubles && tournamentConfig.teamSize === 2),
        advanced: tournamentConfig.advanced,
    })
}

function buildTournamentRemixConfig(session) {
    const config = session?.tournamentConfig
    if (!config) {
        return null
    }

    return {
        format: config.format,
        teamSize: config.teamSize,
        courtCount: config.courtCount || session.courtCount || 1,
        courtHandling: config.courtHandling || "queue",
        allowNotStrictDoubles: Boolean(config.allowNotStrictDoubles && config.teamSize === 2),
        advanced: normalizeAdvancedForConfig(
            config.advanced || getDefaultAdvancedSettings(),
            config.allowNotStrictDoubles,
        ),
        seed: config.seed || null,
    }
}

function buildHistoryRemixPayload(session) {
    if (!session) {
        return null
    }

    const payload = {
        version: HISTORY_REMIX_VERSION,
        sourceMode: session.mode || "free",
        players: Array.isArray(session.players) ? [...session.players] : [],
    }

    if (session.mode === "tournament") {
        const tournamentConfig = buildTournamentRemixConfig(session)
        return tournamentConfig ? { ...payload, tournamentConfig } : payload
    }

    if (session.mode === "singles" || session.mode === "doubles") {
        return {
            ...payload,
            structuredConfig: {
                mode: session.mode,
                courtCount: session.courtCount || 1,
                allowNotStrictDoubles: session.mode === "doubles" ? Boolean(session.allowNotStrictDoubles) : false,
            },
        }
    }

    return {
        ...payload,
        freeConfig: {
            teamCount: session.teamCount || 2,
        },
    }
}

function countMissingPlayers(players, rosterSet) {
    let missing = 0
    for (const player of players) {
        if (!rosterSet.has(player)) {
            missing += 1
        }
    }
    return missing
}

function buildSeededHistoryDetail(session, action, skippedPlayers) {
    const phaseLabel = isMultiPhaseHistorySession(session) ? "latest saved phase" : "history"
    let message = `Tournament settings loaded from ${phaseLabel}`
    if (action === HISTORY_REMIX_ACTIONS.sameSeed) {
        message = `Tournament settings loaded from ${phaseLabel} with the original seed locked`
    } else if (action === HISTORY_REMIX_ACTIONS.newSeed) {
        message = `Tournament settings loaded from ${phaseLabel}; a fresh seed will be generated when you start`
    }

    if (skippedPlayers <= 0) {
        return message
    }

    const noun = skippedPlayers === 1 ? "player was" : "players were"
    return `${message}; ${skippedPlayers} ${noun} skipped because they are no longer in the roster`
}

function getRemixPlayers(session) {
    if (Array.isArray(session?.remix?.players)) {
        return session.remix.players
    }
    return Array.isArray(session?.players) ? session.players : []
}

function resolveSelectedPlayers(session, roster) {
    const rosterSet = new Set(roster)
    const sourcePlayers = getRemixPlayers(session)
    return {
        selectedPlayers: sourcePlayers.filter((player) => rosterSet.has(player)),
        skippedPlayers: countMissingPlayers(sourcePlayers, rosterSet),
    }
}

function resolveLegacyTournamentTeamSize(series, session) {
    if (series?.matchType === "doubles") {
        return 2
    }
    if (series?.matchType === "singles") {
        return 1
    }
    return session?.tournamentTeamSize || 1
}

function deriveLegacyTournamentConfig(session) {
    const series = session?.tournamentSeries
    return {
        format: series?.format || session?.tournamentFormat || "consolation",
        teamSize: resolveLegacyTournamentTeamSize(series, session),
        courtCount: series?.courtCount || session?.courtCount || 1,
        courtHandling: series?.courtHandling || "queue",
        allowNotStrictDoubles: Boolean(series?.allowNotStrictDoubles || session?.allowNotStrictDoubles),
        advanced: cloneAdvancedSettings(getDefaultAdvancedSettings()),
        seed: null,
    }
}

function buildTournamentPrefill(session, action) {
    const remixConfig = session?.remix?.tournamentConfig
    const sourcePlayers = getRemixPlayers(session)
    const tournamentConfig = remixConfig
        ? {
              ...remixConfig,
              advanced: cloneAdvancedSettings(remixConfig.advanced || getDefaultAdvancedSettings()),
          }
        : deriveLegacyTournamentConfig(session)

    return {
        gameMode: "tournament",
        tournament: {
            format: tournamentConfig.format,
            teamSize: tournamentConfig.teamSize,
            courtCount: tournamentConfig.courtCount,
            allowNotStrictDoubles: Boolean(tournamentConfig.allowNotStrictDoubles && tournamentConfig.teamSize === 2),
            advanced: cloneAdvancedSettings(tournamentConfig.advanced),
            seedOverride:
                action === HISTORY_REMIX_ACTIONS.sameSeed && tournamentConfig.seed ? tournamentConfig.seed : null,
            seedOverrideSignature:
                action === HISTORY_REMIX_ACTIONS.sameSeed && tournamentConfig.seed
                    ? buildTournamentSeedSignature(sourcePlayers, tournamentConfig)
                    : "",
        },
    }
}

function buildStructuredPrefill(session) {
    const structuredConfig = session?.remix?.structuredConfig
    const mode = structuredConfig?.mode || session?.mode || "singles"
    return {
        gameMode: mode,
        structured: {
            courtCount: structuredConfig?.courtCount || session?.courtCount || 1,
            allowNotStrictDoubles: mode === "doubles" ? Boolean(structuredConfig?.allowNotStrictDoubles) : false,
        },
    }
}

function buildFreePrefill(session) {
    return {
        gameMode: "free",
        free: {
            teamCount: session?.remix?.freeConfig?.teamCount || session?.teamCount || 2,
        },
    }
}

function buildHistorySeedMetadata(session, action) {
    const latestPhaseLabel = isMultiPhaseHistorySession(session) ? "Latest Saved Phase" : "Saved Session"
    return {
        sourceLabel: latestPhaseLabel,
        variant:
            action === HISTORY_REMIX_ACTIONS.sameSeed ? HISTORY_SEED_VARIANTS.sameSeed : HISTORY_SEED_VARIANTS.newSeed,
        detail: buildSeededHistoryDetail(session, action, 0),
        lockedFields: {
            roster: true,
            format: true,
            teamSize: true,
            courtCount: true,
            allowNotStrictDoubles: true,
            advanced: true,
        },
    }
}

function buildHistoryRemixPrefill(session, action, roster) {
    const { selectedPlayers, skippedPlayers } = resolveSelectedPlayers(session, roster)
    const mode = session?.remix?.sourceMode || session?.mode || "free"
    if (action === HISTORY_REMIX_ACTIONS.reusePlayers) {
        return {
            currentStep: "roster",
            selectedPlayers,
            notice: "",
            gameMode: null,
            continuation: null,
            historySeed: null,
        }
    }

    let modePrefill

    if (mode === "tournament") {
        modePrefill = buildTournamentPrefill(session, action)
    } else if (mode === "singles" || mode === "doubles") {
        modePrefill = buildStructuredPrefill(session)
    } else {
        modePrefill = buildFreePrefill(session)
    }

    return {
        currentStep: "setup",
        selectedPlayers,
        notice: "",
        historySeed: {
            ...buildHistorySeedMetadata(session, action),
            detail: buildSeededHistoryDetail(session, action, skippedPlayers),
        },
        ...modePrefill,
    }
}

export { HISTORY_REMIX_ACTIONS, HISTORY_SEED_VARIANTS, buildHistoryRemixPayload, buildHistoryRemixPrefill }
