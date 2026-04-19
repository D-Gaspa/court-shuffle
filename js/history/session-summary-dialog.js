import { exportSummaryCardAsPng } from "./session-summary-export.js"
import { buildSessionSummaryReport } from "./session-summary-report.js"

function reportExportFailure(appStatus) {
    appStatus.set({
        ok: false,
        code: "summary_export_failed",
        message: "Session summary PNG export failed in this browser.",
        error: null,
        source: "save",
    })
}

function createSessionSummaryDialogController({ appStatus, elements }) {
    const { closeButton, dialog, exportButton, report, subtitle, title } = elements
    let currentSummary = null

    function renderSummary(summary) {
        currentSummary = summary
        title.textContent = "Session Summary"
        subtitle.textContent = `${new Date(summary.date).toLocaleDateString()} · ${summary.matchSummary.played} games · ${summary.leaderboardMode === "singles" ? "Singles" : "Doubles"}`
        report.replaceChildren(buildSessionSummaryReport(summary))
    }

    function show(summaryEntry) {
        if (!summaryEntry) {
            return
        }
        renderSummary(summaryEntry.sessionSummary || summaryEntry)
        document.body.classList.add("has-modal-open")
        dialog.showModal()
    }

    function setup() {
        closeButton.addEventListener("click", () => dialog.close())
        dialog.addEventListener("close", () => document.body.classList.remove("has-modal-open"))
        exportButton.addEventListener("click", () => {
            if (!currentSummary) {
                return
            }
            try {
                exportSummaryCardAsPng(currentSummary)
            } catch {
                reportExportFailure(appStatus)
            }
        })
    }

    return {
        setup,
        show,
    }
}

export { createSessionSummaryDialogController }
