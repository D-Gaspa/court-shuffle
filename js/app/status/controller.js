function createAppStatusController({ banner, dismissButton, initialStatus = null, message }) {
    let currentStatus = initialStatus?.message ? initialStatus : null

    function render() {
        if (!(banner && message)) {
            return
        }
        if (!currentStatus?.message) {
            banner.hidden = true
            banner.dataset.tone = "warning"
            message.textContent = ""
            return
        }

        banner.hidden = false
        banner.dataset.tone = currentStatus.ok ? "info" : "warning"
        message.textContent = currentStatus.message
    }

    function set(status) {
        currentStatus = status?.message ? status : null
        render()
    }

    function clear(source = null) {
        if (source && currentStatus?.source !== source) {
            return
        }
        currentStatus = null
        render()
    }

    function bind() {
        dismissButton?.addEventListener("click", () => clear())
        render()
    }

    return { bind, clear, render, set }
}

export { createAppStatusController }
