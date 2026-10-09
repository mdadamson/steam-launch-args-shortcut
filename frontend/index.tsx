import { 
	definePlugin, 
	playSectionClasses, 
	AppDetails
} from 'millennium';
import { Steam } from "steambrew-utils";
import { onLocationChange, onPopupCreate, PopupType } from "steambrew-utils/watchers";
import { ReactNode } from 'react';
import { createRoot } from "react-dom/client";

function log(...args: any[]) {
  	window.console.log('[Launch-Ops-Shortcut]', ...args);
}

async function patch(window: Window, appId: number) {
	const details = globalThis.window.appDetailsStore.GetAppDetails(appId);
	await render(window, details);
}

function renderComponent(parent: Element, component: ReactNode, anchor?: Element)
{
	const container = window.document.createElement('div');
	createRoot(container).render(component);
	if (anchor) {
		log('Inserting new element after anchor. Anchor: ', anchor);
		anchor.insertAdjacentElement("afterend", container);
	} else {
		log('Appending new element to parent. Parent: ', parent);
		parent.appendChild(container);
	}
}

function render(window: Window, appDetails: AppDetails)
{
	const PlayBar = playSectionClasses;
	const shortcut = (
		<div
			className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}
		>
			<div className={PlayBar.GameStatRight}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
					<div className={PlayBar.PlayBarLabel}>
						LAUNCH OPTIONS
					</div>
					<input 
						id="launch-options-input"
						onChange={(e) => { 
							globalThis.window.SteamClient.Apps.SetAppLaunchOptions(appDetails.unAppID, e.currentTarget.value);
						}}
						spellCheck="false" 
						style={{
							width: "150px",
							height: "15px",
							fontSize: "12px",
							fontFamily: "\"Motiva Sans\", Arial, Helvetica, sans-serif",
							color: "hsla(0, 0%, 100%, .52)",
							background: "rgba(59, 63, 72, 0.5)",
						}}
						type="text" 
						defaultValue={appDetails?.strLaunchOptions}
					/>
				</div>
			</div>
		</div>
	);

	const adoPanel = window.document.querySelector('div[class*="AppDetailsOverviewPanel Panel"]');
	if (!adoPanel || adoPanel.querySelector("#launch-options-input")) {
		log('adoPanel null or launch-options-input element FOUND. Skipping. adoPanel: ', adoPanel);
		return;
	}

	const parent = adoPanel.querySelector(`.${PlayBar.GameStatsSection}`);
	if (!parent) {
		log('Parent element not found. Skipping.');
		return;
	}

	renderComponent(parent, shortcut);
}

async function initializePlugin() {
	// from copilot:
	// caveat in your current code:
	// - patch(pw, appId) renders the input immediately before you register the callback, 
	// 		but React may not have committed it to the DOM yet. If the callback fires 
	// 		before the input exists, your query returns null and the update is skipped.

	// TODO: see if I can register for these events through the millenium sdk apis instead of steambrew/utils
	onPopupCreate((popup, type) => {
		const pw = popup.window;
		
		if (!pw)
		{
			log("popup.window is not available. popup.window: '", popup.window, "'");
			return;
		}

		if (type !== PopupType.Desktop && type !== PopupType.Gamepad)
		{
			log('Ignoring invalid popup type: ', type);
			return;
		}

		log('onPopupCreate called. popup: ', popup, ' type: ', type);

		// ===== Monitor Main Window Location ===== //
		onLocationChange(
			() => {
				if (type === PopupType.Desktop) {
					return Steam.MainWindowBrowserManager?.m_lastLocation;
				}
				else {
					return pw.opener?.location;
				}
			},
			async ({ pathname }) => {
				if (!pathname.startsWith("/library/app/")) {
					return;
				} 

				const appId = Number(pathname.split("/")[3]);
				if (Number.isNaN(appId)) return;

				await patch(pw, appId);
				window.SteamClient.Apps.RegisterForAppDetails(appId, (app) => {
					const adoPanel = pw.document.querySelector('div[class*="AppDetailsOverviewPanel Panel"]');
					const launchOptionsInput = adoPanel?.querySelector("#launch-options-input");
					if (!launchOptionsInput) {
						log('Launch options input not found in AppDetailsOverviewPanel.');
						return;
					}

					launchOptionsInput.value = app?.strLaunchOptions ?? "";
				});
			},
		);
  	});
	
	log('Frontend initialized');
}

export default definePlugin(() => {
	initializePlugin();
	
	return {
		title: 'Launch Options Shortcut',
		icon: <></>,
	};
});
