(async function () {
    document.addEventListener("DOMContentLoaded", () => {
        const openSidebarBtn = document.getElementById("open-sidebar");
        openSidebarBtn?.addEventListener("click", () => {
            browser.sidebarAction.open();
        });

    });
})();