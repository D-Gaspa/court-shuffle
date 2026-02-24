let visibilityObserver = null

const FULLY_VISIBLE_RATIO = 0.999
const MOBILE_BREAKPOINT_QUERY = "(max-width: 640px)"

function disconnectObserver() {
    visibilityObserver?.disconnect()
    visibilityObserver = null
}

function resetGoTopButtonVisibility(bottomActions) {
    if (bottomActions) {
        bottomActions.hidden = true
    }
    disconnectObserver()
}

function isMobileViewport() {
    if (typeof globalThis.matchMedia !== "function") {
        return false
    }
    return globalThis.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
}

function getStickyTopOffset() {
    const topbar = document.querySelector(".topbar")
    if (!(topbar instanceof HTMLElement)) {
        return 0
    }
    return Math.ceil(topbar.getBoundingClientRect().height)
}

function syncGoTopButtonVisibility({ hasActiveSession, topButton, bottomActions }) {
    if (!bottomActions) {
        return
    }

    resetGoTopButtonVisibility(bottomActions)
    if (!(hasActiveSession && isMobileViewport()) || typeof IntersectionObserver !== "function" || !topButton) {
        return
    }

    const topOffset = getStickyTopOffset()
    visibilityObserver = new IntersectionObserver(
        ([entry]) => {
            const fullyVisible =
                Boolean(entry?.isIntersecting) && (entry?.intersectionRatio || 0) >= FULLY_VISIBLE_RATIO
            bottomActions.hidden = fullyVisible
        },
        {
            root: null,
            threshold: [0, 1],
            rootMargin: `-${topOffset}px 0px 0px 0px`,
        },
    )
    visibilityObserver.observe(topButton)
}

export { resetGoTopButtonVisibility, syncGoTopButtonVisibility }
