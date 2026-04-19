function getSessionLoadingCopy(gameMode) {
    if (gameMode === "tournament") {
        return "Checking uniqueness rules, generating matchups, and preparing the session."
    }
    return "Balancing teams and preparing the session."
}

function createSessionBuilderWithLoading({
    buildSelectedSession,
    hideSessionLoading,
    overlay,
    message,
    showSessionLoading,
    waitForNextPaint,
}) {
    return async (options) => {
        showSessionLoading({
            overlay,
            message,
            text: getSessionLoadingCopy(options.gameMode),
        })
        await waitForNextPaint()
        try {
            return buildSelectedSession(options)
        } finally {
            hideSessionLoading(overlay)
        }
    }
}

export { createSessionBuilderWithLoading }
