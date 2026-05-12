function getViews(documentRef = document) {
    return {
        roster: documentRef.getElementById("view-roster"),
        session: documentRef.getElementById("view-session"),
        stats: documentRef.getElementById("view-stats"),
        ratings: documentRef.getElementById("view-ratings"),
        history: documentRef.getElementById("view-history"),
    }
}

function getHistoryDom(documentRef) {
    return {
        list: documentRef.getElementById("history-list"),
        empty: documentRef.getElementById("history-empty"),
        exportButton: documentRef.getElementById("history-export-btn"),
        importButton: documentRef.getElementById("history-import-btn"),
        clearButton: documentRef.getElementById("history-clear-btn"),
        importInput: documentRef.getElementById("history-import-input"),
        backupSummary: documentRef.getElementById("history-backup-summary"),
        backupStatus: documentRef.getElementById("history-backup-status"),
    }
}

function getRatingDom(documentRef) {
    return {
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
    }
}

function getHistorySessionDialogDom(documentRef) {
    return {
        dialog: documentRef.getElementById("history-session-dialog"),
        kicker: documentRef.getElementById("history-session-dialog-kicker"),
        title: documentRef.getElementById("history-session-dialog-title"),
        meta: documentRef.getElementById("history-session-dialog-meta"),
        body: documentRef.getElementById("history-session-dialog-body"),
        actions: documentRef.getElementById("history-session-dialog-actions"),
        closeButton: documentRef.getElementById("history-session-dialog-close"),
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
        history: getHistoryDom(documentRef),
        stats: {
            root: documentRef.getElementById("stats-root"),
        },
        ratings: getRatingDom(documentRef),
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
        historySessionDialog: getHistorySessionDialogDom(documentRef),
    }
}

export { getAppDom }
