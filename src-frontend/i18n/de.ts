export default {
  menu: {
    push: "Pushen",
    pull: "Pullen",
    commit: "Commiten",
    "setup-repo": "Repository konfigurieren",
    "view-commits": "Commits einsehen",
    "repo-needed": "Please set up a repository to use this!",
  },
  diff: {
    "use-highlights": "Farblich markieren",
    "plain-text": "Nur Text",
    script: "Skript {{number}}",
  },
  commit: {
    "search-commits": "Commits durchsuchen",
    commits: "Commits",
    "committed-when": "wurde von {{name}} {{time}} gecommitet",
  },
  welcome: {
    "project-opened": "Projekt geöffnet",
    "open-project": "Projekt öffnen",
    welcome: "Willkommen zu scratch.git",
    "get-started": "Lade bitte ein Projekt für Git-Entwicklung um zu starten",
    "select-project-loc": "Projektort einstellen",
    "select-location":
      "Wähle bitte den Ort deines Projektes, damit scratch.git dein Projekt für deine Repository kann.",
    "set-info": "Enter a username and email",
    "set-git-username":
      "Please pick a username and email to use when making commits. Remember to keep this info appropriate if you want to share your repository on Scratch. Your email is only used for Git and doesn't have to be a real email.",
    next: "Weiter",
    back: "Zurück",
  },
  repoconfig: {
    "repo-url-placeholder": "Gebe einen Link zu einer Repository ein",
    name: "Name",
    "repo-url": "Repository-Link (optional)",
    email: "Email",
    repoconfig: "Dein [[repository]] einstellen",
    "no-empty-fields": "Felder mit einem Sternchen müssen ausgefüllt werden!",
    "repo-tip":
      "Eine Repository (repo) ist ein Ort, dein Projekt online zu speichern",
  },
  alerts: {
    "unrelated-changes":
      "Die neuen Veränderungen konnten nicht gepullt werden, weil sie mit deinen Änderungen nichts zu tun haben.",
    "pull-success":
      "Die neuen Veränderungen wurden erfolgreich geupllt. Lade neu, um die Änderungen einzusehen.",
    "no-changes": "Es gibt keine neuen Veränderungen.",
    "inconsistent-work":
      "Die Repository hat Commits, die du nicht hast. Versuche, zuerst die Änderungen online zu pullen.",
    "up-to-date":
      "Alles ist auf dem neuesten Stand. Es gibt keine neuen Commits zu pushen.",
    "push-success": "Änderungen wurden erfolgreich zu {{url}} gepusht",
    "gh-device-code-needed": {
      start: "Authentifizierung für GitHub wird benötigt. Bitte gehe zu",
      end: "und gebe diesen Code ein: {{code}}",
    },
  },
  close: "Schließen",
  okay: "Okay",
};
