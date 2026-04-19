export function iconButton({ className, label, svg, onClick }) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `btn-icon ${className || ""}`.trim()
    btn.setAttribute("aria-label", label)
    btn.title = label
    btn.innerHTML = svg
    btn.addEventListener("click", onClick)
    return btn
}
