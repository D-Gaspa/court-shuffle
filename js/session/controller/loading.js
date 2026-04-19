function showSessionLoading({ overlay, message, text }) {
    if (message) {
        message.textContent = text
    }
    if (overlay) {
        overlay.hidden = false
    }
    document.body.classList.add("is-session-loading")
}

function hideSessionLoading(overlay) {
    if (overlay) {
        overlay.hidden = true
    }
    document.body.classList.remove("is-session-loading")
}

function waitForNextPaint() {
    return new Promise((resolve) => {
        setTimeout(() => {
            requestAnimationFrame(resolve)
        }, 0)
    })
}

export { hideSessionLoading, showSessionLoading, waitForNextPaint }
