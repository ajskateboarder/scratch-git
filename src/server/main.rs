#[macro_use]
extern crate rocket;

pub mod application;
pub mod diff;
pub mod projects;

use application::create_app;
use rocket::{Build, Rocket};
use std::{
    env,
    fs::{self, DirEntry},
    io::{stdin, BufRead, Result},
    path::{Path, PathBuf},
};

fn turbowarp_path() -> Option<PathBuf> {
    if cfg!(windows) {
        dbg!(env::var("APPDATA").unwrap().to_string());
        let pth = Path::new(&env::var("APPDATA").unwrap().to_string()).join("turbowarp-desktop");
        if let Ok(mut dir) = pth.read_dir() {
            if !dir.next().is_none() {
                return Some(pth);
            }
        };
        let file_name =
            |f: Result<DirEntry>| f.unwrap().file_name().to_os_string().into_string().unwrap();
        let pth = Path::new(&env::var("LOCALAPPDATA").unwrap().to_string()).join("Packages");
        dbg!(&pth);
        if let Ok(__store_folder) = pth.read_dir() {
            dbg!(&__store_folder);
            let _store_folder = __store_folder
                .into_iter()
                .map(|f| file_name(f))
                .filter(|f| f.contains("TurboWarpDesktop"))
                .next();
            dbg!(&_store_folder);
            if let Some(store_folder) = _store_folder {
                dbg!(&store_folder);
                if let Ok(mut store_folder_exists) = pth.join(&store_folder).read_dir() {
                    dbg!(&store_folder_exists);
                    if let Some(local_cache) = store_folder_exists.next() {
                        dbg!(&local_cache);
                        if local_cache
                            .into_iter()
                            .map(|f| file_name(Ok(f)))
                            .any(|f| f.contains("LocalCache"))
                        {
                            dbg!("i am here");
                            return Some(
                                pth.join(store_folder)
                                    .join("LocalCache")
                                    .join("Roaming")
                                    .join("turbowarp-desktop"),
                            );
                        }
                    }
                }
            }
        };
    } else if cfg!(target_os = "macos") {
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
    } else if cfg!(unix) {
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

#[launch]
fn app() -> Rocket<Build> {
    let path = match turbowarp_path() {
        Some(path) => path,
        None => {
            println!("Failed to find TurboWarp path automatically. Please paste the correct path from the following: \n\thttps://github.com/TurboWarp/desktop#advanced-customizations");
            PathBuf::from(stdin().lock().lines().next().unwrap().unwrap())
        }
    };
    println!("Script copied to {}", path.to_str().unwrap());
    let _ = fs::copy("userscript.js", path.join("userscript.js"));
    let _ = fs::create_dir("projects");
    create_app()
}
