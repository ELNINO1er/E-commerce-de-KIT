/** Déploiement sur le domaine courant, à la racine ou dans un sous-dossier. */
export const environment = { production: true, apiUrl: new URL('../api', document.baseURI).href.replace(/\/$/, '') };
