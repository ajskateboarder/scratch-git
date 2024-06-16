export default {
  menu: {
    push: "Recuperar cambios",
    pull: "Incorporar cambios",
    commit: "Commit",
    "setup-repo": "Configurar repositorio",
    "view-commits": "Ver commits",
    "repo-needed": "Please set up a repository to use this!",
  },
  diff: {
    "use-highlights": "Usar resaltados",
    "plain-text": "Texto plano",
    script: "Script {{number}}",
  },
  commit: {
    "search-commits": "Buscar commits",
    commits: "Commits",
    newer: "< Más nuevos",
    older: "Más antiguos >",
    "committed-when": "commit realizado {{time}}",
  },
  welcome: {
    "project-opened": "Proyecto abierto",
    "open-project": "Abrir proyecto",
    welcome: "Bienvenid@ a scratch.git",
    "get-started":
      "Por favor carga un proyecto para el desarrollo Git para comenzar",
    "select-project-loc": "Configurar la ubicación del proyecto",
    "select-location":
      "Por favor selecciona la ubicación de tu archivo de proyecto. Esto es para que scratch.git pueda encontrar tu proyecto localmente para usar con tu repositorio.",
    "set-info": "Enter a username and email",
    "set-git-username":
      "Please pick a username and email to use when making commits. Remember to keep this info appropriate if you want to share your repository on Scratch. Your email is only used for Git and doesn't have to be a real email.",
    next: "Siguiente",
    back: "Atrás",
  },
  repoconfig: {
    "repo-url-placeholder": "Introduce un enlace a la URL del repositorio",
    name: "Nombre",
    "repo-url": "URL del repositorio (opcional)",
    email: "Correo electrónico",
    repoconfig: "Configura tu [[repositorio]]",
    "no-empty-fields": "¡No dejes campos con asterisco en blanco!",
    "repo-tip":
      "Un repositorio (repo) es un lugar para almacenar tu proyecto en línea",
  },
  alerts: {
    "unrelated-changes":
      "No se pudieron obtener los nuevos cambios ya que no están relacionados con tus cambios.",
    "pull-success":
      "Nuevos cambios obtenidos exitosamente. Recarga para verlos.",
    "no-changes": "No hay nuevos cambios para obtener.",
    "inconsistent-work":
      "El repositorio en línea contiene trabajo que tú no tienes. Intenta obtener los cambios en línea primero.",
    "up-to-date":
      "Todo está actualizado. No hay nuevos commits para recuperar.",
    "push-success": "Cambios incorporados exitosamente a {{url}}",
    "gh-device-code-needed": {
      start: "Authentication needed for GitHub. Please go to",
      end: "and enter the code: {{code}}",
    },
  },
  close: "Cerrar",
  okay: "Aceptar",
};
