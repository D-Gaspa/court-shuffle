import { getAvatarClass, getInitials } from "../../roster/render.js"
import { createPanelHeader, createTrustPill } from "./dom.js"
import { formatCountLabel, formatInteger, formatRecord, formatSignedNumber } from "./format.js"
import { createArchivePanel } from "./ratings-archive.js"
import { createRatingsHero } from "./ratings-hero.js"
import { createTrendPanel } from "./ratings-trend.js"

const PERCENT_SCALE = 100

function createEl(tag, className, text) {
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function buildRatingsSection({
    isArchivedView,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPlayer,
    onBackToActiveSeason,
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onSelectMode,
    onSelectPlayer,
    onStartSeason,
}) {
    const wrap = createEl("div", "stats-section-grid")
    wrap.appendChild(
        createRatingsHero({
            isArchivedView,
            onBackToActiveSeason,
            onStartSeason,
            ratingsModel,
            ratingsState,
            selectedMode,
            onSelectMode,
        }),
    )
    if (!ratingsModel.season) {
        wrap.appendChild(createSeasonEmptyPanel(onStartSeason))
        wrap.appendChild(createArchivePanel(ratingsState, { onDeleteArchivedSeason, onOpenArchivedSeason }))
        return wrap
    }

    const ladder = ratingsModel.ladders[selectedMode]
    if (ladder.leaderboard.length === 0) {
        wrap.appendChild(createEmptyLadderPanel(ratingsModel.season, selectedMode))
        wrap.appendChild(createArchivePanel(ratingsState, { onDeleteArchivedSeason, onOpenArchivedSeason }))
        return wrap
    }

    wrap.appendChild(createRatingsColumns({ ladder, selectedPlayer, onSelectPlayer }))
    wrap.appendChild(
        createTrendPanel({ isArchivedView, ladder, selectedPlayer, season: ratingsModel.season, selectedMode }),
    )
    wrap.appendChild(
        createArchivePanel(ratingsState, {
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            selectedSeasonId: ratingsModel.season.id,
        }),
    )
    return wrap
}

function createSeasonEmptyPanel(onStartSeason) {
    const panel = createEl("section", "stats-panel stats-panel-ratings-empty")
    panel.appendChild(
        createPanelHeader("No active rating season", "Ratings stay dormant until a labeled season is started."),
    )
    panel.appendChild(
        createEl(
            "p",
            "stats-relationship-empty",
            "Start a season to replay current active history into a live singles and doubles ladder.",
        ),
    )
    const button = createEl("button", "btn btn-primary stats-ratings-panel-btn", "Start Rating Season")
    button.type = "button"
    button.addEventListener("click", onStartSeason)
    panel.appendChild(button)
    return panel
}

function createEmptyLadderPanel(season, selectedMode) {
    const panel = createEl("section", "stats-panel stats-panel-ratings-empty")
    panel.appendChild(
        createPanelHeader(
            `${season.label} ${selectedMode} ladder`,
            "The season is active, but no eligible rated matches have landed in this ladder yet.",
        ),
    )
    panel.appendChild(
        createEl(
            "p",
            "stats-relationship-empty",
            selectedMode === "singles"
                ? "Save at least one decided singles tournament match in this season to populate the ladder."
                : "Save at least one decided doubles tournament match in this season to populate the ladder.",
        ),
    )
    return panel
}

function createRatingsColumns({ ladder, selectedPlayer, onSelectPlayer }) {
    const columns = createEl("div", "stats-columns")
    columns.appendChild(createLeaderboardPanel(ladder, selectedPlayer, onSelectPlayer))
    columns.appendChild(createPlayerRatingPanel(ladder, selectedPlayer))
    return columns
}

function createLeaderboardPanel(ladder, selectedPlayer, onSelectPlayer) {
    const section = createEl("section", "stats-panel stats-panel-rail")
    section.appendChild(createPanelHeader("Leaderboard", "Select a player to inspect this season in more detail."))
    const list = createEl("div", "roster-list stats-player-list")
    for (let index = 0; index < ladder.leaderboard.length; index += 1) {
        const playerName = ladder.leaderboard[index]
        list.appendChild(
            createLeaderboardRow({
                index,
                playerName,
                player: ladder.players[playerName],
                selected: playerName === selectedPlayer,
                onSelectPlayer,
            }),
        )
    }
    section.appendChild(list)
    return section
}

function createLeaderboardRow({ index, onSelectPlayer, player, playerName, selected }) {
    const button = createEl("button", `roster-item stats-player-row stats-ratings-row${selected ? " is-selected" : ""}`)
    button.type = "button"
    button.appendChild(createAvatar(playerName, index))
    button.appendChild(createLeaderboardBody(playerName, index, player))
    button.addEventListener("click", () => onSelectPlayer(playerName))
    return button
}

function createAvatar(playerName, index) {
    const avatar = createEl("div", `player-avatar ${getAvatarClass(index)}`)
    avatar.textContent = getInitials(playerName).toUpperCase()
    return avatar
}

function createLeaderboardBody(playerName, index, player) {
    const body = createEl("div", "stats-ratings-row-body")
    body.appendChild(createEl("span", "player-name stats-ratings-player-name", playerName))
    const summary = createEl("div", "stats-ratings-row-summary")
    summary.appendChild(createEl("span", "stats-ratings-rank", `Rank #${index + 1}`))
    const top = createEl("div", "stats-ratings-row-topline")
    top.appendChild(createEl("strong", "stats-ratings-rating-value", formatInteger(player.rating)))
    top.appendChild(createRatingPill(formatSignedNumber(player.deltaFromStart, 0), "delta"))
    summary.appendChild(top)
    body.appendChild(summary)

    const meta = createEl("div", "stats-player-row-meta stats-ratings-row-meta")
    meta.appendChild(createRatingPill(formatCountLabel(player.ratedMatchCount, "rated match"), "matches"))
    if (player.provisional) {
        meta.appendChild(createRatingPill("Provisional", "provisional"))
    }
    body.appendChild(meta)
    return body
}

function createRatingPill(text, tone) {
    return createEl("span", `stats-player-row-pill stats-ratings-pill-${tone}`, text)
}

function createPlayerRatingPanel(ladder, selectedPlayer) {
    const player = ladder.players[selectedPlayer]
    const section = createEl("section", "stats-panel stats-panel-summary")
    section.appendChild(createPanelHeader(selectedPlayer, "Season rating dossier"))
    section.appendChild(createDossierSummary(player))
    const grid = createEl("div", "stats-summary-grid stats-ratings-dossier-grid")
    grid.appendChild(createMetricCard("Rating", formatInteger(player.rating), "Current ladder"))
    grid.appendChild(createMetricCard("Season Delta", formatSignedNumber(player.deltaFromStart, 0), "From baseline"))
    grid.appendChild(createMetricCard("Record", formatRecord(player.wins, player.losses), "Rated only"))
    grid.appendChild(createMetricCard("Rated Matches", String(player.ratedMatchCount), "This season"))
    grid.appendChild(createMetricCard("Season High", formatInteger(player.seasonHigh), "Peak rating"))
    grid.appendChild(createMetricCard("Season Low", formatInteger(player.seasonLow), "Floor rating"))
    grid.appendChild(
        createMetricCard(
            "Win Share",
            player.ratedMatchCount > 0 ? `${Math.round((player.wins / player.ratedMatchCount) * PERCENT_SCALE)}%` : "—",
            "Rated only",
        ),
    )
    section.appendChild(grid)
    const chips = createEl("div", "stats-relationship-meta stats-ratings-dossier-chips")
    chips.appendChild(createTrustPill(`${formatCountLabel(player.ratedMatchCount, "rated match")}`))
    chips.appendChild(createTrustPill(`Trend points: ${player.trend.length}`))
    chips.appendChild(createTrustPill(player.provisional ? "Moves faster while provisional" : "Standard K-factor"))
    section.appendChild(chips)
    return section
}

function createDossierSummary(player) {
    const summary = createEl("div", "stats-ratings-dossier-summary")
    summary.appendChild(createDossierHighlight("Current", formatInteger(player.rating)))
    summary.appendChild(createDossierHighlight("Delta", formatSignedNumber(player.deltaFromStart, 0)))
    summary.appendChild(createDossierHighlight("Record", formatRecord(player.wins, player.losses)))
    return summary
}

function createDossierHighlight(label, value) {
    const item = createEl("div", "stats-ratings-dossier-highlight")
    item.appendChild(createEl("span", "stats-ratings-dossier-label", label))
    item.appendChild(createEl("strong", "stats-ratings-dossier-value", value))
    return item
}

function createMetricCard(label, value, caption) {
    const card = createEl("div", "stats-metric-card stats-ratings-metric-card")
    card.appendChild(createEl("span", "stats-metric-label", label))
    card.appendChild(createEl("strong", "stats-metric-value", value))
    card.appendChild(createEl("span", "stats-metric-caption", caption))
    return card
}

export { buildRatingsSection }
