import { definePlugin, playSectionClasses, AppDetails } from 'millennium';
import { log, renderComponent, waitForElement } from './utils';
import { onPopupCreate, onLocationChange, PopupType } from 'steambrew-utils/watchers';

async function patch(window: Window, appId: number) {
	const details = globalThis.window.appDetailsStore.GetAppDetails(appId);
	await renderLaunchOptionsShortcut(window, details);
}

async function renderLaunchOptionsShortcut(window: Window, appDetails: AppDetails) {
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

	const adoPanel = await waitForElement(window.document.documentElement, 'div[class*="AppDetailsOverviewPanel Panel"]'); //window.document.querySelector('div[class*="AppDetailsOverviewPanel Panel"]');
	if (!adoPanel) {
		log('The AppDetailsOverviewPanel was not found within the timeout. Skipping rendering.');
		return;
	}

	const parent = adoPanel.querySelector(`.${PlayBar.GameStatsSection}`);
	if (!parent) {
		log('Parent element not found. Skipping.');
		return;
	}

	if (parent.querySelector("#launch-options-input")) {
		log('Launch options input already exists. Skipping rendering.');
		return;
	}

	const anchorClass = `.${PlayBar.GameStat}.GameStat.${PlayBar.Playtime}.Playtime`;
	log('Anchor class: ', anchorClass);
	const anchor = adoPanel.querySelector(anchorClass);
	if (anchor) {
		log('Anchor element found. Rendering component.');
		renderComponent(parent, shortcut, anchor);
	}
	else {
		log('Anchor element not found. Rendering component without anchor.');
		renderComponent(parent, shortcut);
	}
}

function initializePlugin(): () => void {
	// from copilot:
	// caveat in your current code:
	// - patch(pw, appId) renders the input immediately before you register the callback, 
	// 		but React may not have committed it to the DOM yet. If the callback fires 
	// 		before the input exists, your query returns null and the update is skipped.

	let unregisterLocChange: (() => void) | undefined;
	const { Unregister: unregisterCreate } = onPopupCreate((popup, type) => {
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
		unregisterLocChange = onLocationChange(
			() => {
				if (type === PopupType.Desktop) {
					return Reflect.get(globalThis, "MainWindowBrowserManager")?.m_lastLocation;
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
	return () => {
		log('plugin being dismounted');
		unregisterCreate?.();
		unregisterLocChange?.();
	};
}

export default definePlugin(() => {
	const unregister = initializePlugin();
	
	return {
		title: 'Launch Options Shortcut',
		icon: <></>,
		onDismount: unregister,
	};
});
