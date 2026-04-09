function buildPlayerRemovalPlan(name, activeSession, canSaveActiveSession) {
    const includesActivePlayer = activeSession?.players.includes(name) === true
    if (!includesActivePlayer) {
        return {
            includesActivePlayer: false,
            message: `Remove "${name}" from the roster?`,
        }
    }

    const baseMessage = `Remove "${name}" from the roster?\nThis will also end the active session because its saved schedule can no longer be reconciled safely.`
    if (canSaveActiveSession) {
        return {
            includesActivePlayer: true,
            canSaveActiveSession: true,
            message: baseMessage,
            okLabel: "Save & Remove",
            okClass: "btn-primary",
            extraLabel: "Discard Session & Remove",
        }
    }

    return {
        includesActivePlayer: true,
        canSaveActiveSession: false,
        message: baseMessage,
        okLabel: "Discard Session & Remove",
        okClass: "btn-danger",
    }
}

export { buildPlayerRemovalPlan }
