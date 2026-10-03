import { 
	definePlugin, 
	Field,
	playSectionClasses, 
	findModuleDetailsByExport 
} from 'millennium';
import { Steam, NON_STEAM_APP_APPID_MASK } from "steambrew-utils";
import { onLocationChange, onPopupCreate, PopupType } from "steambrew-utils/watchers";
import { useEffect, useState } from 'react';
import { createRoot } from "react-dom/client";

const SettingsContent = () => {
	return <Field label="shuba" />;
};

const Tooltip = findModuleDetailsByExport(
  (m) =>
    m?.toString?.()?.includes(`divProps`) &&
    m?.toString?.()?.includes(`tooltipProps`) &&
    m?.toString?.()?.includes(`toolTipContent`) &&
    m?.toString?.()?.includes(`tool-tip-source`),
)?.[1];

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

function dbgLog(...args: any[]) {
  	window?.console.log('[DEBUG]', ...args);
}

async function patch(window: Window, appId: number) {
	dbgLog('Patching...');
	if (appId < NON_STEAM_APP_APPID_MASK) {
		await render(window, );
		return;
	}

	// TODO: Implement patching for non-library app paths if necessary.
}

async function render(window: Window, app?: any)
{
	dbgLog('Rendering...');
	let PlayBar = playSectionClasses;
	const className = PlayBar.GameStatsSection;
	let t = (
		<Tooltip >
			<div
				launch-args
				className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}
				style={{ cursor: "pointer" }}
			>
				<div className={PlayBar.GameStatRight}>
					<div className={PlayBar.PlayBarLabel}>SHUBA</div>
				</div>
			</div>
		</Tooltip>
	);
	dbgLog('still rendering...');
	if(!window || !window.document)
	{
		dbgLog('Window or document not available. Window: ', window, ' | Document: ', window?.document);
		return;
	}
	const parents = window.document.querySelectorAll(`.${className}`); // querySelectorAll(window.document, `.${className}`);
	//let parents: string[] = [];
	dbgLog('Found parents: ', parents);
	for (const parent of parents) {

		if (parent.querySelector("[launch-args]")) continue;
		const container = window.document.createElement('div');
		createRoot(container).render(t);
		parent.appendChild(container);
	}
}

async function initializePlugin() {
	onPopupCreate((popup, type) => {
		if (type !== PopupType.Desktop && type !== PopupType.Gamepad)
			{
				dbgLog('{onPopupCreate} Ignoring non-desktop and non-gamepad popup. Type: ', type);
				return;
			}

		if(popup.m_strTitle !== "Steam")
		{
			dbgLog('{onPopupCreate} Wrong popup detected: ', popup);
			return;
		}

		const pw = popup.window;
		if (!pw)
		{
			dbgLog("{onPopupCreate} popup.window is not available. popup.window: '", popup.window, "'");
			return;
		}

		// ===== Monitor Main Window Location ===== //
		onLocationChange(
			() => {
				if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
				if (type === PopupType.Gamepad) return pw.opener?.location;
			},
			async ({ pathname }) => {
				dbgLog('{onPopupCreate} pathname: ', pathname);
				if (!pathname.startsWith("/library/app/"))
					{
						dbgLog('{onPopupCreate} Ignoring non-library app path. pathname: ', pathname);
						return;
					} 

				const appId = Number(pathname.split("/")[3]);
				dbgLog('{onPopupCreate} appId: ', appId);
				if (Number.isNaN(appId)) return;
				
				await patch(pw, appId); 
			},
		);
  	});
	
	dbgLog('Frontend initialized');
}

export default definePlugin(() => {
	initializePlugin();
	
	return {
		title: 'My Plugin',
		icon: <Icon />,
		content: <SettingsContent />,
	};
});
