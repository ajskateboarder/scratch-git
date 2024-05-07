use std::{
    env,
    path::{Path, PathBuf},
};

/// Find the first available TurboWarp Desktop config directory
pub fn turbowarp_path() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        use std::{fs::DirEntry, io::Result};

        let pth = Path::new(&env::var("APPDATA").unwrap().to_string()).join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
        let file_name =
            |f: Result<DirEntry>| f.unwrap().file_name().to_os_string().into_string().unwrap();
        let pth = Path::new(&env::var("LOCALAPPDATA").unwrap().to_string()).join("Packages");
        if let Ok(__store_folder) = pth.read_dir() {
            let _store_folder = __store_folder
                .into_iter()
                .map(|f| file_name(f))
                .filter(|f| f.contains("TurboWarpDesktop"))
                .next();
            if let Some(store_folder) = _store_folder {
                if let Ok(local_cache) = pth.join(&store_folder).read_dir() {
                    if local_cache
                        .into_iter()
                        .map(|f| file_name(f))
                        .any(|f| f.contains("LocalCache"))
                    {
                        return Some(
                            pth.join(store_folder)
                                .join("LocalCache")
                                .join("Roaming")
                                .join("turbowarp-desktop"),
                        );
                    }
                }
            }
        };
    }
    #[cfg(target_os = "macos")]
    {
        let home = env::var("HOME").unwrap();
        let pth = Path::new(&home)
            .join("Library")
            .join("Application Support")
            .join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
        let pth = Path::new(&home)
            .join("Library")
            .join("Containers")
            .join("org.turbowarp.desktop")
            .join("Data")
            .join("Library")
            .join("Application Support")
            .join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
    }
    #[cfg(unix)]
    {
        let home = env::var("HOME").unwrap();
        let pth = Path::new(&home).join(".config").join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
        let pth = Path::new(&home)
            .join(".var")
            .join("app")
            .join("org.turbowarp.TurboWarp")
            .join("config")
            .join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
        let pth = Path::new(&home)
            .join("snap")
            .join("turbowarp-desktop")
            .join("current")
            .join(".config")
            .join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
    }
    None
}
