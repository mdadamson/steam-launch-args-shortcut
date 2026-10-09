import { definePlugin, playSectionClasses, appDetailsClasses } from 'millennium';
import { log, renderComponent, waitForElement } from './utils';
import { onPopupCreate, onLocationChange, PopupType } from 'steambrew-utils/watchers';

const adoPanelSelector = `.${appDetailsClasses.AppDetailsOverviewPanel}.AppDetailsOverviewPanel.Panel`;

async function patch(window: Window, appId: number) {
	const details = globalThis.window.appDetailsStore.GetAppDetails(appId);
	if(!details) {
		log(`App details not found for appId: ${appId}. Skipping rendering.`);
		return;
	}
	await renderLaunchOptionsShortcut(window, appId);
}

async function renderLaunchOptionsShortcut(window: Window, appId: number) {
	const appDetails = globalThis.window.appDetailsStore.GetAppDetails(appId);
	let strOptions = appDetails ? appDetails.strLaunchOptions : "";
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
						id={`launch-options-input-${appId}`}
						onChange={(e) => { 
							globalThis.window.SteamClient.Apps.SetAppLaunchOptions(appId, e.currentTarget.value);
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
						defaultValue={strOptions}
					/>
				</div>
			</div>
		</div>
	);

	const adoPanel = await waitForElement(window.document.documentElement, adoPanelSelector);
	if (!adoPanel) {
		log('The AppDetailsOverviewPanel was not found within the timeout. Skipping rendering.');
		return;
	}

	const parent = adoPanel.querySelector(`.${PlayBar.GameStatsSection}`);
	if (!parent) {
		log('Parent element not found. Skipping rendering.');
		return;
	}

	if (parent.querySelector(`#launch-options-input-${appId}`)) {
		log('Launch options input already exists. Skipping rendering.');
		return;
	}

	const anchor = adoPanel.querySelector(`.${PlayBar.GameStat}.GameStat.${PlayBar.Playtime}.Playtime`);
	if (anchor) {
		log('Anchor element found. Inserting component after anchor.');
		renderComponent(parent, shortcut, anchor);
	}
	else {
		log('Anchor element not found. Appending component to parent.');
		renderComponent(parent, shortcut);
	}
}

function initializePlugin(): () => void {
	let unregisterLocChange: (() => void) | undefined;
	const { Unregister: unregisterCreate } = onPopupCreate((popup, type) => {
		const pw = popup?.window ?? undefined;
		if (!pw)
		{
			log("popup.window is not available. popup.window: '", popup ? popup.window : undefined, "'");
			return;
		}

		if (type !== PopupType.Desktop && type !== PopupType.Gamepad)
		{
			log('Ignoring invalid popup type: ', type);
			return;
		}

		log('onPopupCreate called. popup: ', popup, ' type: ', type);

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
					const adoPanel = pw.document.querySelector(adoPanelSelector);
					const launchOptionsInput = adoPanel?.querySelector(`#launch-options-input-${app.unAppID}`);
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
