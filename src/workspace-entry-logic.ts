import { Workspace } from "./obj/workspace";
import { PopupActions } from "./popup-actions";
import { Prompt } from "./utils/prompt";
import DELETE_WORKSPACE_DIALOG_TEMPLATE from "./templates/deleteWorkspaceDialogTemplate.html";
import WORKSPACE_TEMPLATE from "./templates/workspaceElemTemplate.html";
import { Utils } from "./utils";
import { WorkspaceStorage } from "./workspace-storage";
import { PopupMessageHelper } from "./messages/popup-message-helper";
import { MessageResponses } from "./constants/message-responses";
import { StorageHelper } from "./storage-helper";
import type { IRequestMoveWorkspace } from "./interfaces/messages";

/**
 * Logic for the workspace entry in the popup.
 */
export class WorkspaceEntryLogic {
    private static draggedUuid?: string;
    private static savingOrder = false;

    /** Switch reorder mode, update the pressed state, and clear feedback from the last move. */
    public static toggleReorder() {
        const list = document.getElementById("workspaces-list")!;
        const toggle = document.getElementById("workspace-reorder-toggle")!;
        const reordering = list.toggleAttribute("data-reordering");
        toggle.setAttribute("aria-pressed", String(reordering));
        document.getElementById("workspace-reorder-status")!.textContent = "";
    }

    /**
     * Render the saved order, identify open workspaces, and label each row action.
     * Exit reorder mode when the refreshed list has fewer than two workspaces.
     */
    public static listWorkspaces(workspaces: WorkspaceStorage, allWindowIds: (number | undefined)[]) {
        console.debug("listWorkspaces", workspaces)

        const workspaceDiv = document.getElementById("workspaces-list");
        if (!workspaceDiv) {
            console.error("Could not find workspace div");
            return;
        }
        workspaceDiv.innerHTML = "";

        const ordered = workspaces.listInOrder();
        const toggle = document.getElementById("workspace-reorder-toggle")!;
        toggle.hidden = ordered.length < 2;
        if (toggle.hidden && workspaceDiv.hasAttribute("data-reordering")) {
            this.toggleReorder();
        }

        ordered.forEach((workspace, index) => {
            const workspaceElement = this.addWorkspace(workspaceDiv, workspace);
            workspaceElement.dataset.workspaceUuid = workspace.uuid;
            const openWorkspace = workspaceElement.querySelector('.workspace-item-interior');
            const editWorkspace = workspaceElement.querySelector<HTMLElement>('#edit-button');
            const deleteWorkspace = workspaceElement.querySelector<HTMLElement>('#delete-button');

            for (const [icon, action] of [[editWorkspace, "Rename"], [deleteWorkspace, "Delete"]] as const) {
                if (!icon) continue;
                icon.title = `${ action } ${ workspace.name }`;
                icon.setAttribute("aria-label", icon.title);
            }

            if (allWindowIds.includes(workspace.windowId)) {
                workspaceElement.classList.add('workspace-open');
            }
            openWorkspace?.addEventListener('click', () => {
                if (!workspaceDiv.hasAttribute("data-reordering")) {
                    this.workspaceClicked(workspace);
                }
            });

            editWorkspace?.addEventListener('click', (event) => {
                event.stopPropagation();
                this.workspaceEditClicked(workspace);
            });

            deleteWorkspace?.addEventListener('click', (event) => {
                event.stopPropagation();
                this.workspaceDeleteClicked(workspace);
            });

            this.bindMoveButton(workspaceElement, workspace, ordered[index - 1], "before", allWindowIds);
            this.bindMoveButton(workspaceElement, workspace, ordered[index + 1], "after", allWindowIds);
            this.bindDrag(workspaceElement, workspace, allWindowIds);
        });
    }

    /** Bind an adjacent move by UUID and disable the control at the edge of the list. */
    private static bindMoveButton(
        row: HTMLElement, workspace: Workspace, neighbor: Workspace | undefined,
        placement: "before" | "after", allWindowIds: (number | undefined)[]
    ) {
        const direction = placement === "before" ? "up" : "down";
        const button = row.querySelector<HTMLButtonElement>(`.workspace-move-${ direction }`)!;
        const label = `Move ${ workspace.name } ${ direction }`;
        button.setAttribute("aria-label", label);
        button.title = label;
        button.disabled = !neighbor;
        button.addEventListener("click", () => {
            if (neighbor) {
                void this.moveWorkspace({ uuid: workspace.uuid, targetUuid: neighbor.uuid, placement }, allWindowIds, button);
            }
        });
    }

    /** Track drags that start at a row handle and use the destination row's midpoint to indicate placement. */
    private static bindDrag(row: HTMLElement, workspace: Workspace, allWindowIds: (number | undefined)[]) {
        const handle = row.querySelector<HTMLElement>(".workspace-drag-handle")!;
        handle.title = `Drag ${ workspace.name } to reorder`;
        handle.addEventListener("dragstart", event => {
            if (this.savingOrder || !event.dataTransfer) {
                event.preventDefault();
                return;
            }
            this.draggedUuid = workspace.uuid;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", workspace.uuid);
        });
        handle.addEventListener("dragend", () => {
            this.draggedUuid = undefined;
            row.parentElement?.querySelector("[data-drop-placement]")?.removeAttribute("data-drop-placement");
        });
        row.addEventListener("dragover", event => {
            if (!this.draggedUuid || this.draggedUuid === workspace.uuid || !event.dataTransfer) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const bounds = row.getBoundingClientRect();
            row.dataset.dropPlacement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
        });
        row.addEventListener("dragleave", event => {
            // Moving between a row's children keeps the drop indicator on that row.
            if (!(event.relatedTarget instanceof Node) || !row.contains(event.relatedTarget)) {
                delete row.dataset.dropPlacement;
            }
        });
        row.addEventListener("drop", event => {
            const uuid = this.draggedUuid;
            const placement = row.dataset.dropPlacement;
            if (!uuid || !placement) return;
            event.preventDefault();
            this.draggedUuid = undefined;
            delete row.dataset.dropPlacement;
            void this.moveWorkspace({ uuid, targetUuid: workspace.uuid, placement: placement === "before" ? "before" : "after" }, allWindowIds);
        });
    }

    /**
     * Save one move at a time so each gesture uses the latest rendered neighbors.
     * Rebuild from the background response and restore keyboard focus when the moved control still owns it.
     */
    private static async moveWorkspace(
        payload: IRequestMoveWorkspace["payload"], allWindowIds: (number | undefined)[], button?: HTMLButtonElement
    ) {
        if (this.savingOrder) return;
        this.savingOrder = true;
        const status = document.getElementById("workspace-reorder-status")!;
        status.removeAttribute("data-move-succeeded");
        status.textContent = "";
        try {
            const response = await PopupMessageHelper.sendMoveWorkspace(payload);
            // A stale move can still return the latest list, for example if the destination was deleted.
            if (response.data) {
                const restoreFocus = button && document.activeElement === button;
                const workspaces = StorageHelper.workspacesFromJson(response);
                this.listWorkspaces(workspaces, allWindowIds);
                const list = document.getElementById("workspaces-list")!;
                if (restoreFocus) {
                    const row = list.hasAttribute("data-reordering")
                        ? Array.from(list.children).find(element => (element as HTMLElement).dataset.workspaceUuid === payload.uuid)
                        : undefined;
                    const preferred = payload.placement === "before" ? "up" : "down";
                    const nextFocus = row?.querySelector<HTMLButtonElement>(`.workspace-move-${ preferred }:enabled`)
                        ?? row?.querySelector<HTMLButtonElement>(".workspace-move-buttons button:enabled")
                        ?? document.querySelector<HTMLElement>("#workspace-reorder-toggle:not([hidden])")
                        ?? document.querySelector<HTMLElement>(".header-bar h1");
                    nextFocus?.focus();
                }
                if (response.message === MessageResponses.SUCCESS.message) {
                    const ordered = workspaces.listInOrder();
                    const index = ordered.findIndex(workspace => workspace.uuid === payload.uuid);
                    status.textContent = `${ ordered[index].name } is at position ${ index + 1 } of ${ ordered.length }.`;
                    status.setAttribute("data-move-succeeded", "");
                    return;
                }
            }
            status.textContent = "Could not move the workspace.";
        }
        catch (error) {
            console.error("Could not move the workspace", error);
            status.textContent = "Could not move the workspace.";
        }
        finally {
            this.savingOrder = false;
        }
    }

    /** Render a row with the workspace name as literal text so names cannot alter its controls. */
    private static addWorkspace(parentNode: HTMLElement, workspace: Workspace): HTMLElement {
        const res = Utils.interpolateTemplate(WORKSPACE_TEMPLATE, {
            workspaceId: workspace.windowId,
            tabsCount: workspace.getTabs().length
        });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = res;
        const workspaceElement = tempDiv.firstElementChild as HTMLElement;

        if (parentNode instanceof Node && workspaceElement != null) {
            workspaceElement.querySelector(".workspace-name")!.textContent = workspace.name;
            parentNode.appendChild(workspaceElement);
            return workspaceElement;
        }
        else {
            throw new Error("parentNode must be a valid DOM node");
        }
    }

    /**
     * Called when a workspace is clicked.
     * @param workspaceId -
     */
    public static workspaceClicked(workspace: Workspace) {
        PopupActions.openWorkspace(workspace);
    }

    /**
     * Called when a workspace's settings button is clicked.
     * @param workspaceId -
     */
    public static workspaceSettingsClicked(workspace: Workspace) {
        console.debug("workspaceSettingsClicked", workspace);
        // Actions.openWorkspaceSettings(workspace.uuid);
    }

    /**
     * Called when a workspace's edit button is clicked.
     * 
     * Start the process of renaming the workspace:
     * 1. Prompt the user for a new name.
     * 2. Send a message to the background script to rename the workspace.
     * 3. Update the workspace list.
     * @param workspaceId -
     */
    public static async workspaceEditClicked(workspace: Workspace) {
        console.debug("workspaceEditClicked", workspace);
        const newName = await Prompt.createPrompt("Enter a new name for the workspace");
        if (newName === null || newName === "" || newName === workspace.name) {
            console.info("User canceled or entered the same name");
            return;
        }
        PopupActions.renameWorkspace(workspace, newName);
    }

    /**
     * Called when a workspace's delete button is clicked.
     * @param workspace - The workspace to delete if the user confirms.
     */
    public static workspaceDeleteClicked(workspace: Workspace) {
        const template = document.createElement("template");
        template.innerHTML = DELETE_WORKSPACE_DIALOG_TEMPLATE;
        const dialog = template.content.querySelector("dialog")!;
        dialog.querySelector("#delete-workspace-message")!.textContent =
            `Are you sure you want to delete the workspace "${ workspace.name }"?`;

        dialog.addEventListener("close", () => {
            dialog.remove();
            if (dialog.returnValue === "delete") {
                PopupActions.deleteWorkspace(workspace);
            }
        }, { once: true });

        document.body.appendChild(dialog);
        dialog.showModal();
    }
}
