import { 
	definePlugin, 
	Field,
	playSectionClasses, 
	AppDetails
} from 'millennium';
import { Steam } from "steambrew-utils";
import { onLocationChange, onPopupCreate, PopupType } from "steambrew-utils/watchers";
import { useEffect, useState, ReactNode } from 'react';
import { createRoot } from "react-dom/client";

const SettingsContent = () => {
	return <Field label="shuba" />;
};

const Icon = () => {
	const [icon, setIcon] = useState<string>();

	useEffect(() => {
		//log('Getting icon...');
		backend.getSteamBrewIconResource().then(setIcon);
	}, []);

	return (
		<div
			className="SteamClientHomebrewIcon"
			style={{
				width: '16px',
				height: '16px',
				marginRight: '5px',
			}}
			dangerouslySetInnerHTML={{ __html: icon }}
		/>
	);
};

/** @ffi */
export const hookedSettingsIcon = {
	SteamButton: () => <Icon />,
};

function logDbg(...args: any[]) {
  	window?.console.log('[DEBUG]', ...args);
}

async function patch(window: Window, appId: number) {
	logDbg('Patching...');
	//if (appId < NON_STEAM_APP_APPID_MASK) {
		const details = globalThis.window.appDetailsStore.GetAppDetails(appId);
		await render(window, details);
		return;
	//}

	// TODO: Implement patching for non-library app paths if necessary.
}

function renderComponent(parent: Element, component: ReactNode, anchor?: Element)
{
	const container = window.document.createElement('div');
	createRoot(container).render(component);
	if (anchor) {
		logDbg('Inserting new element after anchor. Anchor: ', anchor);
		anchor.insertAdjacentElement("afterend", container);
	} else {
		logDbg('Appending new element to parent. Parent: ', parent);
		parent.appendChild(container);
	}
}

function render(window: Window, appDetails: AppDetails)
{
	let PlayBar = playSectionClasses;
	const className = PlayBar.GameStatsSection;
	let t = (
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
								const newVal = e.currentTarget.value;
								if(newVal === undefined || newVal === null) {
									logDbg('New value is undefined or null. Skipping. New value: ', newVal);
									return;
								}
								logDbg('Setting new launch options. AppID: ', appDetails.unAppID, ' New value: ', newVal);
								globalThis.window.SteamClient.Apps.SetAppLaunchOptions(appDetails.unAppID, newVal);
							}}
							spellCheck="false" 
							style={{
								width: "200px",
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
	if(!window || !window.document)
	{
		logDbg('Window or document not available.');
		return;
	}

	const adoPanel = window.document.querySelector('div[class*="AppDetailsOverviewPanel Panel"]');
	if (!adoPanel || adoPanel.querySelector("#launch-options-input")) {
		logDbg('adoPanel null or launch-options-input element FOUND. Skipping. adoPanel: ', adoPanel);
		return;
	}

	const parent = adoPanel.querySelector(`.${className}`);
	if (!parent) {
		logDbg('Parent element not found. Skipping.');
		return;
	}

	renderComponent(parent, t);
}

async function initializePlugin() {
	// from copilot:
	// Two caveats in your current code:
	// - patch(pw, appId) renders the input immediately before you register the callback, 
	// 		but React may not have committed it to the DOM yet. If the callback fires 
	// 		before the input exists, your query returns null and the update is skipped.
	// - This only changes the displayed value; it doesn’t fire onChange or onBlur. 
	// 		That’s usually desirable when loading app details, since you don’t want loading 
	// 		the value to save it back.

	// TODO: see if I can register for these events through the millenium sdk apis instead of steambrew/utils
	onPopupCreate((popup, type) => {
		const pw = popup.window;
		
		if (!pw)
		{
			logDbg("popup.window is not available. popup.window: '", popup.window, "'");
			return;
		}

		if (type !== PopupType.Desktop && type !== PopupType.Gamepad)
			// && type !== PopupType.Modal)
		{
			logDbg('Ignoring invalid popup type: ', type);
			return;
		}

		logDbg('onPopupCreate called. popup: ', popup, ' type: ', type);

		// ===== Monitor Main Window Location ===== //
		onLocationChange(
			() => {
				if (type === PopupType.Desktop) {
					return Steam.MainWindowBrowserManager?.m_lastLocation;
				}
				else { // if (type === PopupType.Gamepad) {
					return pw.opener?.location;
				}
			},
			async ({ pathname }) => {
				//logDbg('pathname: ', pathname);
				if (!pathname.startsWith("/library/app/")) {
					//logDbg('Ignoring non-library app path. pathname: ', pathname);
					return;
				} 

				const appId = Number(pathname.split("/")[3]);
				//logDbg('appId: ', appId);
				if (Number.isNaN(appId)) return;

				// // YEEEEEEESSSSSSSSSSSSSSSSS THIS IS IT. FINALLY
				// const details = window.appDetailsStore.GetAppDetails(appId);
				// logDbg('details.strLaunchOptions: ', details?.strLaunchOptions);

				await patch(pw, appId);
				window.SteamClient.Apps.RegisterForAppDetails(appId, (app) => {
					// AppDetailsOverviewPanel Panel
					const adoPanel = pw.document.querySelector('div[class*="AppDetailsOverviewPanel Panel"]');
					const launchOptionsInput = adoPanel?.querySelector("#launch-options-input");
					if (!launchOptionsInput) {
						logDbg('Launch options input not found in AppDetailsOverviewPanel.');
						return;
					}

					launchOptionsInput.value = app?.strLaunchOptions ?? "";

					//const launchOptionsInputs = pw.document.querySelectorAll("#launch-options-input");
					// for (const input of launchOptionsInputs) {
					// }
					//let input = pw.document.querySelector("#launch-options-input");
					// logDbg("{RegisterForAppDetails} app.strLaunchOptions: '", app?.strLaunchOptions ?? "null", "' | input.value: '", input?.value ?? "null", "'",);
					// if (input) input.value = app?.strLaunchOptions ?? "";
					// logDbg("{RegisterForAppDetails} (after update) input.value: '", input?.value ?? "null", "'",);
				});
			},
		);
  	});
	
	logDbg('Frontend initialized');
}

export default definePlugin(() => {
	initializePlugin();
	
	return {
		title: 'My Plugin',
		icon: <Icon />,
		content: <SettingsContent />,
	};
});
