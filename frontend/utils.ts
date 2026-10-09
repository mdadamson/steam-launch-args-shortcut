import { ReactNode } from 'react';
import { createRoot } from "react-dom/client";

export function renderComponent(parent: Element, component: ReactNode, anchor?: Element) {
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

export function log(...args: any[]) {
  	window.console.log('[Launch-Ops-Shortcut]', ...args);
}

export function waitForElement(
    root: Element,
    selector: string,
    timeoutMs = 5000
): Promise<Element | null> {
    const existing = root.querySelector(selector);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            const element = root.querySelector(selector);
            if (element) finish(element);
        });

        const timeoutId = window.setTimeout(() => finish(null), timeoutMs);

        function finish(element: Element | null) {
            observer.disconnect();
            window.clearTimeout(timeoutId);
            resolve(element);
        }

        observer.observe(root, { childList: true, subtree: true });
    });
}