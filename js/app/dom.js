function getViews(documentRef = document) {
    return {
        roster: documentRef.getElementById("view-roster"),
        session: documentRef.getElementById("view-session"),
        stats: documentRef.getElementById("view-stats"),
        ratings: documentRef.getElementById("view-ratings"),
        history: documentRef.getElementById("view-history"),
    }
}

function getAppDom(documentRef = document) {
    return {
        tabs: documentRef.querySelectorAll(".tab"),
        views: getViews(documentRef),
        appStatus: {
            banner: documentRef.getElementById("app-status-banner"),
            dismissButton: documentRef.getElementById("app-status-dismiss"),
            message: documentRef.getElementById("app-status-message"),
        },
        history: {
            list: documentRef.getElementById("history-list"),
            empty: documentRef.getElementById("history-empty"),
            exportButton: documentRef.getElementById("history-export-btn"),
            importButton: documentRef.getElementById("history-import-btn"),
            clearButton: documentRef.getElementById("history-clear-btn"),
            importInput: documentRef.getElementById("history-import-input"),
            backupSummary: documentRef.getElementById("history-backup-summary"),
            backupStatus: documentRef.getElementById("history-backup-status"),
        },
        stats: {
            root: documentRef.getElementById("stats-root"),
        },
        ratings: {
            root: documentRef.getElementById("ratings-root"),
            seasonDialog: {
                dialog: documentRef.getElementById("season-label-dialog"),
                title: documentRef.getElementById("season-label-title"),
                message: documentRef.getElementById("season-label-message"),
                input: documentRef.getElementById("season-label-input"),
                dateInput: documentRef.getElementById("season-start-date-input"),
                dateHint: documentRef.getElementById("season-start-date-hint"),
                oldestDateButton: documentRef.getElementById("season-oldest-date-btn"),
                error: documentRef.getElementById("season-label-error"),
                cancelButton: documentRef.getElementById("season-label-cancel"),
                confirmButton: documentRef.getElementById("season-label-confirm"),
            },
        },
        confirmDialog: {
            dialog: documentRef.getElementById("confirm-dialog"),
            title: documentRef.getElementById("confirm-title"),
            message: documentRef.getElementById("confirm-message"),
            cancelButton: documentRef.getElementById("confirm-cancel"),
            extraButton: documentRef.getElementById("confirm-extra"),
            okButton: documentRef.getElementById("confirm-ok"),
        },
        sessionSummaryDialog: {
            dialog: documentRef.getElementById("session-summary-dialog"),
            title: documentRef.getElementById("session-summary-title"),
            subtitle: documentRef.getElementById("session-summary-subtitle"),
            report: documentRef.getElementById("session-summary-report"),
            closeButton: documentRef.getElementById("session-summary-close"),
            exportButton: documentRef.getElementById("session-summary-export"),
        },
    }
}

export { getAppDom }
