use std::{env, path::PathBuf};

/// Find the first available TurboWarp Desktop config directory
pub fn turbowarp_path() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        use std::{fs::DirEntry, io::Result};

        if let Some(appdata) = env::var_os("APPDATA") {
            let mut pth = PathBuf::from(appdata);
            pth.push("turbowarp-desktop");
            if pth.is_dir() {
                return Some(pth);
            };
        }
        let localappdata = PathBuf::new(env::var_os("LOCALAPPDATA")?);
        {
            let pth = localappdata.join("turbowarp-desktop");
            if pth.is_dir() {
                return Some(pth);
            };
        }
        let packages = localappdata.join("Packages");
        let store_folders = packages.read_dir()?.into_iter().filter_map(|f| {
            let file_name = f.ok()?.file_name();
            file_name
                .to_string_lossy()
                .contains("TurboWarpDesktop")
                .then(file_name)
        });
        for store_folder in store_folders {
            let local_cache_path = packages.join(store_folder);
            let Ok(local_cache) = local_cache_path.read_dir() else {
                continue;
            };
            if local_cache.into_iter().any(|f| {
                let file_name = f.ok()?.file_name();
                file_name.to_string_lossy().contains("LocalCache")
            }) {
                return Some(local_cache_path.join("LocalCache/Roaming/turbowarp-desktop"));
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        let home = PathBuf::from(env::var_os("HOME")?);
        let pth = home.join("Library/Application Support/turbowarp-desktop");
        if pth.is_dir() {
            return Some(pth);
        };
        let pth = home.join("Library/Containers/org.turbowarp.desktop/Data/Library/Application Support/turbowarp-desktop");
        if pth.is_dir() {
            return Some(pth);
        };
    }
    #[cfg(unix)]
    {
        if let Some(config_home) = env::var_os("XDG_CONFIG_HOME") {
            let mut pth = PathBuf::from(config_home);
            pth.push("turbowarp-desktop");
            if pth.is_dir() {
                return Some(pth);
            };
        };
        let home = PathBuf::from(env::var_os("HOME")?);
        let pth = home.join(".config/turbowarp-desktop");
        if pth.is_dir() {
            return Some(pth);
        };
        let pth = home.join(".var/app/org.turbowarp.TurboWarp/config/turbowarp-desktop");
        if pth.is_dir() {
            return Some(pth);
        };
        let pth = home.join("snap/turbowarp-desktop/current/.config/turbowarp-desktop");
        if pth.is_dir() {
            return Some(pth);
        };
    }
    None
}

// for use as CLI
use std::process::ExitCode;
#[allow(dead_code)]
fn main() -> ExitCode {
    match turbowarp_path() {
        Some(p) => {
            println!("{}", p.to_string_lossy());
            ExitCode::SUCCESS
        }
        None => {
            eprintln!("not found");
            ExitCode::FAILURE
        }
    }
}
